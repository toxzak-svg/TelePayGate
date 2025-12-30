# Running Tests in CI / Locally with Test Services

This repository contains unit and integration tests that rely on backing services (Postgres, Redis, MailHog) or optionally Testcontainers.

Recommended CI approach (already implemented):

- GitHub Actions workflow: `.github/workflows/ci-tests.yml` — starts Postgres + Redis as services, waits for readiness, runs DB migrations and the monorepo test matrix.

Local development options:

1) Docker Compose (fastest)

   Start test services:

   ```bash
   docker compose -f docker-compose.test.yml up -d
   # Wait a few seconds for DB to initialize then run tests
   DATABASE_URL=postgresql://tg_user:tg_pass@localhost:5432/telepaygate_test \
     REDIS_URL=redis://localhost:6379 \
     npm run test --workspaces --if-present
   ```

2) Testcontainers (Node) — tests can run themselves with USE_TESTCONTAINERS=true.

   Example environment (set before running of tests):

   ```bash
   export USE_TESTCONTAINERS=true
   export CI=true
   npm run test --workspaces --if-present
   ```

Notes & troubleshooting
- The repo contains `database/migrate.cjs` with a `reset` command that can be used non-interactively (CI safe).
- If you see redis connection errors during tests, ensure a Redis service is running and `REDIS_URL` points to it.
- If you need to run tests against Postgres you must ensure the database referenced by DATABASE_URL exists or allow the `test:prepare` script to create it (requires the `createdb` tool).
