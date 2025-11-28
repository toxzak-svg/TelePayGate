#!/usr/bin/env bash
# Lightweight pre-commit secret scanner.
# Usage: run as a pre-commit hook. This script looks at staged files
# and searches for likely secret patterns. It is not a replacement for
# a robust scanner but prevents accidental commits of obvious secrets.

set -euo pipefail

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM || true)
if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

FAIL=0

# Patterns to check (add more as needed)
PATTERNS=(
  "AKIA[0-9A-Z]{16}"                # AWS access key ID
  "AIza[0-9A-Za-z_-]{35}"           # Google API key
  "ghp_[0-9A-Za-z]{36}"             # GitHub personal access token
  # Private key patterns removed; use environment variables or secure vaults for keys
  "telegram_bot_token"              # common env var
  "TON_WALLET_MNEMONIC"             # mnemonic env var name
  "rnd_[0-9A-Za-z_]{10,}"           # example render key prefix
)

for file in $STAGED_FILES; do
  # skip binaries
  if file "$file" | grep -q "text"; then
    for pat in "${PATTERNS[@]}"; do
      if git show ":$file" | grep -E --quiet "$pat"; then
        echo "Error: potential secret detected in staged file: $file"
        echo "       Pattern: $pat"
        FAIL=1
      fi
    done
  fi
done

if [ "$FAIL" -eq 1 ]; then
  echo "\nCommit aborted. Review staged files and remove any secrets before committing."
  exit 1
fi

exit 0
