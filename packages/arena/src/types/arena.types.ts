/**
 * Arena Types
 *
 * Type definitions for Stars Arena gamification system
 */

/**
 * Match states in the game loop
 */
export enum MatchState {
  SEARCHING = "searching", // Finding best rate
  RATE_LOCKED = "rate_locked", // 5-minute countdown
  AWAITING_TON = "awaiting_ton", // Waiting for TON deposit
  CONFIRMING = "confirming", // Blockchain confirmations
  COMPLETED = "completed", // Success!
  FAILED = "failed", // Error state
  CANCELLED = "cancelled", // User cancelled
}

/**
 * Liquidity source types
 */
export enum LiquiditySourceType {
  USER = "user", // P2P user-to-user
  POOL = "pool", // P2P order book
  DEX = "dex", // DeDust or Ston.fi
  TREASURY = "treasury", // Operator liquidity
  NITRO = "nitro", // Nitro aggregator
}

/**
 * Liquidity source information
 */
export interface LiquiditySource {
  type: LiquiditySourceType;
  provider?: "dedust" | "stonfi" | "nitro";
  rate: number;
  liquidity: number;
  fee: number;
  executionTime: number; // seconds
}

/**
 * Conversion route with gamified opponent info
 */
export interface ConversionRoute {
  sources: LiquiditySource[];
  totalRate: number;
  totalFee: number;
  estimatedTime: number;
  confidence: number; // 0-1 score
  opponent: OpponentInfo;
}

/**
 * Opponent information for gamification
 */
export interface OpponentInfo {
  type: LiquiditySourceType;
  name: string; // "Whale #23", "DeDust Pro Pool"
  avatar?: string;
  volume?: number; // Total volume for P2P users
  trustScore?: number; // 0-100 based on history
}

/**
 * Match request from user
 */
export interface MatchRequest {
  userId: string;
  starsAmount: number;
  targetCurrency: string;
  preferredOpponent?: LiquiditySourceType;
}

/**
 * Match result with game context
 */
export interface MatchResult {
  matchId: string;
  opponent: OpponentInfo;
  rate: number;
  estimatedTime: number;
  confidence: number;
  route: LiquiditySource[];
  rateLockExpiresAt: Date;
}

/**
 * Game session for active match
 */
export interface GameSession {
  matchId: string;
  conversionId: string;
  state: MatchState;
  rateLockExpiresAt: Date;
  opponent: OpponentInfo;
  progress: number; // 0-100
  startTime: Date;
  estimatedCompletion: Date;
}

/**
 * Player profile
 */
