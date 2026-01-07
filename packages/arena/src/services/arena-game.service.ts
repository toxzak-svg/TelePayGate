import { IDatabase } from "pg-promise";
import { RiskEngineService } from "telepaygate-core";
import {
  GameSession,
  MatchState,
  PlayerProfile,
  XPRewardReason,
  SwapHistoryEntry,
  PlayerStatsSummary,
  DailyChallenge,
  MatchRequest,
  OpponentInfo,
  LiquiditySourceType,
} from "../types/arena.types";

/**
 * Arena Game Service
 *
 * Manages the game loop around conversions, including:
 * - Match state transitions
 * - XP rewards and level progression
 * - Streak tracking
 * - Daily challenges
 */
export class ArenaGameService {
  private db: IDatabase<any>;
  private riskEngine: RiskEngineService;

  // XP reward configuration
  private readonly xpConfig = {
    baseSwap: 10,
    volumeBonus: 1, // XP per 1000 Stars
    streakMultiplier: 0.5, // Additional XP per streak level
    firstSwap: 100,
    dailyBonus: 50,
    dailyBonusThreshold: 5, // Swaps required for daily bonus
  };

  // Level configuration
  private readonly levelConfigs: LevelConfig[] = [
    { level: 1, xpRequired: 0, maxSwapSize: 1000, dailyCap: 5000 },
    { level: 2, xpRequired: 100, maxSwapSize: 2000, dailyCap: 10000 },
    { level: 3, xpRequired: 300, maxSwapSize: 3000, dailyCap: 15000 },
    { level: 4, xpRequired: 600, maxSwapSize: 4000, dailyCap: 20000 },
    { level: 5, xpRequired: 1000, maxSwapSize: 5000, dailyCap: 25000 },
    { level: 6, xpRequired: 2000, maxSwapSize: 6000, dailyCap: 30000 },
    { level: 7, xpRequired: 3500, maxSwapSize: 7000, dailyCap: 35000 },
    { level: 8, xpRequired: 5500, maxSwapSize: 8000, dailyCap: 40000 },
    { level: 9, xpRequired: 8000, maxSwapSize: 9000, dailyCap: 45000 },
    { level: 10, xpRequired: 11000, maxSwapSize: 10000, dailyCap: 50000 },
  ];

  constructor(db: IDatabase<any>, riskEngine: RiskEngineService) {
    this.db = db;
    this.riskEngine = riskEngine;
  }

