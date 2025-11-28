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
echo "Bringing up api and dashboard..."
docker compose up -d api dashboard

# wait for services with helper script
if [ -x "$BASEDIR/scripts/wait-for-services.sh" ]; then
  "$BASEDIR/scripts/wait-for-services.sh"
else
  echo "Note: ./scripts/wait-for-services.sh is not executable or missing; ensure services are healthy before connecting"
fi

echo "Done. Use 'docker compose logs -f api' to tail API logs or 'docker compose ps' to check status."