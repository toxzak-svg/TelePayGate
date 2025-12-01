-- Migration: 019_dashboard_users_passwords.sql
-- Adds password support (hash, reset tokens and metadata) to dashboard_users

BEGIN;

ALTER TABLE dashboard_users
  ADD COLUMN IF NOT EXISTS password_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS password_reset_token TEXT NULL,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMP WITH TIME ZONE NULL;

CREATE INDEX IF NOT EXISTS idx_dashboard_users_password_reset_token ON dashboard_users(password_reset_token);

COMMIT;
