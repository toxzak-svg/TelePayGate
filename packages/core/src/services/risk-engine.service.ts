import { IDatabase } from "pg-promise";
import { TonBlockchainService } from "./ton-blockchain.service";

/**
 * Risk Engine Service
 *
 * Implements strict risk controls to protect the operator's under-$50 liquidity buffer.
 * Tracks real-time TON exposure, enforces per-user limits, and automatically
 * reduces limits when treasury balance drops below floor threshold.
 */
export class RiskEngineService {
  private db: IDatabase<any>;
  private tonService: TonBlockchainService;

  // Risk configuration from environment
  private readonly config = {
    enabled: process.env.RISK_ENGINE_ENABLED === "true",
    maxSwapSizeStars: parseInt(process.env.MAX_SWAP_SIZE_STARS || "5000"),
    maxSwapSizeTon: parseFloat(process.env.MAX_SWAP_SIZE_TON || "0.1"),
    dailyCapStars: parseInt(process.env.DAILY_CAP_STARS || "20000"),
    maxPendingConversions: parseInt(process.env.MAX_PENDING_CONVERSIONS || "3"),
    liquidityFloorUsd: parseFloat(process.env.LIQUIDITY_FLOOR_USD || "10"),
    operatorTonThreshold: parseFloat(process.env.OPERATOR_TON_BALANCE_THRESHOLD || "50"),
  };

  // Treasury balance cache (updated periodically)
  private treasuryBalanceTon: number = 0;
  private treasuryBalanceUsd: number = 0;
  private lastTreasuryUpdate: Date = new Date(0);

  constructor(db: IDatabase<any>, tonService?: TonBlockchainService) {
    this.db = db;
    this.tonService =
      tonService ||
      new TonBlockchainService(
        process.env.TON_API_URL || "https://toncenter.com/api/v2/jsonRPC",
        process.env.TON_API_KEY,
        process.env.TON_WALLET_MNEMONIC,
      );
  }

  /**
   * Initialize risk engine by loading current limits and treasury balance
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log("⚠️ Risk engine is disabled");
      return;
    }

    console.log("🛡️ Initializing risk engine...");
    await this.loadDefaultRiskLimits();
    await this.updateTreasuryBalance();
    console.log("✅ Risk engine initialized");
  }

  /**
   * Check if a swap request is within risk limits
   */
  async checkSwapLimits(
    userId: string,
    starsAmount: number,
    tonAmount: number,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    currentLimits?: RiskLimits;
  }> {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    // Get current limits for user
    const limits = await this.getUserRiskLimits(userId);

    // Check max swap size (Stars)
    if (starsAmount > limits.maxSwapSizeStars) {
      return {
        allowed: false,
        reason: `Swap amount exceeds maximum of ${limits.maxSwapSizeStars} Stars`,
        currentLimits: limits,
      };
    }

    // Check max swap size (TON)
    if (tonAmount > limits.maxSwapSizeTon) {
      return {
        allowed: false,
        reason: `Swap amount exceeds maximum of ${limits.maxSwapSizeTon} TON`,
        currentLimits: limits,
      };
    }

    // Check daily volume cap
    const dailyVolume = await this.getDailyVolume(userId);
    if (dailyVolume + starsAmount > limits.dailyCapStars) {
      return {
        allowed: false,
        reason: `Daily cap of ${limits.dailyCapStars} Stars exceeded`,
        currentLimits: limits,
      };
    }

    // Check pending conversions count
    const pendingCount = await this.getPendingConversionsCount(userId);
    if (pendingCount >= limits.maxPendingConversions) {
      return {
        allowed: false,
        reason: `Maximum of ${limits.maxPendingConversions} pending swaps reached`,
        currentLimits: limits,
      };
    }

    // Check treasury balance and adjust if needed
    await this.checkTreasuryFloor();

    return { allowed: true, currentLimits: limits };
  }

