#!/usr/bin/env bash
set -euo pipefail

# Run API package tests with Jest --detectOpenHandles and (optionally) Testcontainers
# Usage:
# USE_TESTCONTAINERS=true ./scripts/test-detect-open-handles.sh

echo "[test-debug] USE_TESTCONTAINERS=${USE_TESTCONTAINERS:-false}"

# Run a focused set of tests that tend to use DB and long-running timers
npm --workspace=@tg-payment/api run test -- src/__tests__/integration/auth.flow.test.ts src/__tests__/auth.passwordless.test.ts src/__tests__/integration/payments.webhook.test.ts -- --runInBand --detectOpenHandles
