#!/usr/bin/env bash
# Build and optionally deploy mkdocs site. Usage:
# ./scripts/deploy-mkdocs.sh build   -> builds site to site/
# ./scripts/deploy-mkdocs.sh serve   -> serve locally
# ./scripts/deploy-mkdocs.sh gh-deploy -> deploy to GitHub Pages (requires gh-pages setup)

set -euo pipefail
CMD=${1:-build}

if ! command -v mkdocs >/dev/null 2>&1; then
  echo "mkdocs not found. Install with: pip install mkdocs mkdocs-material"
  exit 1
fi

case "$CMD" in
  build)
    mkdocs build
    ;;
  serve)
    mkdocs serve
    ;;
  gh-deploy)
    mkdocs gh-deploy --force
    ;;
  *)
    echo "Unknown command: $CMD"
    echo "Usage: $0 {build|serve|gh-deploy}"
    exit 1
    ;;
esac
