#!/usr/bin/env bash
set -euo pipefail

# Simple pre-commit checks for secrets-like patterns and optional lint step.
# This is a lightweight template; teams should replace with detect-secrets/git-secrets for production.

echo "Running pre-commit quick checks..."

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
if [ -z "$STAGED_FILES" ]; then
  echo "No staged files; skipping checks."
  exit 0
fi

EXIT_CODE=0

for f in $STAGED_FILES; do
  [ -f "$f" ] || continue
  # check for private keys and common token patterns
  if grep -EnH --label="$f" -e '-----BEGIN (RSA|OPENSSH|PRIVATE) KEY-----' -e 'AKIA[0-9A-Z]{16}' -e 'ssh-rsa AAAA' -e 'ghp_[A-Za-z0-9_]+' -e '-----BEGIN PRIVATE KEY-----' "$f" >/dev/null 2>&1; then
    echo "Potential secret detected in: $f"
    EXIT_CODE=2
  fi
done

if [ $EXIT_CODE -ne 0 ]; then
  echo "Pre-commit checks failed: potential secrets found. Please remove sensitive data or add to .gitignore/baseline."
  exit $EXIT_CODE
fi

# optional lint step if project provides an npm lint script
if command -v npm >/dev/null 2>&1; then
  if npm run -s lint >/dev/null 2>&1; then
    echo "Running lint (this may be quick or full depending on project config)..."
    npm run lint --silent || echo "Lint returned errors (non-fatal in this template)."
  fi
fi

echo "Pre-commit checks passed."
exit 0
