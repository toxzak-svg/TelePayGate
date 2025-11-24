# Passwordless Authentication (Magic Link, TOTP, Backup Codes)

This document describes the passwordless authentication flows implemented in the repository, how tests are structured, and how to run both isolated and integration tests locally.

## Overview

- Magic link: issue a JWT token via email (or returned in non-prod/test mode); the token verifies and sets a session cookie + CSRF cookie.
- TOTP: enable/confirm flow for 2FA (generate provisioning secret and backup codes).
- Backup codes: generated during TOTP enable/confirm and stored server-side.

## Environment variables

- `FEATURE_PASSWORDLESS_AUTH=true` — enable passwordless endpoints.
- `JWT_SECRET` — secret used to sign magic link tokens in dev/test.
- `EXPOSE_TEST_TOKENS=true` — when set, controller responses include the raw magic token in JSON (ONLY for tests/dev).
- `USE_TESTCONTAINERS=true` — when set during tests, selected tests will start a disposable Postgres container via Testcontainers.

## Tests

There are two complementary approaches in the test suite:

1. **Isolated tests (fast)**
   - Use lightweight in-test stubs to avoid external dependencies (SMTP, DB) for quick iteration.
   - Files: `packages/api/src/__tests__/auth.passwordless.test.ts` and stubs under `packages/api/src/__tests__/stubs/`.
   - These run by default and are suitable for local dev and CI without Docker.

2. **Fixture-based integration tests (optional)**
   - Use Testcontainers to spin up a disposable Postgres instance and run migrations, providing full end-to-end coverage.
   - Enable by setting `USE_TESTCONTAINERS=true` in your environment before running tests.
   - The test `packages/api/src/__tests__/auth.magic-link.test.ts` demonstrates conditional usage of this fixture.

## Running tests locally

- Run all workspace tests (default - uses prepared DB script):

```bash
npm run test --workspaces
```

- Run API package tests only:

```bash
npm --workspace=@tg-payment/api run test
```

- Run a specific test file (isolated):

```bash
npm --workspace=@tg-payment/api run test -- src/__tests__/auth.passwordless.test.ts -i
```

- Run the `auth.magic-link.test.ts` using Testcontainers (requires Docker):

```bash
USE_TESTCONTAINERS=true npm --workspace=@tg-payment/api run test -- src/__tests__/auth.magic-link.test.ts -i
```

## CI

A GitHub Actions workflow `.github/workflows/ci.yml` was added to run the workspace tests on `push` and `pull_request` to `main`. It uses a Postgres service but does not require Docker-in-Docker.

## Security note

- `EXPOSE_TEST_TOKENS=true` should only be used in local development or isolated CI jobs. Do NOT enable it in public CI logs or production.

## Next steps

- Replace in-test stubs with fixture-backed tests across the suite (when comfortable with required Docker/Testcontainers).
- Add a dedicated CI job that runs the Testcontainers-backed suite on a self-hosted runner with Docker, if full e2e coverage is required.

Contact: repo maintainer for questions about enabling full fixture-backed tests in CI.
