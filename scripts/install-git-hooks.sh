#!/usr/bin/env bash
# Small helper to install the repo-provided git hooks into .git/hooks

set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
TARGET_DIR="$ROOT/.git/hooks"
SOURCE_DIR="$ROOT/scripts/hooks"

if [ ! -d "$TARGET_DIR" ]; then
  echo "No .git/hooks directory found. Make sure you're running inside a git repository." >&2
  exit 1
fi

echo "Installing git hooks from $SOURCE_DIR to $TARGET_DIR"
mkdir -p "$TARGET_DIR"

for f in "$SOURCE_DIR"/*; do
  name=$(basename "$f")
  cp -f "$f" "$TARGET_DIR/$name"
  chmod +x "$TARGET_DIR/$name"
  echo "Installed hook: $name"
done

echo "Git hooks installed. Pre-commit hook will run scripts/pre-commit-secret-scan.sh"
