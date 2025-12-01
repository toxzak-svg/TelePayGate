-- Migration: 017_create_dashboard_users.sql
-- Adds `dashboard_users` table for admin/dashboard accounts

BEGIN;

CREATE TABLE IF NOT EXISTS dashboard_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NULL,
  role TEXT NOT NULL DEFAULT 'developer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_users_email ON dashboard_users(email);

COMMIT;

-- Note: dashboard users are separate from merchant `users` to keep payment auth
-- flows independent and permissionless.
