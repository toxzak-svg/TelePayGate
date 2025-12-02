import { Database } from "../db/connection";
import {
  SettlementModel,
  SettlementStatus,
  FiatCurrency,
} from "../models/settlement.model";
import { WebhookService } from "./webhook.service";

export interface SettlementServiceConfig {
  batchSize?: number;
  processingIntervalMs?: number;
  tonUsdRate?: number;
  fiatGateway?: FiatGatewayProvider;
}

/**
 * Fiat Gateway Provider Interface
 * Implement this interface to integrate with payment processors like Stripe, Wise, etc.
 */
export interface FiatGatewayProvider {
  name: string;
  
  /**
   * Execute a payout to the user's linked account
   */
  executePayout(params: {
    userId: string;
    amount: number;
    currency: string;
    reference: string;
    metadata?: Record<string, string>;
  }): Promise<FiatPayoutResult>;
  
  /**
   * Check the status of a payout
   */
  getPayoutStatus(payoutId: string): Promise<FiatPayoutStatus>;
  
  /**
   * Verify the gateway is properly configured
   */
  healthCheck(): Promise<boolean>;
}

export interface FiatPayoutResult {
  success: boolean;
  payoutId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  estimatedArrival?: Date;
}

export interface FiatPayoutStatus {
  payoutId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  completedAt?: Date;
  error?: string;
}

/**
 * Stub Fiat Gateway for development/testing
 * Replace with real implementation (Stripe, Wise, etc.) in production
 */
export class StubFiatGateway implements FiatGatewayProvider {
  name = 'stub';

  async executePayout(params: {
    userId: string;
    amount: number;
    currency: string;
    reference: string;
  }): Promise<FiatPayoutResult> {
    console.log(`💸 [STUB] Fiat payout: ${params.amount} ${params.currency} to user ${params.userId}`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      payoutId: `stub-${params.reference}-${Date.now()}`,
      status: 'completed',
      estimatedArrival: new Date(),
    };
  }

