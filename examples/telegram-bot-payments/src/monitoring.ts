import { logger } from "./logger";

export type MonitoringEvent =
  | "payment.precheckout.ok"
  | "payment.precheckout.error"
  | "payment.success"
  | "telepaygate.webhook.ok"
  | "telepaygate.webhook.error"
  | "telepaygate.verify.ok"
  | "telepaygate.verify.error";

export async function notify(
  event: MonitoringEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const url = process.env.MONITORING_WEBHOOK_URL;
    if (!url) {
      logger.event(event, payload);
      return;
    }
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, payload, ts: new Date().toISOString() })
    });
    logger.event(event, payload);
  } catch (err) {
    logger.warn("Monitoring webhook failed", { event, err });
  }
}