  /**
   * Get risk limits for a specific user (or global defaults)
   */
  async getUserRiskLimits(userId: string): Promise<RiskLimits> {
    const customLimits = await this.db.manyOrNone(
      `SELECT limit_type, limit_value
       FROM risk_limits
       WHERE user_id = $1 AND is_active = true`,
      [userId],
    );

    const limits: RiskLimits = {
      maxSwapSizeStars: this.config.maxSwapSizeStars,
      maxSwapSizeTon: this.config.maxSwapSizeTon,
      dailyCapStars: this.config.dailyCapStars,
      maxPendingConversions: this.config.maxPendingConversions,
    };

    // Apply custom limits if they exist
    for (const limit of customLimits) {
      switch (limit.limit_type) {
        case "max_swap_size":
          limits.maxSwapSizeStars = parseInt(limit.limit_value);
          break;
        case "max_swap_ton":
          limits.maxSwapSizeTon = parseFloat(limit.limit_value);
          break;
        case "daily_cap":
          limits.dailyCapStars = parseInt(limit.limit_value);
          break;
        case "max_pending":
          limits.maxPendingConversions = parseInt(limit.limit_value);
          break;
      }
    }

    return limits;
  }

  /**
   * Get user's daily volume in Stars
   */
  async getDailyVolume(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.db.oneOrNone(
      `SELECT COALESCE(SUM(source_amount), 0) as total
       FROM conversions
       WHERE user_id = $1
         AND created_at >= $2
         AND status NOT IN ('failed', 'cancelled')`,
      [userId, today],
    );

    return parseInt(result?.total || "0");
  }

  /**
   * Get count of pending conversions for a user
   */
  async getPendingConversionsCount(userId: string): Promise<number> {
    const result = await this.db.oneOrNone(
      `SELECT COUNT(*) as count
       FROM conversions
       WHERE user_id = $1
         AND status IN ('pending', 'rate_locked', 'awaiting_ton', 'converting')`,
      [userId],
    );

    return parseInt(result?.count || "0");
  }

  /**
   * Get total pending TON exposure across all users
   */
  async getTotalPendingExposure(): Promise<number> {
    const result = await this.db.oneOrNone(
      `SELECT COALESCE(SUM(target_amount), 0) as total
       FROM conversions
       WHERE status IN ('rate_locked', 'awaiting_ton', 'converting')`,
      [],
    );

    return parseFloat(result?.total || "0");
  }

  /**
   * Update treasury balance from blockchain
   */
  async updateTreasuryBalance(): Promise<void> {
    try {
      const walletAddress = await this.tonService.getWalletAddress();
      if (!walletAddress) {
        console.warn("⚠️ No wallet address configured for treasury");
        return;
      }

      const balance = await this.tonService.getBalance(walletAddress);
      this.treasuryBalanceTon = balance;

      // Convert to USD (use fixed rate or fetch from oracle)
      const tonUsdRate = parseFloat(process.env.SETTLEMENT_TON_USD_RATE || "5.5");
      this.treasuryBalanceUsd = balance * tonUsdRate;

      this.lastTreasuryUpdate = new Date();

      // Update database record
      await this.db.none(
        `INSERT INTO arena_treasury (wallet_address, balance_ton, balance_usd)
         VALUES ($1, $2, $3)
         ON CONFLICT (wallet_address)
         DO UPDATE SET
           balance_ton = EXCLUDED.balance_ton,
           balance_usd = EXCLUDED.balance_usd,
           last_updated = NOW()`,
        [walletAddress.toString(), balance, this.treasuryBalanceUsd],
      );

      console.log(
        `💰 Treasury updated: ${balance.toFixed(4)} TON ($${this.treasuryBalanceUsd.toFixed(2)})`,
      );
    } catch (error: any) {
      console.error("❌ Failed to update treasury balance:", error.message);
    }
  }

  /**
   * Check if treasury is below floor and adjust limits
   */
  async checkTreasuryFloor(): Promise<void> {
    // Update treasury if cache is stale (>5 minutes)
    const now = new Date();
    if (
      now.getTime() - this.lastTreasuryUpdate.getTime() > 5 * 60 * 1000
    ) {
      await this.updateTreasuryBalance();
    }

    // Check if below floor
    if (this.treasuryBalanceUsd < this.config.liquidityFloorUsd) {
      console.warn(
        `⚠️ Treasury below floor ($${this.treasuryBalanceUsd.toFixed(2)} < $${this.config.liquidityFloorUsd})`,
      );

      // Automatically reduce limits
      await this.reduceGlobalLimits(0.5); // Reduce to 50%

      // TODO: Send alert via monitoring system
      console.error("🚨 LIQUIDITY FLOOR BREACHED - Limits reduced");
    }
  }

