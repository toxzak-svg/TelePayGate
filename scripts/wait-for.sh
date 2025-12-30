#!/usr/bin/env bash
set -eu

# Wait-for a host:port until it becomes available
# Usage: wait-for.sh host:port [-t timeout_seconds]

usage() {
  echo "Usage: $0 host:port [-t timeout_seconds]" >&2
  exit 2
}

if [ -z "${1:-}" ]; then usage; fi

TARGET="$1"
TIMEOUT=${3:-30}

if [[ "$2" == "-t" ]]; then
  TIMEOUT=${3:-30}
fi

HOST=${TARGET%%:*}
PORT=${TARGET##*:}

echo "Waiting for $HOST:$PORT (timeout=${TIMEOUT}s)"
for i in $(seq 1 $TIMEOUT); do
  if command -v nc >/dev/null 2>&1; then
    if nc -z "$HOST" "$PORT" >/dev/null 2>&1; then
      echo "$HOST:$PORT is available"
      exit 0
    fi
  else
    (echo >/dev/tcp/$HOST/$PORT) >/dev/null 2>&1 && { echo "$HOST:$PORT is available"; exit 0; } || true
  fi
  sleep 1
done

echo "Timed out waiting for $HOST:$PORT" >&2
exit 1
