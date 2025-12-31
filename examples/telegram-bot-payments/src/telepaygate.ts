import { v5 as uuidv5 } from "uuid";
import { RateLimiter } from "./rateLimiter";
import { logger } from "./logger";

const USER_ID_NAMESPACE = "3b9d87a2-54d7-4878-9d87-351edcb2564b";

export type TelePayGateConfig = {
  apiBaseUrl: string;
};

export class TelePayGateClient {
  private readonly baseUrl: string;
  private readonly limiter: RateLimiter;

  constructor(config: TelePayGateConfig, limiter?: RateLimiter) {
    this.baseUrl = config.apiBaseUrl.replace(/\/+$/, "");
    this.limiter = limiter ?? new RateLimiter(10, 5);
  }

  /** Derive deterministic API credentials from Telegram user id */
  private deriveCredentials(userId: string): {
    apiKey: string;
    apiSecret: string;
    normalizedUserId: string;
  } {
    const normalized = uuidv5(userId, USER_ID_NAMESPACE);
    const suffix = normalized.replace(/-/g, "").slice(0, 16) || normalized;
    return {
      apiKey: `pk_${suffix}`,
      apiSecret: `sk_${suffix}`,
      normalizedUserId: normalized
    };
  }

  async postWebhookUpdate(
    userId: string,
    update: unknown
  ): Promise<{ paymentId?: string; status: number; body: any }> {
    const { normalizedUserId } = this.deriveCredentials(userId);
    return this.limiter.schedule(async () => {
      const res = await fetch(`${this.baseUrl}/api/v1/payments/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": normalizedUserId
        },
        body: JSON.stringify(update)
      });
      const body = await res.json().catch(() => ({}));
      const paymentId = body?.payment?.id;
      return { paymentId, status: res.status, body };
    });
  }

  async getPayment(userId: string, paymentId: string): Promise<any> {
    const { apiKey } = this.deriveCredentials(userId);
    return this.limiter.schedule(async () => {
      const res = await fetch(`${this.baseUrl}/api/v1/payments/${paymentId}`, {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey
        }
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || "Failed to fetch payment");
      }
      return body?.payment;
    });
  }

  async verifySettlement(
    userId: string,
    paymentId: string,
    opts: { retry?: number; backoffMs?: number } = {}
  ): Promise<boolean> {
    const retries = opts.retry ?? 3;
    const backoffMs = opts.backoffMs ?? 500;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const payment = await this.getPayment(userId, paymentId);
        const status = payment?.status;
        logger.info("Settlement check", { paymentId, status, attempt });
        if (status && status !== "received") {
          return true;
        }
      } catch (err) {
        logger.warn("Verify settlement error", { paymentId, err, attempt });
      }
      await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
    }
    return false;
  }
}

