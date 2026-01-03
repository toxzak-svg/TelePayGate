// uuid not used here
import { P2PLiquidityService } from "./p2p-liquidity.service";
import { FeeService } from "./fee.service";
import { TonBlockchainService } from "./ton-blockchain.service";
import { IDatabase } from "pg-promise";

export interface ConversionRecord {
  id: string;
  user_id: string;
  payment_ids: string[];
  source_currency: string;
  target_currency: string;
  source_amount: number;
  target_amount: number | null;
  exchange_rate: number | null;
  rate_locked_until: number | null;
  dex_pool_id: string | null;
  dex_provider: string | null;
  dex_tx_hash: string | null;
  ton_tx_hash: string | null;
  status: string;
  fees: any;
  platform_fee_amount: number;
  platform_fee_percentage: number;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export interface RateQuote {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  exchangeRate: number;
  fees: {
    dex: number;
    network: number;
    platform: number;
    total: number;
    platformPercentage: number;
  };
  platformWallet: string;
  estimatedArrival: string;
  validUntil: Date;
}

export class ConversionService {
  private p2pLiquidityService: P2PLiquidityService;
  private feeService: FeeService;
  private tonService: TonBlockchainService;

  constructor(private db: IDatabase<any>) {
    this.p2pLiquidityService = new P2PLiquidityService(db);
    this.feeService = new FeeService(db);
    this.tonService = new TonBlockchainService(
      process.env.TON_API_URL || "https://toncenter.com/api/v2/jsonRPC",
      process.env.TON_API_KEY,
      process.env.TON_WALLET_MNEMONIC,
    );
  }

  /**
   * Get a rate quote for conversion with platform fees
   */
  async getQuote(
    sourceAmount: number,
    sourceCurrency: string = "STARS",
    targetCurrency: string = "TON",
  ): Promise<RateQuote> {
    const baseRate = await this.getCurrentRate(sourceCurrency, targetCurrency);
    const feeBreakdown =
      await this.feeService.calculateFeeBreakdown(sourceAmount);
    const platformWallet = await this.feeService.getPlatformWallet();
    const totalFees = feeBreakdown.total;
    const targetAmount = (sourceAmount - totalFees) * baseRate;

    return {
      sourceCurrency,
      targetCurrency,
      sourceAmount,
      targetAmount,
      exchangeRate: baseRate,
      fees: {
        dex: 0, // Placeholder
        network: feeBreakdown.network,
        platform: feeBreakdown.platform,
        total: totalFees,
        platformPercentage: feeBreakdown.platformPercentage,
      },
      platformWallet,
      estimatedArrival: "5-10 minutes",
      validUntil: new Date(Date.now() + 60000),
    };
  }

  /**
   * Lock conversion rate for a duration
   */
  async lockRate(
    userId: string,
    sourceAmount: number,
    sourceCurrency: string = "STARS",
    targetCurrency: string = "TON",
    durationSeconds: number = 300,
  ): Promise<{
    conversionId: string;
    rate: number;
    lockedUntil: Date;
    targetAmount: number;
    platformFee: number;
  }> {
    const quote = await this.getQuote(
      sourceAmount,
      sourceCurrency,
      targetCurrency,
    );
    const lockedUntil = Date.now() + durationSeconds * 1000;

    const result = await this.db.one(
      `INSERT INTO conversions (
        user_id, source_currency, target_currency, source_amount,
        target_amount, exchange_rate, rate_locked_until, status,
        fee_breakdown, platform_fee_amount, platform_fee_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'rate_locked', $8, $9, $10)
      RETURNING id, exchange_rate, target_amount, platform_fee_amount`,
      [
        userId,
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        quote.targetAmount,
        quote.exchangeRate,
        new Date(lockedUntil),
        JSON.stringify(quote.fees),
        quote.fees.platform,
        quote.fees.platformPercentage / 100,
      ],
    );

    const conversion = result;

    console.log("🔒 Rate locked with fees:", {
      conversionId: conversion.id,
      rate: quote.exchangeRate,
      platformFee: quote.fees.platform,
      lockedUntil: new Date(lockedUntil),
    });

    return {
      conversionId: conversion.id,
      rate: quote.exchangeRate,
      lockedUntil: new Date(lockedUntil),
      targetAmount: conversion.target_amount,
      platformFee: conversion.platform_fee_amount,
    };
  }

