import { getDatabase, Database } from '../db/connection';
import { TonPaymentService } from './ton-payment.service';
import { FeeService } from './fee.service';
import { RateAggregatorService } from './rate-aggregator.service';

export interface DirectConversionRecord {
  id: string;
  user_id: string;
  payment_ids: string[];
  source_currency: string;
  target_currency: string;
  source_amount: number;
  target_amount: number | null;
  exchange_rate: number | null;
  rate_locked_until: number | null;
  ton_tx_hash: string | null;
  status: string;
  fees: any;
  platform_fee_amount: number;
  platform_fee_percentage: number;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  error_message?: string;
}

export interface RateQuote {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  exchangeRate: number;
  fees: {
    network: number;
    platform: number;
    total: number;
    platformPercentage: number;
  };
  platformWallet: string;
  estimatedArrival: string;
  validUntil: Date;
}

/**
 * Direct TON Conversion Service
 * Replaces Fragment API with direct blockchain operations
 * 
 * Features:
 * - No KYC requirements
 * - No 21-day holding period
 * - Customizable minimum conversion amounts
 * - Direct TON blockchain transactions
 * - Real-time rate aggregation from multiple sources
 */
export class DirectConversionService {
  private db: Database;
  private feeService: FeeService;
  private rateAggregator: RateAggregatorService;
  private tonService: TonPaymentService;
  private minConversionStars: number = 100;

  constructor() {
    this.db = getDatabase();
    this.feeService = new FeeService(this.db);
    this.rateAggregator = new RateAggregatorService();
    this.tonService = new TonPaymentService({
      endpoint: process.env.TON_API_URL!,
      mnemonic: process.env.TON_WALLET_MNEMONIC!,
    });
  }

  /**
   * Get a rate quote for conversion with platform fees
   * No Fragment fees - only network + platform fees
   */
  async getQuote(
    sourceAmount: number,
    sourceCurrency: string = 'STARS',
    targetCurrency: string = 'TON'
  ): Promise<RateQuote> {
    // Get real-time rate from aggregator
    const rateData = await this.rateAggregator.getAggregatedRate('TON', 'USD');
    
    // Calculate Stars to TON rate
    // Assuming 1 Star ≈ $0.015 USD (Telegram's internal rate)
    const starsUsdRate = 0.015;
    const tonUsdRate = rateData.averageRate;
    const starsToTonRate = starsUsdRate / tonUsdRate;

    const feeBreakdown = await this.feeService.calculateFeeBreakdown(sourceAmount);
    const platformWallet = await this.feeService.getPlatformWallet();
    
    // Only network + platform fees (no Fragment fee)
    const totalFees = feeBreakdown.platform + feeBreakdown.network;
    const targetAmount = (sourceAmount - totalFees) * starsToTonRate;

    return {
      sourceCurrency,
      targetCurrency,
      sourceAmount,
      targetAmount,
      exchangeRate: starsToTonRate,
      fees: {
        network: feeBreakdown.network,
        platform: feeBreakdown.platform,
        total: totalFees,
        platformPercentage: feeBreakdown.platformPercentage,
      },
      platformWallet,
      estimatedArrival: '1-2 minutes', // Much faster than Fragment
      validUntil: new Date(Date.now() + 60000),
    };
  }

  /**
   * Lock conversion rate for a duration
   */
  async lockRate(
    userId: string,
    sourceAmount: number,
    sourceCurrency: string = 'STARS',
    targetCurrency: string = 'TON',
    durationSeconds: number = 300
  ): Promise<{
    conversionId: string;
    rate: number;
    lockedUntil: Date;
    targetAmount: number;
    platformFee: number;
  }> {
    const quote = await this.getQuote(sourceAmount, sourceCurrency, targetCurrency);
    const lockedUntil = new Date(Date.now() + durationSeconds * 1000);

    const conversion = await this.db.one(
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
        lockedUntil,
        JSON.stringify(quote.fees),
        quote.fees.platform,
        quote.fees.platformPercentage / 100,
      ]
    );

    console.log('🔒 Rate locked (direct TON):', {
      conversionId: conversion.id,
      rate: quote.exchangeRate,
      platformFee: quote.fees.platform,
      lockedUntil: lockedUntil,
    });

