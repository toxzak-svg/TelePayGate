import { Pool } from 'pg';
export interface PlatformConfig {
    platformFeePercentage: number;
    fragmentFeePercentage: number;
    networkFeePercentage: number;
    platformTonWallet: string;
    minConversionAmount: number;
}
export interface FeeBreakdown {
    platform: number;
    fragment: number;
    network: number;
    total: number;
    platformPercentage: number;
}
export interface PlatformFee {
    id: string;
    conversion_id: string;
    user_id: string;
    fee_percentage: number;
    fee_amount_stars: number;
    fee_amount_ton: number;
    status: string;
    created_at: Date;
}
export declare class FeeService {
    private pool;
    private config;
    constructor(pool: Pool);
    /**
     * Get platform configuration (cached)
     */
    getConfig(): Promise<PlatformConfig>;
    /**
     * Calculate fees for a given amount
     */
    calculateFees(sourceAmount: number): Promise<FeeBreakdown>;
    /**
     * Record platform fee for a conversion
     */
    recordFee(conversionId: string, userId: string, feeAmountStars: number, feeAmountTon: number, exchangeRate: number): Promise<PlatformFee>;
    /**
     * Get total fees collected
     */
    getTotalRevenue(): Promise<{
        totalFeesStars: number;
        totalFeesTon: number;
        totalFeesUsd: number;
        collectedTon: number;
        pendingTon: number;
    }>;
    /**
     * Get revenue summary by date range
     */
    getRevenueSummary(startDate: Date, endDate: Date): Promise<Array<any>>;
    /**
     * Mark fee as collected
     */
    markFeeCollected(feeId: string, txHash: string): Promise<void>;
    /**
     * Get platform TON wallet address
     */
    getPlatformWallet(): Promise<string>;
}
export default FeeService;
