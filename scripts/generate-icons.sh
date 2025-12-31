#!/usr/bin/env bash
# Generate PNG icons from SVG placeholders using ImageMagick or rsvg-convert
# Usage: ./scripts/generate-icons.sh

set -euo pipefail

SVG_SRC=packages/dashboard/public/app-icon-512.svg
OUT_DIR=packages/dashboard/public/assets
mkdir -p "$OUT_DIR"

if command -v rsvg-convert >/dev/null 2>&1; then
  rsvg-convert -w 512 -h 512 "$SVG_SRC" -o "$OUT_DIR/app-icon-512.png"
  rsvg-convert -w 192 -h 192 "$SVG_SRC" -o "$OUT_DIR/app-icon-192.png"
elif command -v convert >/dev/null 2>&1; then
  convert "$SVG_SRC" -resize 512x512 "$OUT_DIR/app-icon-512.png"
  convert "$SVG_SRC" -resize 192x192 "$OUT_DIR/app-icon-192.png"
else
  echo "Neither rsvg-convert nor ImageMagick 'convert' found. Install one to generate PNG icons." >&2
  exit 1
fi

echo "Generated icons in $OUT_DIR"