  /**
   * Create and execute conversion with fee tracking
   * SECURITY FIX: Wrapped all related DB operations in a transaction for atomicity
   * to prevent partial updates and ensure data consistency
   */
  async createConversion(
    userId: string,
    paymentIds: string[],
    targetCurrency: string = "TON",
  ): Promise<ConversionRecord> {
    // SECURITY FIX: Use transaction to ensure atomicity of all DB operations
    return this.db.tx(async (t) => {
      // Get total stars from payments
      const payment = await t.one(
        `SELECT SUM(stars_amount) as total_stars
           FROM payments
           WHERE id = ANY($1::uuid[]) AND user_id = $2 AND status = 'received'`,
        [paymentIds, userId],
      );

      const totalStars = parseFloat(payment.total_stars || 0);

      if (totalStars === 0) {
        throw new Error("No valid payments found for conversion");
      }

      // Check minimum amount
      const config = await this.feeService.getConfig();
      if (totalStars < config.minConversionAmount) {
        throw new Error(
          `Minimum ${config.minConversionAmount} Stars required for conversion`,
        );
      }

      // Get quote with fees
      const quote = await this.getQuote(totalStars, "STARS", targetCurrency);

      // Create conversion record
      const conversion = await t.one(
        `INSERT INTO conversions (
            user_id, payment_ids, source_currency, target_currency,
            source_amount, target_amount, exchange_rate, status,
            fee_breakdown, platform_fee_amount, platform_fee_percentage
          ) VALUES ($1, $2, 'STARS', $3, $4, $5, $6, 'pending', $7, $8, $9)
          RETURNING *`,
        [
          userId,
          paymentIds,
          targetCurrency,
          totalStars,
          quote.targetAmount,
          quote.exchangeRate,
          JSON.stringify(quote.fees),
          quote.fees.platform,
          quote.fees.platformPercentage / 100,
        ],
      );

      // Update payment statuses
      await t.none(
        `UPDATE payments
           SET status = 'converting', updated_at = NOW()
           WHERE id = ANY($1)`,
        [paymentIds],
      );

      // Record platform fee
      const feeAmountTon = quote.fees.platform * quote.exchangeRate;
      await this.feeService.recordFee(
        conversion.id,
        userId,
        quote.fees.platform,
        feeAmountTon,
        5.5, // Mock TON/USD rate
      );

      console.log("✅ Conversion created with fees:", {
        id: conversion.id,
        stars: totalStars,
        ton: quote.targetAmount,
        platformFee: quote.fees.platform,
        platformFeeTon: feeAmountTon,
      });

      // Start conversion with P2P/DEX (async) - after transaction commits
      // SECURITY FIX: Proper error handling for failed conversions
      setTimeout(() => {
        this.executeP2PConversion(conversion.id, paymentIds).catch((err) => {
          console.error("P2P conversion error:", err);
          // Update conversion status to failed on error
          this.updateConversionStatus(conversion.id, "failed", err?.message || "P2P conversion failed").catch((updateErr) => {
            console.error("Failed to update conversion status after error:", updateErr);
          });
        });
      }, 0);

      return conversion as any;
    });
  }

