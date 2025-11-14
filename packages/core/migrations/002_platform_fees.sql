-- Migration: Add platform fees tracking
-- Description: Create platform_fees table and platform_config table

-- Platform configuration table
CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_fee_percentage DECIMAL(10, 6) NOT NULL DEFAULT 0.05,
  fragment_fee_percentage DECIMAL(10, 6) NOT NULL DEFAULT 0.01,
  network_fee_percentage DECIMAL(10, 6) NOT NULL DEFAULT 0.005,
  platform_ton_wallet VARCHAR(255) NOT NULL,
  min_conversion_amount INTEGER NOT NULL DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform fees tracking table
CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id),
  conversion_id UUID REFERENCES conversions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  fee_type VARCHAR(50) NOT NULL DEFAULT 'platform',
  fee_percentage DECIMAL(10, 6) NOT NULL,
  fee_amount_stars DECIMAL(20, 2) NOT NULL DEFAULT 0,
  fee_amount_ton DECIMAL(20, 8) NOT NULL DEFAULT 0,
  fee_amount_usd DECIMAL(20, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  collection_tx_hash VARCHAR(255),
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure either payment_id or conversion_id is set, but not both
  CONSTRAINT check_fee_source CHECK (
    (payment_id IS NOT NULL AND conversion_id IS NULL) OR
    (payment_id IS NULL AND conversion_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_fees_payment_id ON platform_fees(payment_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_conversion_id ON platform_fees(conversion_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_user_id ON platform_fees(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_status ON platform_fees(status);
CREATE INDEX IF NOT EXISTS idx_platform_fees_created_at ON platform_fees(created_at);

-- Insert default platform configuration
INSERT INTO platform_config (
  platform_fee_percentage,
  fragment_fee_percentage,
  network_fee_percentage,
  platform_ton_wallet,
  min_conversion_amount,
  is_active
) VALUES (
  0.05,  -- 5% platform fee
  0.01,  -- 1% fragment fee
  0.005, -- 0.5% network fee
  'EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2', -- Platform TON wallet
  1000,  -- Minimum 1000 stars
  true
) ON CONFLICT DO NOTHING;
