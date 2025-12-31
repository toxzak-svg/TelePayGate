#!/usr/bin/env bash
set -euo pipefail

# Helper to repair workspace file ownership for local dev
# NOTE: This script requires sudo to change files owned by root.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ME_UID=$(id -u)
ME_GID=$(id -g)

echo "Scanning for root-owned files under ${ROOT_DIR}..."
mapfile -t bad < <(find "${ROOT_DIR}" \( -path "${ROOT_DIR}/.git" -prune \) -o -not -user $(id -un) -print -quit)

if [ ${#bad[@]} -eq 0 ]; then
  echo "No files owned by other users were found. You should be able to run npm ci as your normal user."
  exit 0
fi

echo "Found files owned by another user. To repair, run the following command (it will ask for your password):"
echo
echo "  sudo chown -R ${ME_UID}:${ME_GID} ${ROOT_DIR}"
echo
echo "Or, if you only want to fix node_modules directories (safer / faster):"
echo
echo "  sudo find ${ROOT_DIR} -name node_modules -type d -prune -exec chown -R ${ME_UID}:${ME_GID} {} +"
echo
echo "If you cannot run sudo here, please run the above command with a user that has permission to change ownership."

exit 0