  async getPayoutStatus(payoutId: string): Promise<FiatPayoutStatus> {
    return {
      payoutId,
      status: 'completed',
      completedAt: new Date(),
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

/**
 * Stripe Fiat Gateway (placeholder - implement with real Stripe SDK)
 */
export class StripeFiatGateway implements FiatGatewayProvider {
  name = 'stripe';
  
  constructor(private apiKey?: string) {
    this.apiKey = apiKey || process.env.STRIPE_SECRET_KEY;
  }

  async executePayout(params: {
    userId: string;
    amount: number;
    currency: string;
    reference: string;
    metadata?: Record<string, string>;
  }): Promise<FiatPayoutResult> {
    if (!this.apiKey) {
      return {
        success: false,
        payoutId: '',
        status: 'failed',
        error: 'Stripe API key not configured',
      };
    }

    // TODO: Implement actual Stripe Payouts API integration
    // const stripe = new Stripe(this.apiKey);
    // const payout = await stripe.payouts.create({
    //   amount: Math.round(params.amount * 100), // Stripe uses cents
    //   currency: params.currency.toLowerCase(),
    //   metadata: { reference: params.reference, userId: params.userId, ...params.metadata },
    // });

    console.log(`💸 [STRIPE] Would execute payout: ${params.amount} ${params.currency}`);
    
    return {
      success: true,
      payoutId: `stripe-${params.reference}-${Date.now()}`,
      status: 'pending',
      estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
    };
  }

  async getPayoutStatus(payoutId: string): Promise<FiatPayoutStatus> {
    // TODO: Implement stripe.payouts.retrieve(payoutId)
    return {
      payoutId,
      status: 'pending',
    };
  }

  async healthCheck(): Promise<boolean> {
    return !!this.apiKey;
  }
}

/**
 * Wise (TransferWise) Fiat Gateway (placeholder - implement with real API)
 */
export class WiseFiatGateway implements FiatGatewayProvider {
  name = 'wise';
  
  constructor(private apiKey?: string) {
    this.apiKey = apiKey || process.env.WISE_API_KEY;
  }

  async executePayout(params: {
    userId: string;
    amount: number;
    currency: string;
    reference: string;
  }): Promise<FiatPayoutResult> {
    if (!this.apiKey) {
      return {
        success: false,
        payoutId: '',
        status: 'failed',
        error: 'Wise API key not configured',
      };
    }

    // TODO: Implement actual Wise API integration
    // 1. Create quote
    // 2. Create recipient
    // 3. Create transfer
    // 4. Fund transfer

    console.log(`💸 [WISE] Would execute payout: ${params.amount} ${params.currency}`);
    
    return {
      success: true,
      payoutId: `wise-${params.reference}-${Date.now()}`,
      status: 'pending',
      estimatedArrival: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
    };
  }

  async getPayoutStatus(payoutId: string): Promise<FiatPayoutStatus> {
    return {
      payoutId,
      status: 'pending',
    };
  }

  async healthCheck(): Promise<boolean> {
    return !!this.apiKey;
  }
}

/**
 * Factory function to create the appropriate fiat gateway
 */
export function createFiatGateway(provider?: string): FiatGatewayProvider {
  const gatewayProvider = provider || process.env.FIAT_GATEWAY_PROVIDER || 'stub';
  
  switch (gatewayProvider.toLowerCase()) {
    case 'stripe':
      return new StripeFiatGateway();
    case 'wise':
      return new WiseFiatGateway();
    case 'stub':
    default:
      return new StubFiatGateway();
  }
}

interface ConversionRecord {
  id: string;
  user_id: string;
  target_amount: number;
  target_currency: string;
  payment_ids: string[] | null;
  settlement_id?: string | null;
  webhook_url?: string | null;
}

interface PendingSettlementRow {
  settlement_id: string;
  user_id: string;
  conversion_id: string;
  fiat_amount: number | string;
  payment_ids: string[] | null;
  webhook_url?: string | null;
}

export class SettlementService {
  private readonly settlementModel: SettlementModel;
  private readonly batchSize: number;
  private readonly tonUsdRate: number;
  private readonly processingIntervalMs: number;
  private readonly fiatGateway: FiatGatewayProvider;
  private timer?: NodeJS.Timeout;

  constructor(
    private db: Database,
    private webhookService?: WebhookService,
    config: SettlementServiceConfig = {},
  ) {
    this.settlementModel = new SettlementModel(db);
    this.batchSize =
      config.batchSize ?? Number(process.env.SETTLEMENT_BATCH_SIZE || 25);
    this.processingIntervalMs =
      config.processingIntervalMs ??
      Number(process.env.SETTLEMENT_INTERVAL_MS || 60000);
    this.tonUsdRate =
      config.tonUsdRate ?? Number(process.env.SETTLEMENT_TON_USD_RATE || 5.5);
    this.fiatGateway = config.fiatGateway ?? createFiatGateway();
  }

  async start(): Promise<void> {
    if (this.timer) {
      return;
    }

    await this.processCycle();
    this.timer = setInterval(() => {
      this.processCycle().catch((err) =>
        console.error("Settlement cycle failed:", err),
      );
    }, this.processingIntervalMs);

    console.log(
      `🏦 Settlement processor running (interval=${this.processingIntervalMs}ms, batch=${this.batchSize})`,
    );
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async processCycle(): Promise<void> {
    await this.prepareReadySettlements();
    await this.completePendingSettlements();
  }

  private async prepareReadySettlements(): Promise<void> {
    const conversions = await this.db.any<ConversionRecord>(
      `SELECT c.id, c.user_id, c.target_amount, c.target_currency, c.payment_ids, c.settlement_id, u.webhook_url
         FROM conversions c
         JOIN users u ON u.id = c.user_id
        WHERE c.status = 'completed'
          AND (c.settlement_status IS NULL OR c.settlement_status IN ('pending','ready'))
        ORDER BY c.completed_at NULLS LAST
        LIMIT $1`,
      [this.batchSize],
    );

    for (const conversion of conversions) {
      const fiatAmount = this.calculateFiatAmount(
        conversion.target_amount,
        conversion.target_currency,
      );
      let settlementId = conversion.settlement_id;

      if (!settlementId) {
        const settlement = await this.settlementModel.create({
          userId: conversion.user_id,
          conversionId: conversion.id,
          fiatAmount,
          fiatCurrency: FiatCurrency.USD,
          exchangePlatform: "p2p-liquidity",
          status: SettlementStatus.PENDING,
        });
        settlementId = settlement.id;
      }

      await this.db.none(
        `UPDATE conversions
            SET settlement_status = 'processing',
                settlement_id = $2,
                updated_at = NOW()
          WHERE id = $1`,
        [conversion.id, settlementId],
      );
    }
  }

  private async completePendingSettlements(): Promise<void> {
    const settlements = await this.db.any<PendingSettlementRow>(
      `SELECT s.id as settlement_id, s.user_id, s.conversion_id, s.fiat_amount, c.payment_ids, u.webhook_url
         FROM settlements s
         JOIN conversions c ON c.id = s.conversion_id
         JOIN users u ON u.id = s.user_id
        WHERE s.status IN ('pending','processing')
        ORDER BY s.created_at ASC
        LIMIT $1`,
      [this.batchSize],
    );

    for (const settlement of settlements) {
      const paymentIds = Array.isArray(settlement.payment_ids)
        ? settlement.payment_ids
        : [];
      const webhookUrl = settlement.webhook_url || undefined;
      const fiatAmount =
        typeof settlement.fiat_amount === "number"
          ? settlement.fiat_amount
          : parseFloat(settlement.fiat_amount as unknown as string);

      const transactionId = await this.executeFiatPayout(
        settlement.settlement_id,
        fiatAmount,
        "USD",
        settlement.user_id,
      );

      await this.db.none(
        `UPDATE settlements
            SET status = 'completed',
                completed_at = NOW(),
                transaction_id = $2
          WHERE id = $1`,
        [settlement.settlement_id, transactionId],
      );

      await this.db.none(
        `UPDATE conversions
            SET settlement_status = 'settled',
                updated_at = NOW()
          WHERE id = $1`,
        [settlement.conversion_id],
      );

      if (paymentIds.length > 0) {
        await this.db.none(
          `UPDATE payments
              SET status = 'settled',
                  updated_at = NOW()
            WHERE id = ANY($1::uuid[])`,
          [paymentIds],
        );
      }

      if (webhookUrl) {
        await this.webhookService?.queueEvent(
          settlement.user_id,
          webhookUrl,
          "settlement.completed",
          {
            settlementId: settlement.settlement_id,
            conversionId: settlement.conversion_id,
            fiatAmount,
            currency: "USD",
          },
        );
      }

      console.log("✅ Settlement completed", {
        settlementId: settlement.settlement_id,
        conversionId: settlement.conversion_id,
      });
    }
  }

  /**
   * Execute fiat payout via configured gateway
   */
  private async executeFiatPayout(
    settlementId: string,
    amount: number,
    currency: string,
    userId: string,
  ): Promise<string> {
    console.log(
      `💸 Executing fiat payout via ${this.fiatGateway.name}: ${amount} ${currency} to user ${userId}`,
    );

    const result = await this.fiatGateway.executePayout({
      userId,
      amount,
      currency,
      reference: settlementId,
      metadata: {
        source: 'telepaygate',
        settlementId,
      },
    });

    if (!result.success) {
      throw new Error(`Fiat payout failed: ${result.error}`);
    }

    return result.payoutId;
  }

  /**
   * Get the current fiat gateway provider name
   */
  getFiatGatewayName(): string {
    return this.fiatGateway.name;
  }

  /**
   * Check fiat gateway health
   */
  async checkFiatGatewayHealth(): Promise<boolean> {
    return this.fiatGateway.healthCheck();
  }

  private calculateFiatAmount(
    targetAmount: number,
    targetCurrency: string,
  ): number {
    if (targetCurrency === "TON" || targetCurrency === "USDT") {
      return parseFloat((targetAmount * this.tonUsdRate).toFixed(2));
    }
    return parseFloat(targetAmount.toFixed(2));
  }
}

export default SettlementService;
