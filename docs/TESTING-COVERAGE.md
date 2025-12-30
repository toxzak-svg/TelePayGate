# Running Tests & Coverage

This document explains how to run package tests and collect coverage reports locally and in CI.

Local setup

- Install dependencies:

```bash
npm install
```

- Run per-package coverage (examples):

```bash
# SDK (Jest)
npm run -w telepaygate-sdk test:coverage

# Dashboard (Vitest)
npm run -w @tg-payment/dashboard test -- --coverage

# Core (Jest) - requires Postgres and migrations
PGPASSWORD=tg_pass createdb -U tg_user -h localhost -p 5432 telepaygate_test || true
DATABASE_URL=postgresql://tg_user:tg_pass@localhost:5432/telepaygate_test node database/migrate.cjs reset
npm run -w telepaygate-core test:coverage

# API (Jest) - requires Postgres
npm run -w telepaygate-api test -- --coverage
```

Merge LCOV files

After running per-package coverage, merge LCOV files into a single `coverage/lcov.info` file:

```bash
npx lcov-result-merger './packages/**/coverage/lcov.info' > coverage/lcov.info
```

CI

We added a GitHub Actions workflow at `.github/workflows/ci-coverage.yml` which:

- Installs dependencies with `npm ci`.
- Starts a Postgres service and runs migrations.
- Runs per-package coverage commands.
- Merges LCOV files and uploads the merged `lcov.info` as an artifact.

Coverage thresholds

- The repository uses a centralized base Jest config `jest.base.config.cjs`. The default global threshold is controlled by the `JEST_COVERAGE_THRESHOLD` environment variable. CI sets it to `70`.

Incremental approach

- To avoid failing CI while improving tests, the default threshold may be kept conservative locally. Raise `JEST_COVERAGE_THRESHOLD` in CI once you add tests to reach the target.
