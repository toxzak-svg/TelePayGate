
-- 012_update_atomic_swap_status.sql

ALTER TABLE atomic_swaps DROP CONSTRAINT IF EXISTS atomic_swaps_status_check;

ALTER TABLE atomic_swaps ADD CONSTRAINT atomic_swaps_status_check 
  CHECK (status IN ('pending', 'ton_locked', 'stars_locked', 'completed', 'refunded', 'failed', 'initiated', 'in_progress'));