export interface PlayerProfile {
  id: string;
  userId: string;
  telegramId: bigint;
  username?: string;
  xp: bigint;
  level: number;
  streakCurrent: number;
  streakBest: number;
  matchesCompleted: bigint;
  volumeStars: bigint;
  volumeTon: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * XP reward configuration
 */
export interface XPRewardConfig {
  baseSwap: number; // XP per successful swap
  volumeBonus: number; // XP per 1000 Stars
  streakMultiplier: number; // Additional XP per streak level
  firstSwap: number; // Bonus for first swap
  dailyBonus: number; // Bonus for 5 swaps in a day
}

/**
 * Level configuration
 */
export interface LevelConfig {
  level: number;
  xpRequired: number;
  maxSwapSize: number; // Stars
  dailyCap: number; // Stars
  badgeUnlock?: string; // Badge unlocked at this level
}

/**
 * XP reward log entry
 */
export interface XPReward {
  id: string;
  playerId: string;
  conversionId?: string;
  xpEarned: number;
  reason: XPRewardReason;
  createdAt: Date;
}

/**
 * Reasons for XP rewards
 */
export enum XPRewardReason {
  MATCH_COMPLETED = "match_completed",
  STREAK_BONUS = "streak_bonus",
  FIRST_SWAP = "first_swap",
  DAILY_BONUS = "daily_bonus",
  VOLUME_BONUS = "volume_bonus",
  REFERRAL_BONUS = "referral_bonus",
  BADGE_BONUS = "badge_bonus",
}

/**
 * Badge/achievement definition
 */
export interface Badge {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  xpReward: number;
  requirementType?: BadgeRequirementType;
  requirementValue?: number;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Badge requirement types
 */
export enum BadgeRequirementType {
  SWAPS = "swaps",
  VOLUME = "volume",
  STREAK = "streak",
  SPEED = "speed",
  DEX_ROUTE = "dex_route",
  REFERRALS = "referrals",
}

/**
 * Player's earned badge
 */
export interface PlayerBadge {
  id: string;
  playerId: string;
  badgeId: string;
  earnedAt: Date;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  player: {
    id: string;
    username?: string;
    avatar?: string;
  };
  xp: bigint;
  level: number;
  matchesCompleted: bigint;
  volumeStars: bigint;
  streakCurrent: number;
}

/**
 * Leaderboard query parameters
 */
export interface LeaderboardQuery {
  type: "daily" | "weekly" | "all_time";
  limit?: number;
  offset?: number;
  friendsOnly?: boolean;
}

/**
 * Leaderboard snapshot
 */
export interface LeaderboardSnapshot {
  id: string;
  playerId: string;
  rank: number;
  xp: bigint;
  level: number;
  matchesCompleted: bigint;
  volumeStars: bigint;
  snapshotType: "daily" | "weekly" | "all_time";
  snapshotDate: Date;
}

/**
 * Friend relationship
 */
export interface Friend {
  id: string;
  playerId: string;
  friendId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Referral tracking
 */
export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  bonusXp: number;
  claimed: boolean;
  createdAt: Date;
  claimedAt?: Date;
}

/**
 * Treasury balance
 */
export interface TreasuryBalance {
  walletAddress: string;
  balanceTon: number;
  balanceUsd: number;
  lastUpdated: Date;
}

/**
 * Risk limits for user
 */
export interface RiskLimits {
  maxSwapSizeStars: number;
  maxSwapSizeTon: number;
  dailyCapStars: number;
  maxPendingConversions: number;
}

/**
 * Telegram WebApp init data
 */
export interface TelegramWebAppInitData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  };
  auth_date: number;
  hash: string;
  start_param?: string; // Referral code
}

/**
 * Arena join request
 */
export interface ArenaJoinRequest {
  initData: string;
  referralCode?: string;
}

/**
 * Arena join response
 */
export interface ArenaJoinResponse {
  player: PlayerProfile;
  isNewPlayer: boolean;
  referralBonus?: {
    xp: number;
    referrerUsername?: string;
  };
}

/**
 * Quote request with game context
 */
export interface ArenaQuoteRequest {
  starsAmount: number;
  targetCurrency: string;
  userId: string;
}

/**
 * Quote response with game context
 */
export interface ArenaQuoteResponse {
  quote: {
    starsAmount: number;
    targetAmount: number;
    rate: number;
    fees: {
      platform: number;
      dex: number;
      total: number;
    };
    validUntil: Date;
  };
  opponents: OpponentInfo[];
  bestOpponent: OpponentInfo;
  estimatedTime: number;
}

/**
 * Create match request
 */
export interface CreateMatchRequest {
  userId: string;
  starsAmount: number;
  targetCurrency: string;
  opponentType?: LiquiditySourceType;
  rateLockDuration?: number; // seconds
}

/**
 * Match status response
 */
export interface MatchStatusResponse {
  match: GameSession;
  conversionStatus?: string;
  tonDepositAddress?: string;
  tonDepositAmount?: number;
  confirmations?: number;
  requiredConfirmations?: number;
}

/**
 * Swap history entry with XP
 */
export interface SwapHistoryEntry {
  id: string;
  starsAmount: number;
  tonAmount: number;
  rate: number;
  status: string;
  opponent: OpponentInfo;
  xpEarned: number;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Daily challenge
 */
export interface DailyChallenge {
  id: string;
  type: "swaps" | "volume" | "streak" | "referrals";
  description: string;
  target: number;
  current: number;
  xpReward: number;
  expiresAt: Date;
  completed: boolean;
}

/**
 * Player stats summary
 */
export interface PlayerStatsSummary {
  totalSwaps: number;
  totalVolumeStars: number;
  totalVolumeTon: number;
  averageSwapSize: number;
  successRate: number;
  bestStreak: number;
  currentStreak: number;
  badgesEarned: number;
  totalXp: bigint;
  level: number;
  nextLevelXp: number;
  progressToNextLevel: number; // 0-100
}
