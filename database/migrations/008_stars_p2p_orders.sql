-- 007_stars_p2p_orders.sql

-- Table: stars_orders
CREATE TABLE IF NOT EXISTS stars_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sell','buy')),
  stars_amount bigint NULL,
  ton_amount numeric(30,18) NULL,
  rate numeric(30,18) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, locked, matched, completed, failed, cancelled
  locked_until timestamptz NULL,
  counter_order_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  completed_at timestamptz NULL,
  telegram_escrow_tx text NULL,
  ton_wallet_tx text NULL
);

-- Table: atomic_swaps
CREATE TABLE IF NOT EXISTS atomic_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sell_order_id uuid NOT NULL REFERENCES stars_orders(id) ON DELETE CASCADE,
  buy_order_id uuid NOT NULL REFERENCES stars_orders(id) ON DELETE CASCADE,
  smart_contract_address text NULL,
  ton_tx_hash text NULL,
  telegram_tx_id text NULL,
  status TEXT NOT NULL DEFAULT 'initiated', -- initiated, in_progress, completed, failed
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes to help matching queries
CREATE INDEX IF NOT EXISTS idx_stars_orders_status_type_rate ON stars_orders(status, type, rate);
CREATE INDEX IF NOT EXISTS idx_atomic_swaps_status ON atomic_swaps(status);
