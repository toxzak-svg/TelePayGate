# Email & Password Authentication

This guide documents the minimal email/password onboarding implemented for dashboard users.

Endpoints (under `/api/v1/auth`):

- POST `/auth/register` — body: `{ email, password }` (password min length 8)
  - Creates or updates a `dashboard_users` record with a bcrypt-hashed`password_hash` and returns a session cookie.

- POST `/auth/login` — body: `{ email, password }`
  - Verifies the password and creates a session cookie on success.

Notes:
- Passwords are hashed with bcrypt for storage (`password_hash` column in `dashboard_users`).
- Sessions are managed by the existing `sessions` table and session cookie behavior mirrors the passwordless magic-link flow.
- For higher security consider:
  - Requiring password complexity and rate-limiting login attempts
  - Adding password reset flow and email verification
  - Enforcing 2FA (TOTP) for higher privilege roles
