# Safe history-rewrite & secrets purge (git-filter-repo)

This document describes a safe, repeatable process to permanently remove secrets from repository history using git-filter-repo and the provided `replace-secrets.txt`.

IMPORTANT: do not run destructive history rewrite on the main clone. Use a mirror clone, rotate secrets first, and coordinate with any collaborators.

1) Rotate any exposed credentials NOW
   - Revoke the keys that gitleaks reported (API keys, tokens, DB passwords, private keys) at the provider. Do this before touching history.

2) Create a mirror clone (work in a separate directory)

```bash
# mirror clone the remote
git clone --mirror git@github.com:toxzak-svg/TelePayGate.git TelePayGate-mirror.git
cd TelePayGate-mirror.git
```

3) Run git-filter-repo with the prepared replacement file

```bash
# make sure replace-secrets.txt is accessible from inside the mirror clone
# e.g., copy it into the mirror directory or reference the path
cp ../replace-secrets.txt ./replace-secrets.txt

# Run replacement. This rewrites ALL history and replaces matched secrets
git filter-repo --replace-text replace-secrets.txt
```

4) Inspect results locally before pushing

```bash
# Inspect the rewritten history: check logs and files where the change should apply
git log --stat -n 50
# Inspect specific files to ensure the sensitive content is redacted
git grep -n "REDACTED_API_KEY" || true
```

5) Force-push cleaned mirror to remote

This is destructive. Coordinate with your team and ensure everyone re-clones afterwards.

```bash
git push --force --mirror origin
```

6) Post-cleanup steps
  - Communicate to all contributors to re-clone the repository (history changed)
  - Rotate any other keys you didn't rotate earlier
  - Re-run gitleaks to confirm the repository is clean

7) Verify with gitleaks (example)

```bash
# run gitleaks again to confirm no leaks
./gitleaks detect --source . --report-path docs/reports/gitleaks-clean.json --report-format json --redact
```

Need help running the rewrite? I can prepare an exact, reviewable `replace-secrets.txt` tuned to the report and optionally run a dry-run for you in a mirror clone — I will not push anything to the remote without your explicit permission.
