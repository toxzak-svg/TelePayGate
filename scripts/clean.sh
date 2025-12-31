#!/bin/bash

# =============================================================================
# Clean Script - Remove build artifacts and cache files
# =============================================================================
# Usage: npm run clean

set -e

echo "🧹 Cleaning TelePayGate..."
echo ""

# Remove build artifacts
echo "📦 Removing build artifacts..."
rm -rf packages/*/dist
rm -rf packages/*/.turbo
rm -rf .turbo .next

# Remove TypeScript build info
echo "🔨 Removing TypeScript build info..."
find . -type f -name "*.tsbuildinfo" -delete

# Remove logs
echo "📋 Removing log files..."
find . -type f -name "*.log" -delete

# Remove test coverage
echo "📊 Removing test coverage..."
rm -rf coverage
rm -rf packages/*/coverage
rm -rf .nyc_output

# Remove cache directories
echo "💾 Removing cache directories..."
rm -rf .cache
rm -rf packages/*/.cache

echo ""
echo "✅ Clean complete!"
echo ""
echo "Build artifacts removed. Run 'npm run build' to rebuild."
