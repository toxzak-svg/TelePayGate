import { Database } from '../db/connection';
import { PlatformConfig, FeeCalculationResult, FeeBreakdown } from '../types';

export class FeeService {
  private db: Database;
  private config: PlatformConfig | null = null;

  constructor(db: Database) {
    this.db = db;
  }

  async getConfig(): Promise<PlatformConfig> {
    if (this.config) {
      return this.config;
    }
    return this.loadConfig();
  }

  private async loadConfig(): Promise<PlatformConfig> {
    const result = await this.db.oneOrNone('SELECT * FROM platform_config ORDER BY created_at DESC LIMIT 1');
    if (!result) {
      throw new Error('Platform configuration not found.');
    }
    this.config = result;
    return this.config as PlatformConfig;
  }

  async calculateFeeBreakdown(
    sourceAmount: number
  ): Promise<FeeBreakdown> {
    const config = await this.getConfig();
    const platformFee = sourceAmount * (config.platformFeePercentage / 100);
    
    // Placeholder for network fee
    const networkFee = 0.1; // Example fixed fee in STARS

    return {
      platform: platformFee,
      network: networkFee,
      telegram: 0, // Assuming no direct telegram fee for this flow
      total: platformFee + networkFee,
      platformPercentage: config.platformFeePercentage,
    };
  }

  async getPlatformWallet(): Promise<string> {
    // This should return the platform's master wallet for collecting fees
    return process.env.TON_MASTER_WALLET_ADDRESS || 'YOUR_PLATFORM_WALLET_ADDRESS';
  }


  async calculateFeesForPayment(paymentId: string): Promise<FeeCalculationResult> {
    const payment = await this.db.oneOrNone(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );
    if (!payment) {
      throw new Error('Payment not found');
    }

    const config = await this.getConfig();
    const starsAmount = payment.stars_amount;
    const fiatAmount = starsAmount * 0.0055; // Mock conversion rate

    const platformFee = starsAmount * (config.platformFeePercentage / 100);
    const telegramFee = starsAmount * (config.telegramFeePercentage / 100);
    const totalFee = platformFee + telegramFee;

    const result = await this.db.one(
      `INSERT INTO fee_calculations (payment_id, stars_amount, fiat_amount, currency, platform_fee, telegram_fee, ton_fee, exchange_fee, total_fee, fee_config)
       VALUES ($1, $2, $3, 'USD', $4, $5, 0, 0, $6, $7)
       RETURNING *`,
      [paymentId, starsAmount, fiatAmount, platformFee, telegramFee, totalFee, config]
    );

    return {
      paymentId,
      starsAmount,
      platformFee,
      telegramFee,
      totalFee,
      finalAmount: starsAmount - totalFee,
      calculationId: result.id,
    };
  }

  async recordFee(
    conversionId: string,
    userId: string,
    feeAmountStars: number,
    feeAmountTon: number,
    tonUsdRate: number
  ): Promise<void> {
    const result = await this.db.one(
      `INSERT INTO fee_collections (conversion_id, user_id, fee_amount_stars, fee_amount_ton, ton_usd_rate, status)
       VALUES ($1, $2, $3, $4, $5, 'collected')
       RETURNING id`,
      [conversionId, userId, feeAmountStars, feeAmountTon, tonUsdRate]
    );

    console.log('✅ Fee recorded:', {
      feeCollectionId: result.id,
      conversionId,
      feeAmountStars,
      feeAmountTon,
    });
  }

  async markFeeCollected(feeId: string, txHash: string): Promise<void> {
    await this.db.none(
      `UPDATE platform_fees SET status = 'collected', ton_tx_hash = $1, updated_at = NOW() WHERE id = $2`,
      [txHash, feeId]
    );
    console.log(`✅ Fee ${feeId} marked as collected.`);
  }

  async getFeeSummary(
    from: Date,
    to: Date
  ): Promise<{ totalFeesStars: number; totalFeesTon: number }> {
    const result = await this.db.one(
      `SELECT 
         SUM(fee_amount_stars) as total_fees_stars,
         SUM(fee_amount_ton) as total_fees_ton
       FROM fee_collections
       WHERE collected_at BETWEEN $1 AND $2`,
      [from, to]
    );

    return {
      totalFeesStars: parseFloat(result.total_fees_stars || 0),
      totalFeesTon: parseFloat(result.total_fees_ton || 0),
    };
  }

  async getTotalRevenue(): Promise<{ totalRevenueStars: number; totalRevenueTon: number }> {
    const result = await this.db.one(
      `SELECT 
         SUM(fee_amount_stars) as total_revenue_stars,
         SUM(fee_amount_ton) as total_revenue_ton
       FROM fee_collections
       WHERE status = 'collected'`
    );

    return {
      totalRevenueStars: parseFloat(result.total_revenue_stars || 0),
      totalRevenueTon: parseFloat(result.total_revenue_ton || 0),
    };
  }

  async collectFeesToMasterWallet(): Promise<string> {
    const masterWalletAddress = process.env.TON_MASTER_WALLET_ADDRESS;
    if (!masterWalletAddress) {
      throw new Error('TON_MASTER_WALLET_ADDRESS is not set');
    }

    await this.db.none(
      `UPDATE fee_collections 
       SET status = 'transferred', master_wallet_address = $1, transferred_at = NOW()
       WHERE status = 'collected'`,
      [masterWalletAddress]
    );

    return masterWalletAddress;
  }
}
