#!/usr/bin/env bash
set -euo pipefail

# Helper script: dev-up.sh
# - Installs workspace dependencies at repo root
# - Builds docker images
# - Starts core infrastructure (db, redis, mailhog)
# - Runs migrations container
# - Starts API and dashboard containers

BASEDIR=$(dirname "$0")/..
cd "$BASEDIR"

echo "Installing npm dependencies (hoisted workspaces)..."
npm ci --no-audit --no-fund

echo "Building compose images (if necessary)..."
docker compose build --pull --parallel

echo "Bringing up database, redis and mailhog..."
docker compose up -d db redis mailhog

echo "Running migrations (one-off)..."
# run migrations container which runs `npm run migrate` inside container
# if you prefer to run migrations locally: npm run migrate
docker compose run --rm migrations || true

# start API and dashboard for development with volumes
echo "Bringing up api and dashboard (dashboard may be local if DASHBOARD_LOCAL=true)..."
if [ "${DASHBOARD_LOCAL:-}" = "true" ]; then
  docker compose up -d api
else
  docker compose up -d api dashboard
fi

# wait for services with helper script
if [ -x "$BASEDIR/scripts/wait-for-services.sh" ]; then
  "$BASEDIR/scripts/wait-for-services.sh"
else
  echo "Note: ./scripts/wait-for-services.sh is not executable or missing; ensure services are healthy before connecting"
fi

echo "Done. Use 'docker compose logs -f api' to tail API logs or 'docker compose ps' to check status."

# if developer requested local dashboard mode, launch dashboard dev server locally
if [ "${DASHBOARD_LOCAL:-}" = "true" ]; then
  echo "DASHBOARD_LOCAL=true; starting dashboard dev server locally"
  # install and start dashboard dev server in background
  (cd packages/dashboard && nohup npm run dev > /tmp/dashboard-dev.log 2>&1 &)

  # run a lightweight API smoke test to ensure API is reachable
  if [ -x "$BASEDIR/scripts/dashboard-smoke.sh" ]; then
    echo "Running API smoke check..."
    "$BASEDIR/scripts/dashboard-smoke.sh" || echo "Warning: API smoke check failed — check logs"
  fi
fi