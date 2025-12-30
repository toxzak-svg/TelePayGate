-- Migration: 020_nitro_swaps.sql
BEGIN;
CREATE TABLE IF NOT EXISTS nitro_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  reference_id TEXT NULL,
  from_token TEXT NOT NULL,
  to_token TEXT NOT NULL,
  amount_in NUMERIC NOT NULL,
  min_receive NUMERIC NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  tx_hash TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nitro_swaps_user ON nitro_swaps(user_id);
CREATE INDEX IF NOT EXISTS idx_nitro_swaps_tx ON nitro_swaps(tx_hash);
COMMIT;