    return {
      conversionId: conversion.id,
      rate: quote.exchangeRate,
      lockedUntil: lockedUntil,
      targetAmount: conversion.target_amount,
      platformFee: conversion.platform_fee_amount,
    };
  }

  /**
   * Create and execute conversion with direct TON transfer
   * NO Fragment API - direct blockchain operation
   */
  async createConversion(
    userId: string,
    paymentIds: string[],
    targetCurrency: string = 'TON',
    destinationAddress?: string
  ): Promise<DirectConversionRecord> {
    return this.db.tx(async t => {
      const paymentsResult = await t.one(
        `SELECT SUM(stars_amount) as total_stars 
         FROM payments 
         WHERE id = ANY($1) AND user_id = $2 AND status = 'received'`,
        [paymentIds, userId]
      );

      const totalStars = parseFloat(paymentsResult.total_stars || 0);

      if (totalStars === 0) {
        throw new Error('No valid payments found for conversion');
      }

      // Check minimum amount (much lower than Fragment)
      if (totalStars < this.minConversionStars) {
        throw new Error(
          `Minimum ${this.minConversionStars} Stars required for conversion`
        );
      }

      // Get quote with real-time rates
      const quote = await this.getQuote(totalStars, 'STARS', targetCurrency);

      // Get user's TON address if not provided
      if (!destinationAddress) {
        const user = await t.oneOrNone(
          'SELECT ton_wallet_address FROM users WHERE id = $1',
          [userId]
        );
        destinationAddress = user?.ton_wallet_address;
        
        if (!destinationAddress) {
          throw new Error('User has no TON wallet address configured');
        }
      }

      // Create conversion record
      const conversion = await t.one(
        `INSERT INTO conversions (
          user_id, payment_ids, source_currency, target_currency,
          source_amount, target_amount, exchange_rate, status,
          fee_breakdown, platform_fee_amount, platform_fee_percentage
        ) VALUES ($1, $2, 'STARS', $3, $4, $5, $6, 'processing', $7, $8, $9)
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
        ]
      );

      await t.none(
        `UPDATE payments 
         SET status = 'converting', updated_at = NOW()
         WHERE id = ANY($1)`,
        [paymentIds]
      );

      // Record platform fee
      const feeAmountTon = quote.fees.platform * quote.exchangeRate;
      await this.feeService.recordFee(
        conversion.id,
        userId,
        quote.fees.platform,
        feeAmountTon,
        await this.getCurrentTonUsdRate()
      );

      console.log('✅ Conversion created (direct TON):', {
        id: conversion.id,
        stars: totalStars,
        ton: quote.targetAmount,
        destination: destinationAddress,
      });

      // Execute direct TON transfer (async)
      this.executeDirectTonTransfer(
        conversion.id,
        destinationAddress,
        quote.targetAmount
      ).catch((err) => console.error('Direct TON transfer error:', err));

      return conversion;
    });
  }

  /**
   * Execute direct TON transfer via blockchain
   * Replaces Fragment's conversion flow entirely
   */
  private async executeDirectTonTransfer(
    conversionId: string,
    destinationAddress: string,
    amount: number
  ): Promise<void> {
    try {
      await this.db.none(
        `UPDATE conversions SET status = 'sending_ton', updated_at = NOW() WHERE id = $1`,
        [conversionId]
      );

      // Send TON directly via blockchain
      const txHash = await this.tonService.sendTon(
        destinationAddress,
        amount,
        `Conversion ${conversionId}`
      );

      await this.db.none(
        `UPDATE conversions 
         SET ton_tx_hash = $1, status = 'completed', 
             completed_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [txHash, conversionId]
      );

      console.log('✅ Direct TON transfer completed:', {
        conversionId,
        txHash,
        amount,
      });

      const fee = await this.db.oneOrNone(
        'SELECT id FROM platform_fees WHERE conversion_id = $1',
        [conversionId]
      );

      if (fee) {
        await this.feeService.markFeeCollected(fee.id, txHash);
      }

      await this.db.none(
        `UPDATE payments 
         SET status = 'completed', updated_at = NOW()
         WHERE id = ANY(
           SELECT UNNEST(payment_ids) FROM conversions WHERE id = $1
         )`,
        [conversionId]
      );
    } catch (error) {
      console.error('❌ Direct TON transfer failed:', error);
      await this.db.none(
        `UPDATE conversions 
         SET status = 'failed', error_message = $1, updated_at = NOW()
         WHERE id = $2`,
        [(error as Error).message, conversionId]
      );
      throw error;
    }
  }

  /**
   * Get conversion by ID
   */
  async getConversionById(
    conversionId: string
  ): Promise<DirectConversionRecord | null> {
    return this.db.oneOrNone(
      'SELECT * FROM conversions WHERE id = $1',
      [conversionId]
    );
  }

  /**
   * Get user conversions
   */
  async getUserConversions(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<DirectConversionRecord[]> {
    return this.db.any(
      `SELECT * FROM conversions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }

  /**
   * Get current TON/USD rate
   */
  private async getCurrentTonUsdRate(): Promise<number> {
    const rateData = await this.rateAggregator.getAggregatedRate('TON', 'USD');
    return rateData.averageRate;
  }

  /**
   * Validate TON wallet address format
   */
  validateTonAddress(address: string): boolean {
    // Basic TON address validation
    return /^[UEk][Qf][A-Za-z0-9_-]{46}$/.test(address);
  }
}

export default DirectConversionService;