  /**
   * Get or create player profile
   */
  async getOrCreatePlayer(telegramId: bigint, userId: string): Promise<PlayerProfile> {
    let player = await this.db.oneOrNone(
      `SELECT * FROM arena_players WHERE telegram_id = $1`,
      [telegramId],
    );

    if (!player) {
      // Create new player
      player = await this.db.one(
        `INSERT INTO arena_players (user_id, telegram_id, username)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, telegramId, ""],
      );
    }

    return player;
  }

  /**
   * Get player profile by user ID
   */
  async getPlayerByUserId(userId: string): Promise<PlayerProfile | null> {
    return await this.db.oneOrNone(
      `SELECT * FROM arena_players WHERE user_id = $1`,
      [userId],
    );
  }

  /**
   * Update player username
   */
  async updatePlayerUsername(playerId: string, username: string): Promise<void> {
    await this.db.none(
      `UPDATE arena_players SET username = $2, updated_at = NOW()
       WHERE id = $1`,
      [playerId, username],
    );
  }

  /**
   * Get game session for a conversion
   */
  async getGameSession(conversionId: string): Promise<GameSession | null> {
    const result = await this.db.oneOrNone(
      `SELECT
         c.id as match_id,
         c.id as conversion_id,
         c.status as state,
         c.rate_lock_expires_at as rate_lock_expires_at,
         c.opponent_type,
         c.opponent_name,
         c.created_at as start_time,
         c.updated_at
       FROM conversions c
       WHERE c.id = $1`,
      [conversionId],
    );

    if (!result) {
      return null;
    }

    return {
      matchId: result.match_id,
      conversionId: result.conversion_id,
      state: this.mapConversionStatusToMatchState(result.state),
      rateLockExpiresAt: result.rate_lock_expires_at,
      opponent: {
        type: result.opponent_type as LiquiditySourceType,
        name: result.opponent_name || "Unknown",
      },
      progress: this.calculateProgress(result.state, result.created_at, result.updated_at),
      startTime: result.start_time,
      estimatedCompletion: this.estimateCompletion(result.state, result.created_at),
    };
  }

  /**
   * Create a new match (conversion)
   */
  async createMatch(
    request: MatchRequest,
    opponent: OpponentInfo,
    rate: number,
    rateLockDuration: number,
  ): Promise<GameSession> {
    // Check risk limits
    const riskCheck = await this.riskEngine.checkSwapLimits(
      request.userId,
      request.starsAmount,
      request.starsAmount * rate,
    );

    if (!riskCheck.allowed) {
      throw new Error(riskCheck.reason || "Risk limit exceeded");
    }

    // Create conversion record
    const conversion = await this.db.one(
      `INSERT INTO conversions
         (user_id, source_amount, source_currency, target_currency, rate, status,
          rate_lock_expires_at, opponent_type, opponent_name)
       VALUES ($1, $2, 'STARS', $3, $4, 'rate_locked',
          NOW() + ($5 * interval '1 second'), $6, $7)
       RETURNING *`,
      [
        request.userId,
        request.starsAmount,
        request.targetCurrency,
        rate,
        rateLockDuration,
        opponent.type,
        opponent.name,
      ],
    );

    // Get player
    // Create game session
    const session: GameSession = {
      matchId: conversion.id,
      conversionId: conversion.id,
      state: MatchState.RATE_LOCKED,
      rateLockExpiresAt: new Date(
        Date.now() + rateLockDuration * 1000,
      ),
      opponent,
      progress: 0,
      startTime: conversion.created_at,
      estimatedCompletion: this.estimateCompletion(
        "rate_locked",
        conversion.created_at,
      ),
    };

    return session;
  }

  /**
   * Update match state
   */
  async updateMatchState(
    conversionId: string,
    newState: MatchState,
  ): Promise<void> {
    await this.db.none(
      `UPDATE conversions SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [newState, conversionId],
    );
  }

  /**
   * Complete match and award XP
   */
  async completeMatch(
    conversionId: string,
    playerId: string,
    starsAmount: number,
    tonAmount: number,
  ): Promise<{ xpEarned: number; levelUp: boolean; newLevel?: number }> {
    const player = await this.db.one(
      `SELECT * FROM arena_players WHERE id = $1`,
      [playerId],
    );

    // Calculate XP rewards
    const xpEarned = await this.calculateXPRewards(player, conversionId, starsAmount);

    // Update player stats
    const newTotalXp = BigInt(player.xp) + BigInt(xpEarned.total);
    const newLevel = this.calculateLevel(newTotalXp);
    const levelUp = newLevel > player.level;

    // Check streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastMatchDate = player.updated_at < today ? player.updated_at : new Date();
    const hoursSinceLastMatch =
      (Date.now() - lastMatchDate.getTime()) / (1000 * 60 * 60);
    const streakReset = hoursSinceLastMatch > 24;

    const newStreak = streakReset ? 1 : player.streak_current + 1;
    const newBestStreak = Math.max(player.streak_best, newStreak);

    // Update player
    await this.db.none(
      `UPDATE arena_players SET
         xp = $1,
         level = $2,
         streak_current = $3,
         streak_best = $4,
         matches_completed = matches_completed + 1,
         volume_stars = volume_stars + $5,
         volume_ton = volume_ton + $6,
         updated_at = NOW()
       WHERE id = $7`,
      [
        newTotalXp,
        newLevel,
        newStreak,
        newBestStreak,
        starsAmount,
        tonAmount,
        playerId,
      ],
    );

    // Update conversion with XP earned
    await this.db.none(
      `UPDATE conversions SET
         arena_xp_earned = $1,
         status = 'completed',
         completed_at = NOW()
       WHERE id = $2`,
      [xpEarned.total, conversionId],
    );

    return {
      xpEarned: xpEarned.total,
      levelUp,
      newLevel: levelUp ? newLevel : undefined,
    };
  }

  /**
   * Calculate XP rewards for a match
   */
  private async calculateXPRewards(
    player: any,
    conversionId: string,
    starsAmount: number,
  ): Promise<{ total: number; breakdown: Array<{ reason: string; xp: number }> }> {
    const breakdown: Array<{ reason: string; xp: number }> = [];
    let total = 0;

    // Base XP for swap
    const isFirstSwap = player.matches_completed === 0;
    if (isFirstSwap) {
      breakdown.push({ reason: XPRewardReason.FIRST_SWAP, xp: this.xpConfig.firstSwap });
      total += this.xpConfig.firstSwap;
    }

    breakdown.push({ reason: XPRewardReason.MATCH_COMPLETED, xp: this.xpConfig.baseSwap });
    total += this.xpConfig.baseSwap;

    // Volume bonus
    const volumeBonus = Math.floor((starsAmount / 1000) * this.xpConfig.volumeBonus);
    if (volumeBonus > 0) {
      breakdown.push({ reason: XPRewardReason.VOLUME_BONUS, xp: volumeBonus });
      total += volumeBonus;
    }

    // Streak bonus
    if (player.streak_current > 0) {
      const streakBonus = Math.floor(
        player.streak_current * this.xpConfig.streakMultiplier * 10,
      );
      breakdown.push({ reason: XPRewardReason.STREAK_BONUS, xp: streakBonus });
      total += streakBonus;
    }

    // Daily bonus
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySwaps = await this.db.oneOrNone(
      `SELECT COUNT(*) as count
       FROM conversions c
       JOIN arena_players p ON c.user_id = p.user_id
       WHERE p.id = $1
         AND c.status = 'completed'
         AND c.completed_at >= $2`,
      [player.id, today],
    );

    if (
      todaySwaps &&
      parseInt(todaySwaps.count) === this.xpConfig.dailyBonusThreshold
    ) {
      breakdown.push({ reason: XPRewardReason.DAILY_BONUS, xp: this.xpConfig.dailyBonus });
      total += this.xpConfig.dailyBonus;
    }

    // Log XP rewards
    for (const entry of breakdown) {
      await this.db.none(
        `INSERT INTO arena_xp_rewards (player_id, conversion_id, xp_earned, reason)
         VALUES ($1, $2, $3, $4)`,
        [player.id, conversionId, entry.xp, entry.reason],
      );
    }

    return { total, breakdown };
  }

  /**
   * Calculate level from XP
   */
  private calculateLevel(xp: bigint): number {
    for (let i = this.levelConfigs.length - 1; i >= 0; i--) {
      if (xp >= BigInt(this.levelConfigs[i].xpRequired)) {
        return this.levelConfigs[i].level;
      }
    }
    return 1;
  }

  /**
   * Get level configuration for a level
   */
  getLevelConfig(level: number): LevelConfig | undefined {
    return this.levelConfigs.find((c) => c.level === level);
  }

  /**
   * Get player stats summary
   */
  async getPlayerStats(playerId: string): Promise<PlayerStatsSummary> {
    const player = await this.db.one(
      `SELECT * FROM arena_players WHERE id = $1`,
      [playerId],
    );

    const stats = await this.db.one(
      `SELECT
         COUNT(*) as total_swaps,
         COALESCE(SUM(source_amount), 0) as total_volume_stars,
         COALESCE(SUM(target_amount), 0) as total_volume_ton,
         COALESCE(AVG(source_amount), 0) as avg_swap_size,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_swaps
       FROM conversions
       WHERE user_id = $1`,
      [player.user_id],
    );

    const badgesEarned = await this.db.one(
      `SELECT COUNT(*) as count FROM arena_player_badges WHERE player_id = $1`,
      [playerId],
    );

    const successRate =
      stats.total_swaps > 0
        ? (stats.successful_swaps / stats.total_swaps) * 100
        : 0;

    const levelConfig = this.getLevelConfig(player.level);
    const nextLevelConfig = this.getLevelConfig(player.level + 1);

    const progressToNextLevel = nextLevelConfig
      ? Number(
          (BigInt(player.xp) - BigInt(levelConfig!.xpRequired)) *
            100n /
            (BigInt(nextLevelConfig.xpRequired) - BigInt(levelConfig!.xpRequired)),
        )
      : 100;

    return {
      totalSwaps: parseInt(stats.total_swaps),
      totalVolumeStars: parseInt(stats.total_volume_stars),
      totalVolumeTon: parseFloat(stats.total_volume_ton),
      averageSwapSize: parseFloat(stats.avg_swap_size),
      successRate,
      bestStreak: player.streak_best,
      currentStreak: player.streak_current,
      badgesEarned: parseInt(badgesEarned.count),
      totalXp: player.xp,
      level: player.level,
      nextLevelXp: nextLevelConfig?.xpRequired || 0,
      progressToNextLevel: parseFloat(progressToNextLevel.toString()),
    };
  }

  /**
   * Get swap history for player
   */
  async getSwapHistory(
    playerId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<SwapHistoryEntry[]> {
    const results = await this.db.manyOrNone(
      `SELECT
         c.id,
         c.source_amount as stars_amount,
         c.target_amount as ton_amount,
         c.rate,
         c.status,
         c.opponent_type,
         c.opponent_name,
         c.arena_xp_earned as xp_earned,
         c.created_at,
         c.completed_at
       FROM conversions c
       WHERE c.user_id = (SELECT user_id FROM arena_players WHERE id = $1)
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [playerId, limit, offset],
    );

    return (
      results?.map((r) => ({
        id: r.id,
        starsAmount: parseInt(r.stars_amount),
        tonAmount: parseFloat(r.ton_amount),
        rate: parseFloat(r.rate),
        status: r.status,
        opponent: {
          type: r.opponent_type as LiquiditySourceType,
          name: r.opponent_name || "Unknown",
        },
        xpEarned: r.xp_earned || 0,
        createdAt: r.created_at,
        completedAt: r.completed_at,
      })) || []
    );
  }

  /**
   * Get daily challenges for player
   */
  async getDailyChallenges(playerId: string): Promise<DailyChallenge[]> {
    const challenges: DailyChallenge[] = [];

    // Swaps challenge
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySwaps = await this.db.oneOrNone(
      `SELECT COUNT(*) as count
       FROM conversions c
       JOIN arena_players p ON c.user_id = p.user_id
       WHERE p.id = $1
         AND c.status = 'completed'
         AND c.completed_at >= $2`,
      [playerId, today],
    );

    challenges.push({
      id: "swaps",
      type: "swaps",
      description: "Complete 5 swaps today",
      target: 5,
      current: parseInt(todaySwaps?.count || "0"),
      xpReward: this.xpConfig.dailyBonus,
      expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      completed: parseInt(todaySwaps?.count || "0") >= 5,
    });

    // Volume challenge
    const volumeStats = await this.db.oneOrNone(
      `SELECT COALESCE(SUM(source_amount), 0) as total
       FROM conversions c
       JOIN arena_players p ON c.user_id = p.user_id
       WHERE p.id = $1
         AND c.status = 'completed'
         AND c.completed_at >= $2`,
      [playerId, today],
    );

    challenges.push({
      id: "volume",
      type: "volume",
      description: "Swap 10,000 Stars today",
      target: 10000,
      current: parseInt(volumeStats?.total || "0"),
      xpReward: 50,
      expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      completed: parseInt(volumeStats?.total || "0") >= 10000,
    });

    return challenges;
  }

  /**
   * Map conversion status to match state
   */
  private mapConversionStatusToMatchState(
    status: string,
  ): MatchState {
    const mapping: Record<string, MatchState> = {
      pending: MatchState.SEARCHING,
      rate_locked: MatchState.RATE_LOCKED,
      awaiting_ton: MatchState.AWAITING_TON,
      ton_pending: MatchState.CONFIRMING,
      ton_confirmed: MatchState.CONFIRMING,
      converting: MatchState.CONFIRMING,
      completed: MatchState.COMPLETED,
      failed: MatchState.FAILED,
      cancelled: MatchState.CANCELLED,
    };

    return mapping[status] || MatchState.SEARCHING;
  }

  /**
   * Calculate progress percentage for match
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private calculateProgress(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    status: string,
    createdAt: Date,
    updatedAt: Date,
  ): number {
    const state = this.mapConversionStatusToMatchState(status);

    switch (state) {
      case MatchState.SEARCHING:
        return 10;
      case MatchState.RATE_LOCKED:
        return 20;
      case MatchState.AWAITING_TON:
        return 40;
      case MatchState.CONFIRMING:
        return 70;
      case MatchState.COMPLETED:
        return 100;
      default:
        return 0;
    }
  }

  /**
   * Estimate completion time for match
   */
  private estimateCompletion(_status: string, _createdAt: Date): Date {
    const state = this.mapConversionStatusToMatchState(status);

    // Estimated times per state (in seconds)
    const estimatedTimes: Record<MatchState, number> = {
      [MatchState.SEARCHING]: 10,
      [MatchState.RATE_LOCKED]: 300, // 5 minutes
      [MatchState.AWAITING_TON]: 120, // 2 minutes average
      [MatchState.CONFIRMING]: 60, // 1 minute
      [MatchState.COMPLETED]: 0,
      [MatchState.FAILED]: 0,
      [MatchState.CANCELLED]: 0,
    };

    const remainingTime = estimatedTimes[state] || 0;
    return new Date(_createdAt.getTime() + remainingTime * 1000);
  }
}

interface LevelConfig {
  level: number;
  xpRequired: number;
  maxSwapSize: number;
  dailyCap: number;
}

export default ArenaGameService;