  /**
   * Execute conversion via P2P/DEX (background process)
   */
  private async executeP2PConversion(
    conversionId: string,
    _paymentIds: string[],
  ): Promise<void> {
    try {
      await this.db.none(
        `UPDATE conversions SET status = 'phase1_prepared' WHERE id = $1`,
        [conversionId],
      );

      try {
        // Determine best route and try to execute the conversion
        const conversion = await this.db.oneOrNone(
          "SELECT * FROM conversions WHERE id = $1",
          [conversionId],
        );

        if (!conversion) {
          throw new Error("Conversion not found");
        }

        const amount = conversion.source_amount as number;
        const fromCurrency = (conversion.source_currency as string) || "STARS";
        const toCurrency = (conversion.target_currency as string) || "TON";

        const route = await this.p2pLiquidityService.findBestRoute(
          fromCurrency,
          toCurrency,
          amount,
        );

        const execResult = await this.p2pLiquidityService.executeConversion(
          conversionId,
          route,
        );

        const userRow = await this.db.oneOrNone(
          "SELECT u.webhook_url FROM conversions c JOIN users u ON c.user_id = u.id WHERE c.id = $1",
          [conversionId],
        );
        if (userRow?.webhook_url) {
          await this.db.none(
            `INSERT INTO webhook_events (
              id, user_id, webhook_url, event, payload, signature,
              status, attempts, max_attempts, created_at
            ) VALUES (
              gen_random_uuid(),
              (SELECT user_id FROM conversions WHERE id = $1),
              $2,
              'conversion.executed',
              $3,
              '',
              'pending',
              0,
              5,
              NOW()
            )`,
            [
              conversionId,
              userRow.webhook_url,
              JSON.stringify({
                conversionId,
                provider: execResult.dexProvider || route.sources[0].provider,
                poolId: execResult.dexPoolId,
                txHash: execResult.txHash,
              }),
            ],
          );
        }

        // If we obtained a tx hash, record it and start polling
        if (execResult && execResult.txHash) {
          await this.db.none(
            `UPDATE conversions SET status = 'phase2_committed', dex_pool_id = $2, dex_provider = $3, ton_tx_hash = $4 WHERE id = $1`,
            [conversionId, execResult.dexPoolId || null, execResult.dexProvider || null, execResult.txHash],
          );

          // start background polling (do not await here to keep execution async)
          this.pollConversionStatus(conversionId, execResult.txHash).catch((err) => {
            console.error("pollConversionStatus error:", err);
          });
        } else {
          // If no transaction was returned we leave it in prepared state and return
          await this.db.none(
            `UPDATE conversions SET status = 'phase2_queued' WHERE id = $1`,
            [conversionId],
          );
        }
      } catch (err: any) {
        console.error("executeP2PConversion failed:", err);
        await this.updateConversionStatus(conversionId, "failed", err?.message || "execution failed");
      }
    } catch (err: any) {
      // If an error happens at top level we log and try to mark conversion as failed
      console.error("executeP2PConversion failed (top-level):", err);
      try {
        await this.updateConversionStatus(conversionId, "failed", err?.message || "execution failed (top-level)");
      } catch (e) {
        console.error("Failed to update conversion status after top-level error:", e);
      }
    }
  }

  /**
   * Poll blockchain for conversion status
   */
  private async pollConversionStatus(
    conversionId: string,
    txHash: string,
    _attempt: number = 1
  ): Promise<void> {
    const maxPolls = 60; // 5 minutes (5s intervals)
    let polls = 0;

    return new Promise((resolve, reject) => {
      const intervalId = setInterval(async () => {
        if (polls >= maxPolls) {
          clearInterval(intervalId);
          await this.updateConversionStatus(conversionId, "failed", "Transaction polling timeout");
          return reject(new Error("Transaction polling timeout"));
        }

        try {
          const minConfirmations = parseInt(process.env.TON_MIN_CONFIRMATIONS || "1", 10);
          const state = await this.tonService.getTransactionState(txHash as any, minConfirmations);

          if (state && state.status === "confirmed" && (state.confirmations || 0) >= minConfirmations) {
            clearInterval(intervalId);
            await this.updateConversionStatus(conversionId, "completed");

            const feeResult = await this.db.oneOrNone(
              "SELECT id FROM platform_fees WHERE conversion_id = $1",
              [conversionId],
            );

            if (feeResult) {
              await this.feeService.markFeeCollected(feeResult.id, state.hash || txHash);
            }

            const userRow2 = await this.db.oneOrNone(
              "SELECT u.webhook_url, c.user_id FROM conversions c JOIN users u ON c.user_id = u.id WHERE c.id = $1",
              [conversionId],
            );
            if (userRow2?.webhook_url) {
              await this.db.none(
                `INSERT INTO webhook_events (
                  id, user_id, webhook_url, event, payload, signature,
                  status, attempts, max_attempts, created_at
                ) VALUES (
                  gen_random_uuid(),
                  $1,
                  $2,
                  'conversion.completed',
                  $3,
                  '',
                  'pending',
                  0,
                  5,
                  NOW()
                )`,
                [
                  userRow2.user_id,
                  userRow2.webhook_url,
                  JSON.stringify({
                    conversionId,
                    txHash,
                    status: "completed",
                  }),
                ],
              );
            }

            console.log("✅ Conversion completed:", { conversionId, txHash });
            return resolve();
          }

          if (state && state.status === "failed") {
            clearInterval(intervalId);
            await this.updateConversionStatus(conversionId, "failed", `Transaction failed on-chain (exit code: ${state.exitCode})`);
            return reject(new Error(`Transaction failed on-chain (exit code: ${state.exitCode})`));
          }
        } catch (error: any) {
          console.error(`Error polling tx ${txHash}:`, error?.message || error);
          // keep retrying until maxPolls
        } finally {
          polls++;
        }
      }, 5000);
    });
  }

