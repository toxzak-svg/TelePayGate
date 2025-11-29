#!/usr/bin/env bash
set -euo pipefail

# Simple smoke-check script used by dev-up to ensure the API is reachable
# Usage: scripts/dashboard-smoke.sh [url=<default http://localhost:3000/health>] [timeout=60]

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
