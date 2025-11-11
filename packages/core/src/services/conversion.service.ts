import { Pool } from 'pg';
import { FragmentService } from './fragment.service';
import { FeeService } from './fee.service';

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
  fragment_tx_id: string | null;
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
    fragment: number;
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
  private pool: Pool;
  private fragmentService: FragmentService;
  private feeService: FeeService;

  constructor(pool: Pool, tonWalletAddress: string) {
    this.pool = pool;
    this.fragmentService = new FragmentService(tonWalletAddress);
    this.feeService = new FeeService(pool);
  }

  /**
   * Get a rate quote for conversion with platform fees
   */
  async getQuote(
    sourceAmount: number,
    sourceCurrency: string = 'STARS',
    targetCurrency: string = 'TON'
  ): Promise<RateQuote> {
    const baseRate = await this.getCurrentRate(sourceCurrency, targetCurrency);
    const feeBreakdown = await this.feeService.calculateFees(sourceAmount);
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
        fragment: feeBreakdown.fragment,
        network: feeBreakdown.network,
        platform: feeBreakdown.platform,
        total: totalFees,
        platformPercentage: feeBreakdown.platformPercentage,
      },
      platformWallet,
      estimatedArrival: '5-10 minutes',
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
    const lockedUntil = Date.now() + durationSeconds * 1000;

    const result = await this.pool.query(
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

    const conversion = result.rows[0];

    console.log('🔒 Rate locked with fees:', {
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
   */
  async createConversion(
    userId: string,
    paymentIds: string[],
    targetCurrency: string = 'TON'
  ): Promise<ConversionRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get total stars from payments
      const paymentsResult = await client.query(
        `SELECT SUM(stars_amount) as total_stars 
         FROM payments 
         WHERE id = ANY($1) AND user_id = $2 AND status = 'received'`,
        [paymentIds, userId]
      );

      const totalStars = parseFloat(paymentsResult.rows[0]?.total_stars || 0);

      if (totalStars === 0) {
        throw new Error('No valid payments found for conversion');
      }

      // Check minimum amount
      const config = await this.feeService.getConfig();
      if (totalStars < config.minConversionAmount) {
        throw new Error(`Minimum ${config.minConversionAmount} Stars required for conversion`);
      }

      // Get quote with fees
      const quote = await this.getQuote(totalStars, 'STARS', targetCurrency);

      // Create conversion record
      const conversionResult = await client.query(
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
        ]
      );

      const conversion = conversionResult.rows[0];

      // Update payment statuses
      await client.query(
        `UPDATE payments 
         SET status = 'converting', updated_at = NOW()
         WHERE id = ANY($1)`,
        [paymentIds]
      );

      // COMMIT TRANSACTION BEFORE recording fee
      await client.query('COMMIT');

      // NOW record platform fee (after conversion exists in DB)
      const feeAmountTon = quote.fees.platform * quote.exchangeRate;
      await this.feeService.recordFee(
        conversion.id,
        userId,
        quote.fees.platform,
        feeAmountTon,
        5.5 // Mock TON/USD rate
      );

      console.log('✅ Conversion created with fees:', {
        id: conversion.id,
        stars: totalStars,
        ton: quote.targetAmount,
        platformFee: quote.fees.platform,
        platformFeeTon: feeAmountTon,
      });

      // Start conversion with Fragment (async)
      this.executeFragmentConversion(conversion.id, paymentIds).catch((err) =>
        console.error('Fragment conversion error:', err)
      );

      return conversion;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Conversion failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute conversion via Fragment (background process)
   */
  private async executeFragmentConversion(
    conversionId: string,
    paymentIds: string[]
  ): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE conversions SET status = 'phase1_prepared' WHERE id = $1`,
        [conversionId]
      );

      const fragmentResult = await this.fragmentService.convertStarsToTON(
        paymentIds,
        { lockedRateDuration: 300 }
      );

      await this.pool.query(
        `UPDATE conversions 
         SET fragment_tx_id = $1, status = 'phase2_committed', updated_at = NOW()
         WHERE id = $2`,
        [fragmentResult.fragmentTxId, conversionId]
      );

      console.log('✅ Fragment conversion submitted:', {
        conversionId,
        fragmentTxId: fragmentResult.fragmentTxId,
      });

      this.pollFragmentStatus(conversionId, fragmentResult.fragmentTxId!);
    } catch (error) {
      console.error('❌ Fragment conversion error:', error);
      await this.pool.query(
        `UPDATE conversions 
         SET status = 'failed', error_message = $1, updated_at = NOW()
         WHERE id = $2`,
        [(error as Error).message, conversionId]
      );
    }
  }

  /**
   * Poll Fragment for conversion status
   */
  private async pollFragmentStatus(
    conversionId: string,
    fragmentTxId: string
  ): Promise<void> {
    setTimeout(async () => {
      const status = await this.fragmentService.pollConversionStatus(fragmentTxId);

      if (status.status === 'confirmed') {
        await this.pool.query(
          `UPDATE conversions 
           SET status = 'completed', ton_tx_hash = $1, 
               completed_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [status.tonTxHash, conversionId]
        );

        console.log('✅ Conversion completed:', { conversionId, txHash: status.tonTxHash });

        const feeResult = await this.pool.query(
          'SELECT id FROM platform_fees WHERE conversion_id = $1',
          [conversionId]
        );
        
        if (feeResult.rows.length > 0) {
          await this.feeService.markFeeCollected(
            feeResult.rows[0].id,
            status.tonTxHash || 'pending'
          );
        }
      } else if (status.status === 'failed') {
        await this.pool.query(
          `UPDATE conversions 
           SET status = 'failed', error_message = $1, updated_at = NOW()
           WHERE id = $2`,
          [status.errorMessage, conversionId]
        );
      } else {
        this.pollFragmentStatus(conversionId, fragmentTxId);
      }
    }, 5000);
  }

  /**
   * Get conversion by ID
   */
  async getConversionById(conversionId: string): Promise<ConversionRecord | null> {
    const result = await this.pool.query(
      'SELECT * FROM conversions WHERE id = $1',
      [conversionId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get user conversions
   */
  async getUserConversions(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ConversionRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM conversions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  /**
   * Get current exchange rate
   */
  private async getCurrentRate(
    sourceCurrency: string,
    targetCurrency: string
  ): Promise<number> {
    const rates: Record<string, number> = {
      'STARS-TON': 0.001,
      'TON-USD': 5.5,
      'STARS-USD': 0.0055,
    };
    const rateKey = `${sourceCurrency}-${targetCurrency}`;
    return rates[rateKey] || 0.001;
  }
}

export default ConversionService;
