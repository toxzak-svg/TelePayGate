#!/usr/bin/env bash
set -euo pipefail

# wait-for-services.sh -- waits until DB (5432), Redis (6379) and API (/health) are available
# Designed for local dev use after `docker compose up -d`.

HOST=localhost
DB_PORT=5432
REDIS_PORT=6379
API_URL=http://localhost:3000/health
TIMEOUT=120
SLEEP=2

start=$(date +%s)

echo "Waiting for services to be ready (timeout ${TIMEOUT}s)..."

# helper to check tcp port
check_port() {
  host=$1
  port=$2
  if command -v nc >/dev/null 2>&1; then
    nc -z "$host" "$port" >/dev/null 2>&1
  else
    (echo > /dev/tcp/$host/$port) >/dev/null 2>&1
  fi
}

# Check DB
while true; do
  if check_port "$HOST" "$DB_PORT"; then
    echo "Postgres is reachable on ${HOST}:${DB_PORT}"
    break
  fi
  elapsed=$(( $(date +%s) - start ))
  if [ $elapsed -ge $TIMEOUT ]; then
    echo "Timed out waiting for Postgres (${DB_PORT})" >&2
    exit 1
  fi
  sleep $SLEEP
done

# Check Redis
while true; do
  if check_port "$HOST" "$REDIS_PORT"; then
    echo "Redis is reachable on ${HOST}:${REDIS_PORT}"
    break
  fi
  elapsed=$(( $(date +%s) - start ))
  if [ $elapsed -ge $TIMEOUT ]; then
    echo "Timed out waiting for Redis (${REDIS_PORT})" >&2
    exit 1
  fi
  sleep $SLEEP
done

# Check API health endpoint
while true; do
  if curl -fsS "$API_URL" >/dev/null 2>&1; then
    echo "API health endpoint returned OK"
    break
  fi
  elapsed=$(( $(date +%s) - start ))
  if [ $elapsed -ge $TIMEOUT ]; then
    echo "Timed out waiting for API to respond at ${API_URL}" >&2
    exit 1
  fi
  sleep $SLEEP
done

echo "All services appear healthy."
exit 0
