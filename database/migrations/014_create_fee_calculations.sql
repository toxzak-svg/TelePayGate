CREATE TABLE IF NOT EXISTS fee_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id),
    stars_amount INTEGER NOT NULL,
    fiat_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    platform_fee NUMERIC(10, 4) NOT NULL,
    telegram_fee NUMERIC(10, 4) NOT NULL,
    ton_fee NUMERIC(10, 4) NOT NULL,
    exchange_fee NUMERIC(10, 4) NOT NULL,
    total_fee NUMERIC(10, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
