-- Migration: 020_add_merchant_id_to_dashboard_users.sql
-- Links dashboard users to their merchant records

ALTER TABLE dashboard_users
ADD COLUMN merchant_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_dashboard_users_merchant_id ON dashboard_users(merchant_id);