  /**
   * Reduce global risk limits by a factor
   */
  async reduceGlobalLimits(factor: number): Promise<void> {
    const newMaxSwapStars = Math.floor(
      this.config.maxSwapSizeStars * factor,
    );
    const newMaxSwapTon = this.config.maxSwapSizeTon * factor;
    const newDailyCap = Math.floor(this.config.dailyCapStars * factor);
    const newMaxPending = Math.floor(
      this.config.maxPendingConversions * factor,
    );

    // Update global limits (user_id = NULL)
    await this.db.tx(async (t) => {
      await t.none(
        `UPDATE risk_limits
         SET is_active = false
         WHERE user_id IS NULL`,
        [],
      );

      await t.none(
        `INSERT INTO risk_limits (limit_type, limit_value)
         VALUES ('max_swap_size', $1),
                ('max_swap_ton', $2),
                ('daily_cap', $3),
                ('max_pending', $4)`,
        [newMaxSwapStars, newMaxSwapTon, newDailyCap, newMaxPending],
      );
    });

    // Update config
    this.config.maxSwapSizeStars = newMaxSwapStars;
    this.config.maxSwapSizeTon = newMaxSwapTon;
    this.config.dailyCapStars = newDailyCap;
    this.config.maxPendingConversions = newMaxPending;

    console.log(
      `📉 Global limits reduced by factor ${factor}: maxSwap=${newMaxSwapStars} Stars, dailyCap=${newDailyCap} Stars`,
    );
  }

  /**
   * Restore global limits to default
   */
  async restoreGlobalLimits(): Promise<void> {
    await this.db.tx(async (t) => {
      await t.none(
        `UPDATE risk_limits
         SET is_active = false
         WHERE user_id IS NULL`,
        [],
      );

      await t.none(
        `INSERT INTO risk_limits (limit_type, limit_value)
         VALUES ('max_swap_size', $1),
                ('max_swap_ton', $2),
                ('daily_cap', $3),
                ('max_pending', $4)`,
        [
          this.config.maxSwapSizeStars,
          this.config.maxSwapSizeTon,
          this.config.dailyCapStars,
          this.config.maxPendingConversions,
        ],
      );
    });

    console.log("📈 Global limits restored to default values");
  }

  /**
   * Log risk metric for analytics
   */
  async logRiskMetric(
    userId: string,
    metricType: "daily_volume" | "pending_exposure" | "swap_count" | "daily_swaps",
    value: number,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<void> {
    await this.db.none(
      `INSERT INTO risk_metrics (user_id, metric_type, metric_value, window_start, window_end)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, metricType, value, windowStart, windowEnd],
    );
  }

  /**
   * Load default risk limits from environment
   */
  private async loadDefaultRiskLimits(): Promise<void> {
    await this.db.none(
      `INSERT INTO risk_limits (limit_type, limit_value)
       VALUES ('max_swap_size', $1),
              ('max_swap_ton', $2),
              ('daily_cap', $3),
              ('max_pending', $4)
       ON CONFLICT DO NOTHING`,
      [
        this.config.maxSwapSizeStars,
        this.config.maxSwapSizeTon,
        this.config.dailyCapStars,
        this.config.maxPendingConversions,
      ],
    );
  }

  /**
   * Get current treasury balance
   */
  getTreasuryBalance(): { ton: number; usd: number } {
    return {
      ton: this.treasuryBalanceTon,
      usd: this.treasuryBalanceUsd,
    };
  }

  /**
   * Get risk engine configuration
   */
  getConfig() {
    return { ...this.config };
  }
}

/**
 * Risk limits for a user
 */
export interface RiskLimits {
  maxSwapSizeStars: number;
  maxSwapSizeTon: number;
  dailyCapStars: number;
  maxPendingConversions: number;
}

export default RiskEngineService;