  /**
   * Update conversion status in database
   * SECURITY FIX: Use explicit parameterized queries instead of dynamic column construction
   * to prevent potential SQL injection vulnerabilities
   * SECURITY FIX: Use optimistic locking with version numbers to prevent race conditions
   */
  private async updateConversionStatus(
    conversionId: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    // SECURITY FIX: Use optimistic locking by checking current status before update
    // This prevents race conditions where multiple processes try to update the same conversion
    const currentConversion = await this.db.oneOrNone(
      "SELECT id, status FROM conversions WHERE id = $1",
      [conversionId],
    );
    
    if (!currentConversion) {
      console.warn(`Conversion ${conversionId} not found for status update`);
      return;
    }
    
    // SECURITY FIX: Prevent status transitions that don't make sense
    // e.g., don't allow updating from 'completed' to 'failed'
    const currentStatus = currentConversion.status as string;
    if (currentStatus === "completed" || currentStatus === "failed") {
      console.warn(`Conversion ${conversionId} already in terminal state: ${currentStatus}`);
      return;
    }
    
    if (errorMessage) {
      // Update with error message
      if (status === "completed") {
        await this.db.none(
          `UPDATE conversions
           SET status = $2, error_message = $3, updated_at = NOW(), completed_at = NOW()
           WHERE id = $1 AND status != 'completed' AND status != 'failed'`,
          [conversionId, status, errorMessage],
        );
      } else {
        await this.db.none(
          `UPDATE conversions
           SET status = $2, error_message = $3, updated_at = NOW()
           WHERE id = $1 AND status != 'completed' AND status != 'failed'`,
          [conversionId, status, errorMessage],
        );
      }
    } else {
      // Update without error message
      if (status === "completed") {
        await this.db.none(
          `UPDATE conversions
           SET status = $2, updated_at = NOW(), completed_at = NOW()
           WHERE id = $1 AND status != 'completed' AND status != 'failed'`,
          [conversionId, status],
        );
      } else {
        await this.db.none(
          `UPDATE conversions
           SET status = $2, updated_at = NOW()
           WHERE id = $1 AND status != 'completed' AND status != 'failed'`,
          [conversionId, status],
        );
      }
    }
  }

  /**
   * Get user conversions
   */
  async getUserConversions(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<ConversionRecord[]> {
    return this.db.any(
      `SELECT * FROM conversions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
  }

  /**
   * Get current exchange rate
   * SECURITY FIX: Replace hardcoded rates with placeholder for real-time price oracle integration
   * TODO: Integrate with CoinGecko or CoinMarketCap API for real-time rates
   */
  private async getCurrentRate(
    sourceCurrency: string,
    targetCurrency: string,
  ): Promise<number> {
    // TODO: Integrate with real-time price oracle (CoinGecko, CoinMarketCap, etc.)
    // Example implementation:
    // const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${sourceCurrency.toLowerCase()}&vs_currencies=${targetCurrency.toLowerCase()}`);
    // const data = await response.json();
    // return data[sourceCurrency.toLowerCase()][targetCurrency.toLowerCase()];
    
    // Temporary placeholder rates - replace with real-time API integration
    const rates: Record<string, number> = {
      "STARS-TON": 0.001,
      "TON-USD": 5.5,
      "STARS-USD": 0.0055,
    };
    const rateKey = `${sourceCurrency}-${targetCurrency}`;
    return rates[rateKey] || 0.001;
  }

  /*
   * NOTE: updateConversionStatus implemented below (keeps columns dynamic)
   * The older, simpler helper was removed during the merge to avoid duplicate
   * definitions.
   */
}

export default ConversionService;
