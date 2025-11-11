import { Pool } from 'pg';
import { FragmentService } from './fragment.service';

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
  };
  estimatedArrival: string;
  validUntil: Date;
}

export class ConversionService {
  private pool: Pool;
  private fragmentService: FragmentService;

  constructor(pool: Pool, tonWalletAddress: string) {
    this.pool = pool;
    this.fragmentService = new FragmentService(tonWalletAddress);
  }

  /**
   * Get a rate quote for conversion
   */
  async getQuote(
    sourceAmount: number,
    sourceCurrency: string = 'STARS',
    targetCurrency: string = 'TON'
  ): Promise<RateQuote> {
    // Get current rate (in production, this would call multiple sources)
    const baseRate = await this.getCurrentRate(sourceCurrency, targetCurrency);

    // Calculate fees (example: 1% platform, 0.5% fragment, 0.1% network)
    const platformFee = sourceAmount * 0.01;
    const fragmentFee = sourceAmount * 0.005;
    const networkFee = sourceAmount * 0.001;
    const totalFees = platformFee + fragmentFee + networkFee;

    const targetAmount = (sourceAmount - totalFees) * baseRate;

    return {
      sourceCurrency,
      targetCurrency,
      sourceAmount,
      targetAmount,
      exchangeRate: baseRate,
      fees: {
        fragment: fragmentFee,
        network: networkFee,
        platform: platformFee,
        total: totalFees,
      },
      estimatedArrival: '5-10 minutes',
      validUntil: new Date(Date.now() + 60000), // 60 seconds
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
  }> {
    const quote = await this.getQuote(sourceAmount, sourceCurrency, targetCurrency);
    const lockedUntil = Date.now() + durationSeconds * 1000;

    const result = await this.pool.query(
      `INSERT INTO conversions (
        user_id, source_currency, target_currency, source_amount,
        target_amount, exchange_rate, rate_locked_until, status,
        fee_breakdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'rate_locked', $8)
      RETURNING id, exchange_rate, target_amount`,
      [
        userId,
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        quote.targetAmount,
        quote.exchangeRate,
        lockedUntil,
        JSON.stringify(quote.fees),
      ]
    );

    const conversion = result.rows[0];

    console.log('🔒 Rate locked:', {
      conversionId: conversion.id,
      rate: quote.exchangeRate,
      lockedUntil: new Date(lockedUntil),
    });

    return {
      conversionId: conversion.id,
      rate: quote.exchangeRate,
      lockedUntil: new Date(lockedUntil),
      targetAmount: conversion.target_amount,
    };
  }

  /**
   * Create and execute conversion
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

      if (totalStars < 1000) {
        throw new Error('Minimum 1000 Stars required for conversion');
      }

      // Get quote
      const quote = await this.getQuote(totalStars, 'STARS', targetCurrency);

      // Create conversion record
      const conversionResult = await client.query(
        `INSERT INTO conversions (
          user_id, payment_ids, source_currency, target_currency,
          source_amount, target_amount, exchange_rate, status,
          fee_breakdown
        ) VALUES ($1, $2, 'STARS', $3, $4, $5, $6, 'pending', $7)
        RETURNING *`,
        [
          userId,
          paymentIds,
          targetCurrency,
          totalStars,
          quote.targetAmount,
          quote.exchangeRate,
          JSON.stringify(quote.fees),
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

      // Start conversion with Fragment (async, don't await)
      this.executeFragmentConversion(conversion.id, paymentIds).catch((err) =>
        console.error('Fragment conversion error:', err)
      );

      await client.query('COMMIT');

      console.log('✅ Conversion created:', {
        id: conversion.id,
        stars: totalStars,
        ton: quote.targetAmount,
      });

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
      // Update status
      await this.pool.query(
        `UPDATE conversions SET status = 'phase1_prepared' WHERE id = $1`,
        [conversionId]
      );

      // Call Fragment service
      const fragmentResult = await this.fragmentService.convertStarsToTON(
        paymentIds,
        { lockedRateDuration: 300 }
      );

      // Update with Fragment transaction ID
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

      // Poll for completion (in production, use webhooks)
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
    // Simulate polling (in production, Fragment would webhook you)
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
      } else if (status.status === 'failed') {
        await this.pool.query(
          `UPDATE conversions 
           SET status = 'failed', error_message = $1, updated_at = NOW()
           WHERE id = $2`,
          [status.errorMessage, conversionId]
        );
      } else {
        // Keep polling
        this.pollFragmentStatus(conversionId, fragmentTxId);
      }
    }, 5000); // Poll every 5 seconds
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
    // In production, aggregate from multiple sources
    // For now, return mock rate
    const rates: Record<string, number> = {
      'STARS-TON': 0.001, // 1 Star = 0.001 TON
      'TON-USD': 5.5, // 1 TON = $5.50
      'STARS-USD': 0.0055, // 1 Star = $0.0055
    };

    const rateKey = `${sourceCurrency}-${targetCurrency}`;
    return rates[rateKey] || 0.001;
  }
}

export default ConversionService;
