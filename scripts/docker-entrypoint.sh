#!/usr/bin/env bash
set -euo pipefail

# docker-entrypoint.sh
# Waits for required services (postgres, redis) if environment variables request
# Then executes the provided command.

ROOT="/app"
WAIT_FOR_SCRIPT="$ROOT/scripts/wait-for.sh"

wait_for() {
  host=$1
  port=$2
  timeout=${3:-60}
  echo "Checking $host:$port (timeout: ${timeout}s)"
  "$WAIT_FOR_SCRIPT" "$host:$port" -t "$timeout"
}

if [ "${WAIT_FOR_DB:-false}" = "true" ]; then
  DB_HOST=${WAIT_FOR_DB_HOST:-${DB_HOST:-db}}
  DB_PORT=${WAIT_FOR_DB_PORT:-${DB_PORT:-5432}}
  echo "Waiting for database: $DB_HOST:$DB_PORT"
  if command -v pg_isready >/dev/null 2>&1; then
    # attempt to use pg_isready to validate
    for i in {1..60}; do
      if pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
        echo "Postgres is ready"
        break
      fi
      echo "Waiting for Postgres... ($i/60)"
      sleep 1
    done
  else
    wait_for "$DB_HOST" "$DB_PORT" 60
  fi
fi

if [ "${WAIT_FOR_REDIS:-false}" = "true" ]; then
  REDIS_HOST=${WAIT_FOR_REDIS_HOST:-redis}
  REDIS_PORT=${WAIT_FOR_REDIS_PORT:-6379}
  echo "Waiting for redis: $REDIS_HOST:$REDIS_PORT"
  wait_for "$REDIS_HOST" "$REDIS_PORT" 60
fi

echo "Entrypoint: executing: $@"
exec "$@"
