#!/usr/bin/env bash
# Deploy Render blueprint using render CLI and an env file
# Usage: ./scripts/deploy-render-blueprint.sh .env.render

set -euo pipefail
ENV_FILE=${1:-.env.render}

if ! command -v render >/dev/null 2>&1; then
  echo "render CLI not found. Install from https://render.com/docs/cli" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Env file $ENV_FILE not found. Copy .env.render.example to $ENV_FILE and fill values." >&2
  exit 1
fi

# Deploy blueprint; render will prompt for any missing secrets marked sync:false
render blueprint deploy --file render.yaml --env-file "$ENV_FILE"

echo "Render blueprint deploy complete. Check dashboard for service URLs and logs."