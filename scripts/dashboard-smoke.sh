#!/usr/bin/env bash
set -euo pipefail

# Simple smoke-check script for local dev flows.
# Polls a health endpoint until it returns success or times out.

URL=${1:-${API_HEALTH_CHECK_URL:-http://localhost:3000/health}}
TIMEOUT=${2:-60}
INTERVAL=${3:-1}

echo "Smoke-check: polling $URL for up to ${TIMEOUT}s..."
for i in $(seq 1 $TIMEOUT); do
  if curl -fsS --max-time 2 "$URL" >/dev/null 2>&1; then
    echo "OK: $URL returned success"
    exit 0
  fi
  sleep $INTERVAL
done

echo "ERROR: $URL didn't respond successfully within ${TIMEOUT}s" >&2
exit 1
