#!/bin/bash

# =============================================================================
# Railway Environment Setup Script
# =============================================================================
# This script sets up all required environment variables in Railway
# Run: bash scripts/setup-railway-env.sh

set -e

echo "🚂 Setting up Railway environment variables..."
echo ""

# Critical Required Variables
echo "📌 Setting critical required variables..."

# JWT_SECRET (REQUIRED - generate if not set)
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  echo "  ✓ Generated JWT_SECRET"
fi
railway variables --set JWT_SECRET="$JWT_SECRET"

# API_SECRET_KEY (recommended)
if [ -z "$API_SECRET_KEY" ]; then
  API_SECRET_KEY=$(openssl rand -hex 32)
  echo "  ✓ Generated API_SECRET_KEY"
fi
railway variables --set API_SECRET_KEY="$API_SECRET_KEY"

# WALLET_ENCRYPTION_KEY (for encrypting TON wallet keys)
if [ -z "$WALLET_ENCRYPTION_KEY" ]; then
  WALLET_ENCRYPTION_KEY=$(openssl rand -hex 32)
  echo "  ✓ Generated WALLET_ENCRYPTION_KEY"
fi
railway variables --set WALLET_ENCRYPTION_KEY="$WALLET_ENCRYPTION_KEY"

echo ""
echo "📌 Setting runtime configuration..."

# Node environment
railway variables --set NODE_ENV=production

# Telegram Bot (load from .env.local if exists)
if [ -f ".env.local" ]; then
  source .env.local
  
  if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    railway variables --set TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN"
    echo "  ✓ Set TELEGRAM_BOT_TOKEN"
  fi
  
  if [ -n "$TELEGRAM_WEBHOOK_SECRET" ]; then
    railway variables --set TELEGRAM_WEBHOOK_SECRET="$TELEGRAM_WEBHOOK_SECRET"
    echo "  ✓ Set TELEGRAM_WEBHOOK_SECRET"
  fi
  
  # TON Blockchain
  if [ -n "$TON_API_KEY" ]; then
    railway variables --set TON_API_KEY="$TON_API_KEY"
    echo "  ✓ Set TON_API_KEY"
  fi
  
  if [ -n "$TON_API_URL" ]; then
    railway variables --set TON_API_URL="$TON_API_URL"
    echo "  ✓ Set TON_API_URL"
  fi
  
  if [ -n "$TON_MAINNET" ]; then
    railway variables --set TON_MAINNET="$TON_MAINNET"
    echo "  ✓ Set TON_MAINNET"
  fi
  
  if [ -n "$TON_WORKCHAIN" ]; then
    railway variables --set TON_WORKCHAIN="$TON_WORKCHAIN"
    echo "  ✓ Set TON_WORKCHAIN"
  fi
  
  if [ -n "$TON_WALLET_MNEMONIC" ]; then
    railway variables --set TON_WALLET_MNEMONIC="$TON_WALLET_MNEMONIC"
    echo "  ✓ Set TON_WALLET_MNEMONIC"
  fi
  
  # Platform Wallet
  if [ -n "$PLATFORM_TON_WALLET" ]; then
    railway variables --set PLATFORM_TON_WALLET="$PLATFORM_TON_WALLET"
    echo "  ✓ Set PLATFORM_TON_WALLET"
  fi
  
  # DEX Integration
  if [ -n "$DEDUST_API_URL" ]; then
    railway variables --set DEDUST_API_URL="$DEDUST_API_URL"
    echo "  ✓ Set DEDUST_API_URL"
  fi
  
  if [ -n "$STONFI_API_URL" ]; then
    railway variables --set STONFI_API_URL="$STONFI_API_URL"
    echo "  ✓ Set STONFI_API_URL"
  fi
  
  if [ -n "$DEX_SLIPPAGE_TOLERANCE" ]; then
    railway variables --set DEX_SLIPPAGE_TOLERANCE="$DEX_SLIPPAGE_TOLERANCE"
    echo "  ✓ Set DEX_SLIPPAGE_TOLERANCE"
  fi
  
  # Conversion Settings
  if [ -n "$MIN_CONVERSION_STARS" ]; then
    railway variables --set MIN_CONVERSION_STARS="$MIN_CONVERSION_STARS"
    echo "  ✓ Set MIN_CONVERSION_STARS"
  fi
  
  if [ -n "$RATE_LOCK_DURATION_SECONDS" ]; then
    railway variables --set RATE_LOCK_DURATION_SECONDS="$RATE_LOCK_DURATION_SECONDS"
    echo "  ✓ Set RATE_LOCK_DURATION_SECONDS"
  fi
  
  if [ -n "$MAX_PENDING_CONVERSIONS" ]; then
    railway variables --set MAX_PENDING_CONVERSIONS="$MAX_PENDING_CONVERSIONS"
    echo "  ✓ Set MAX_PENDING_CONVERSIONS"
  fi
  
  if [ -n "$P2P_POOL_REFRESH_INTERVAL" ]; then
    railway variables --set P2P_POOL_REFRESH_INTERVAL="$P2P_POOL_REFRESH_INTERVAL"
    echo "  ✓ Set P2P_POOL_REFRESH_INTERVAL"
  fi
  
  # Exchange Rate Providers (COINGECKO_API_KEY already set)
  if [ -n "$COINMARKETCAP_API_KEY" ]; then
    railway variables --set COINMARKETCAP_API_KEY="$COINMARKETCAP_API_KEY"
    echo "  ✓ Set COINMARKETCAP_API_KEY"
  fi
fi

echo ""
echo "✅ Railway environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Verify variables: railway variables"
echo "  2. Redeploy: railway up"
echo ""
