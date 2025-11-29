#!/usr/bin/env bash
set -eu

# Simple helper to create a .env file from .env.template and inject randomly generated secrets
# Usage: ./scripts/generate-local-env.sh [--force]

FORCE=false
if [ "${1:-}" = "--force" ]; then
  FORCE=true
fi

TEMPLATE_FILE=".env.template"
TARGET_FILE=".env"

if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "Template $TEMPLATE_FILE not found. Aborting." >&2
  exit 1
fi

if [ -f "$TARGET_FILE" ] && [ "$FORCE" = false ]; then
  echo ".env already exists. Use --force to overwrite." >&2
  exit 1
fi

# generate strong random secrets
JWT_SECRET=$(openssl rand -hex 32 || head -c 32 /dev/urandom | xxd -p -c 32)
API_SECRET_KEY=$(openssl rand -hex 32 || head -c 32 /dev/urandom | xxd -p -c 32)

echo "Creating $TARGET_FILE from $TEMPLATE_FILE and injecting random secrets..."
cp "$TEMPLATE_FILE" "$TARGET_FILE"

# replace placeholders if present, otherwise append
if grep -qE "^JWT_SECRET=" "$TARGET_FILE"; then
  sed -i"" -e "s/^JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" "$TARGET_FILE" || sed -i -e "s/^JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" "$TARGET_FILE"
else
  printf "\nJWT_SECRET=%s\n" "$JWT_SECRET" >> "$TARGET_FILE"
fi

if grep -qE "^API_SECRET_KEY=" "$TARGET_FILE"; then
  sed -i"" -e "s/^API_SECRET_KEY=.*/API_SECRET_KEY=${API_SECRET_KEY}/" "$TARGET_FILE" || sed -i -e "s/^API_SECRET_KEY=.*/API_SECRET_KEY=${API_SECRET_KEY}/" "$TARGET_FILE"
else
  printf "\nAPI_SECRET_KEY=%s\n" "$API_SECRET_KEY" >> "$TARGET_FILE"
fi

echo "Done. Wrote $TARGET_FILE (keep this file secret — rotate before committing anywhere public)."
