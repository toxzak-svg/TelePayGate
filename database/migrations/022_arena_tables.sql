-- Migration: 022_arena_tables.sql
-- Stars Arena: Gamification tables for player profiles, XP, badges, and leaderboards
BEGIN;

-- Player profiles
CREATE TABLE IF NOT EXISTS arena_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  telegram_id bigint NOT NULL,
  username TEXT,
  xp bigint DEFAULT 0,
  level int DEFAULT 1,
  streak_current int DEFAULT 0,
  streak_best int DEFAULT 0,
  matches_completed bigint DEFAULT 0,
  volume_stars bigint DEFAULT 0,
  volume_ton numeric(30,18) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- XP rewards log
CREATE TABLE IF NOT EXISTS arena_xp_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES arena_players(id) ON DELETE CASCADE,
  conversion_id uuid REFERENCES conversions(id) ON DELETE SET NULL,
  xp_earned int NOT NULL,
  reason TEXT NOT NULL, -- 'match_completed', 'streak_bonus', 'first_swap', 'daily_bonus', 'volume_bonus'
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Badges/achievements
CREATE TABLE IF NOT EXISTS arena_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  xp_reward int DEFAULT 0,
  requirement_type TEXT, -- 'swaps', 'volume', 'streak', 'speed', 'dex_route'
  requirement_value int,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Player's earned badges
CREATE TABLE IF NOT EXISTS arena_player_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES arena_players(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES arena_badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, badge_id)
);

-- Leaderboard snapshots
CREATE TABLE IF NOT EXISTS arena_leaderboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES arena_players(id) ON DELETE CASCADE,
  rank int NOT NULL,
  xp bigint NOT NULL,
  level int NOT NULL,
  matches_completed bigint NOT NULL,
  volume_stars bigint NOT NULL,
  snapshot_type TEXT NOT NULL, -- 'daily', 'weekly', 'all_time'
  snapshot_date timestamptz NOT NULL DEFAULT NOW()
);

-- Friend relationships
CREATE TABLE IF NOT EXISTS arena_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES arena_players(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES arena_players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (player_id != friend_id)
);

-- Referral tracking
CREATE TABLE IF NOT EXISTS arena_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES arena_players(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES arena_players(id) ON DELETE CASCADE,
  bonus_xp int DEFAULT 50,
  claimed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  claimed_at timestamptz,
  UNIQUE(referrer_id, referred_id)
);

-- Arena treasury tracking
CREATE TABLE IF NOT EXISTS arena_treasury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  balance_ton numeric(30,18) NOT NULL,
  balance_usd numeric(30,18) NOT NULL,
  last_updated timestamptz NOT NULL DEFAULT NOW()
);

-- Risk metrics tracking
CREATE TABLE IF NOT EXISTS risk_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'daily_volume', 'pending_exposure', 'swap_count', 'daily_swaps'
  metric_value numeric NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Risk limits (configurable per user or global)
CREATE TABLE IF NOT EXISTS risk_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES users(id) ON DELETE CASCADE, -- NULL = global default
  limit_type TEXT NOT NULL, -- 'max_swap_size', 'daily_cap', 'max_pending', 'max_swap_ton'
  limit_value numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Add columns to conversions table for arena integration
ALTER TABLE conversions
ADD COLUMN IF NOT EXISTS match_id uuid REFERENCES arena_players(id),
ADD COLUMN IF NOT EXISTS opponent_type TEXT, -- 'user', 'pool', 'dex', 'treasury'
ADD COLUMN IF NOT EXISTS opponent_name TEXT,
ADD COLUMN IF NOT EXISTS arena_xp_earned int DEFAULT 0;

-- Add telegram_id to users table for mini-app linking
ALTER TABLE users
ADD COLUMN IF NOT EXISTS telegram_id bigint UNIQUE;

-- Indexes for arena_players
CREATE INDEX IF NOT EXISTS idx_arena_players_user_id ON arena_players(user_id);
CREATE INDEX IF NOT EXISTS idx_arena_players_telegram_id ON arena_players(telegram_id);
CREATE INDEX IF NOT EXISTS idx_arena_players_xp ON arena_players(xp DESC);
CREATE INDEX IF NOT EXISTS idx_arena_players_level ON arena_players(level DESC);

-- Indexes for arena_xp_rewards
CREATE INDEX IF NOT EXISTS idx_arena_xp_rewards_player_id ON arena_xp_rewards(player_id);
CREATE INDEX IF NOT EXISTS idx_arena_xp_rewards_conversion_id ON arena_xp_rewards(conversion_id);
CREATE INDEX IF NOT EXISTS idx_arena_xp_rewards_created_at ON arena_xp_rewards(created_at DESC);

-- Indexes for arena_player_badges
CREATE INDEX IF NOT EXISTS idx_arena_player_badges_player_id ON arena_player_badges(player_id);
CREATE INDEX IF NOT EXISTS idx_arena_player_badges_badge_id ON arena_player_badges(badge_id);

-- Indexes for arena_leaderboard_snapshots
CREATE INDEX IF NOT EXISTS idx_arena_leaderboard_snapshots_type_date ON arena_leaderboard_snapshots(snapshot_type, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_arena_leaderboard_snapshots_player_id ON arena_leaderboard_snapshots(player_id);

-- Indexes for arena_friends
CREATE INDEX IF NOT EXISTS idx_arena_friends_player_id ON arena_friends(player_id);
CREATE INDEX IF NOT EXISTS idx_arena_friends_friend_id ON arena_friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_arena_friends_status ON arena_friends(status);

-- Indexes for arena_referrals
CREATE INDEX IF NOT EXISTS idx_arena_referrals_referrer_id ON arena_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_arena_referrals_referred_id ON arena_referrals(referred_id);

-- Indexes for risk_metrics
CREATE INDEX IF NOT EXISTS idx_risk_metrics_user_id ON risk_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_type_window ON risk_metrics(metric_type, window_start, window_end);

-- Indexes for risk_limits
CREATE INDEX IF NOT EXISTS idx_risk_limits_user_id ON risk_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_limits_type_active ON risk_limits(limit_type, is_active);

-- Indexes for conversions (new columns)
CREATE INDEX IF NOT EXISTS idx_conversions_match_id ON conversions(match_id);

COMMIT;
