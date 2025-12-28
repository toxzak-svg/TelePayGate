-- Migration: 021_swap_logs.sql
BEGIN;
CREATE TABLE IF NOT EXISTS swap_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id TEXT NULL,
  provider TEXT NOT NULL,
  amount_in NUMERIC NOT NULL,
  amount_out NUMERIC NOT NULL,
  tx_hash TEXT NULL,
  gas_used NUMERIC NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_swap_logs_provider ON swap_logs(provider);
CREATE INDEX IF NOT EXISTS idx_swap_logs_tx ON swap_logs(tx_hash);
COMMIT;
