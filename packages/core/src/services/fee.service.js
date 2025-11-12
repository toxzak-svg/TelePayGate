"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeService = void 0;
class FeeService {
    constructor(pool) {
        this.config = null;
        this.pool = pool;
    }
    /**
     * Get platform configuration (cached)
     */
    async getConfig() {
        if (this.config) {
            return this.config;
        }
        const result = await this.pool.query(`SELECT 
        platform_fee_percentage,
        fragment_fee_percentage,
        network_fee_percentage,
        platform_ton_wallet,
        min_conversion_amount
       FROM platform_config
       WHERE is_active = true
       LIMIT 1`);
        if (result.rows.length === 0) {
            throw new Error('Platform configuration not found');
        }
        const row = result.rows[0];
        this.config = {
            platformFeePercentage: parseFloat(row.platform_fee_percentage),
            fragmentFeePercentage: parseFloat(row.fragment_fee_percentage),
            networkFeePercentage: parseFloat(row.network_fee_percentage),
            platformTonWallet: row.platform_ton_wallet,
            minConversionAmount: row.min_conversion_amount,
        };
        return this.config;
    }
    /**
     * Calculate fees for a given amount
     */
    async calculateFees(sourceAmount) {
        const config = await this.getConfig();
        const platformFee = sourceAmount * config.platformFeePercentage;
        const fragmentFee = sourceAmount * config.fragmentFeePercentage;
        const networkFee = sourceAmount * config.networkFeePercentage;
        return {
            platform: platformFee,
            fragment: fragmentFee,
            network: networkFee,
            total: platformFee + fragmentFee + networkFee,
            platformPercentage: config.platformFeePercentage * 100,
        };
    }
    /**
     * Record platform fee for a conversion
     */
    async recordFee(conversionId, userId, feeAmountStars, feeAmountTon, exchangeRate) {
        const config = await this.getConfig();
        const feeAmountUsd = feeAmountTon * exchangeRate; // Simplified, use real TON/USD rate
        const result = await this.pool.query(`INSERT INTO platform_fees (
        conversion_id,
        user_id,
        fee_percentage,
        fee_amount_stars,
        fee_amount_ton,
        fee_amount_usd,
        status,
        fee_type
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'platform')
      RETURNING *`, [
            conversionId,
            userId,
            config.platformFeePercentage,
            feeAmountStars,
            feeAmountTon,
            feeAmountUsd,
        ]);
        console.log('💰 Platform fee recorded:', {
            conversionId,
            feeStars: feeAmountStars,
            feeTon: feeAmountTon,
            feeUsd: feeAmountUsd,
        });
        return result.rows[0];
    }
    /**
     * Get total fees collected
     */
    async getTotalRevenue() {
        const result = await this.pool.query(`
      SELECT 
        SUM(fee_amount_stars) as total_fees_stars,
        SUM(fee_amount_ton) as total_fees_ton,
        SUM(fee_amount_usd) as total_fees_usd,
        SUM(CASE WHEN status = 'collected' THEN fee_amount_ton ELSE 0 END) as collected_ton,
        SUM(CASE WHEN status = 'pending' THEN fee_amount_ton ELSE 0 END) as pending_ton
      FROM platform_fees
    `);
        const row = result.rows[0];
        return {
            totalFeesStars: parseFloat(row.total_fees_stars || 0),
            totalFeesTon: parseFloat(row.total_fees_ton || 0),
            totalFeesUsd: parseFloat(row.total_fees_usd || 0),
            collectedTon: parseFloat(row.collected_ton || 0),
            pendingTon: parseFloat(row.pending_ton || 0),
        };
    }
    /**
     * Get revenue summary by date range
     */
    async getRevenueSummary(startDate, endDate) {
        const result = await this.pool.query(`SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_fees,
        SUM(fee_amount_stars) as total_stars_fees,
        SUM(fee_amount_ton) as total_ton_fees
       FROM platform_fees
       WHERE created_at BETWEEN $1 AND $2
       GROUP BY DATE(created_at)
       ORDER BY date DESC`, [startDate, endDate]);
        // FIXED: Added type annotation to row parameter
        return result.rows.map((row) => ({
            date: row.date,
            totalFees: parseInt(row.total_fees),
            totalStarsFees: parseFloat(row.total_stars_fees),
            totalTonFees: parseFloat(row.total_ton_fees),
        }));
    }
    /**
     * Mark fee as collected
     */
    async markFeeCollected(feeId, txHash) {
        await this.pool.query(`UPDATE platform_fees
       SET status = 'collected',
           collection_tx_hash = $1,
           collected_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`, [txHash, feeId]);
        console.log('✅ Fee marked as collected:', { feeId, txHash });
    }
    /**
     * Get platform TON wallet address
     */
    async getPlatformWallet() {
        const config = await this.getConfig();
        return config.platformTonWallet;
    }
}
exports.FeeService = FeeService;
exports.default = FeeService;
