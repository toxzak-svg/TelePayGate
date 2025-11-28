# CI & Deployment Secrets

This file documents the repository secrets used by CI workflows and deployment scripts, why they're needed, and recommended settings.

## Required secrets for CI
- DATABASE_URL — PostgreSQL connection string used by the CI test job (e.g. postgresql://postgres:postgres@localhost:5432/postgres). If this is not set in `main` runs, the CI will fail early.

## Optional/semi-required
- POSTGRES_USER — username for Postgres service (default: `postgres`)
- POSTGRES_PASSWORD — password for Postgres service (default: `postgres`)
- POSTGRES_DB — database name (default: `postgres`)

## Security & Notes
- Do NOT expose secrets to forks or unauthenticated pull requests. GitHub automatically hides secrets for pull requests from forks.
- When running CI locally or on self-hosted runners, ensure your `.env.test` is configured and not committed to source control.
- For deployment, use your cloud host's secret storage (Render, Railway, Vercel) or GitHub repository secrets for production credentials.

## Quick setup (GitHub Actions)
1. Go to repository Settings → Secrets → Actions
2. Add `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
3. On the `main` branch the CI `validate-secrets` job will verify `DATABASE_URL` and warn about missing Postgres user/password.

## Troubleshooting
- If CI fails due to database connection errors, confirm the `DATABASE_URL` matches the Postgres service credentials in the workflow (change service env or secret values to match).

## Install local git hooks (recommended)

This repo ships a lightweight pre-commit secret scanner to reduce accidental commits of secrets. To install the hooks locally run:

```bash
# from repo root
npm run prepare
# or install just the hooks
bash scripts/install-git-hooks.sh
```

The pre-commit hook will run `scripts/pre-commit-secret-scan.sh` and abort commits when likely secrets are found.
