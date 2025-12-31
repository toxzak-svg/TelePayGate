# Render Deployment Guide

Complete guide for deploying TelePayGate to Render.com using the `render.yaml` blueprint.

---

## Architecture Overview

| Component | Type | Purpose |
|-----------|------|---------|
| `telegram-payment-api` | Web Service | Express REST API (port 10000) |
| `telepaygate-dashboard` | Static Site | React dashboard for merchants |
| `worker-deposit-monitor` | Background Worker | TON deposit monitoring & settlement |
| `worker-fee-collection` | Background Worker | Platform fee collection |
| `telepaygate-redis` | Redis | Rate caching, job queues |
| `telepaygate-db` | PostgreSQL | Primary database |

---

## Prerequisites

1. **Render account** with access to Blueprints
2. **GitHub repository** connected to Render
3. **TON wallet** with mnemonic (generate: `node scripts/generate-ton-wallet.js`)
4. **Telegram bot** from [@BotFather](https://t.me/BotFather)

---

## Quick Deploy (5 minutes)

### Step 1: Connect Repository

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **Blueprints** → **New Blueprint**
3. Connect your GitHub repo: `toxzak-svg/TelePayGate`
4. Select branch: `main`
5. Render detects `render.yaml` automatically

### Step 2: Configure Secrets

When prompted, enter these **required** secrets:

```bash
# Generate these with: openssl rand -hex 32
API_SECRET_KEY=<your-32-byte-hex>
JWT_SECRET=<your-32-byte-hex>
WALLET_ENCRYPTION_KEY=<your-32-byte-hex>
TELEGRAM_WEBHOOK_SECRET=<your-32-byte-hex>

# From @BotFather
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# TON Blockchain
TON_WALLET_MNEMONIC="word1 word2 word3 ... word24"
TON_API_KEY=<from-toncenter.com>
PLATFORM_TON_WALLET=EQxxxxxxxxxx
```

### Step 3: Deploy

Click **Apply** and wait for all services to build (~5-10 minutes).

---

## Service URLs (After Deploy)

| Service | URL |
|---------|-----|
| API | `https://telegram-payment-api.onrender.com` |
| Dashboard | `https://telepaygate-dashboard.onrender.com` |
| Health Check | `https://telegram-payment-api.onrender.com/health` |

---

## Environment Variables Reference

### Required Secrets (`shared-secrets` group)

| Variable | Description | How to Get |
|----------|-------------|------------|
| `TON_WALLET_MNEMONIC` | 24-word seed phrase | `node scripts/generate-ton-wallet.js` |
| `TON_API_KEY` | TON RPC API key | [toncenter.com](https://toncenter.com) |
| `TELEGRAM_BOT_TOKEN` | Bot token | [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook signature | `openssl rand -hex 32` |
| `API_SECRET_KEY` | Internal signing | `openssl rand -hex 32` |
| `JWT_SECRET` | JWT signing | `openssl rand -hex 32` |
| `WALLET_ENCRYPTION_KEY` | Wallet encryption | `openssl rand -hex 32` |
| `PLATFORM_TON_WALLET` | Fee collection address | Your TON address (EQ...) |

### Optional Secrets

| Variable | Description |
|----------|-------------|
| `COINGECKO_API_KEY` | Better rate limits |
| `COINMARKETCAP_API_KEY` | Backup rate source |
| `KRAKEN_API_KEY` | Fiat off-ramp |
| `KRAKEN_API_SECRET` | Fiat off-ramp |

### Auto-Configured (Don't Set Manually)

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | telepaygate-db service |
| `REDIS_URL` | telepaygate-redis service |

---

## Post-Deployment Checklist

### 1. Verify API Health
```bash
curl https://telegram-payment-api.onrender.com/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 2. Verify Dashboard
Open `https://telepaygate-dashboard.onrender.com` in browser.

### 3. Create Test User
```bash
# Use the API to create a user and get API key
curl -X POST https://telegram-payment-api.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","appName":"My App"}'
```

### 4. Configure Telegram Webhook
```bash
# Set webhook URL for your bot
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://telegram-payment-api.onrender.com/api/v1/webhooks/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

### 5. Check Worker Logs
In Render dashboard, check logs for:
- `worker-deposit-monitor` - Should show "Monitoring deposits..."
- `worker-fee-collection` - Should show "Fee collection started..."

---

## Database Migrations

Migrations run automatically before each deploy via `preDeployCommand`.

To run manually:
```bash
# Via Render Shell (in API service)
npm run migrate

# Check status
npm run migrate:status
```

---

## Scaling & Plans

### Starter Plan (Default)
- API: 512MB RAM, 0.5 CPU
- Workers: 512MB RAM, 0.5 CPU
- PostgreSQL: 1GB storage
- Redis: 25MB

### Production Recommendations
- API: Standard plan (2GB RAM)
- Workers: Standard plan
- PostgreSQL: Standard plan (10GB)
- Redis: Standard plan (100MB)

Update in `render.yaml`:
```yaml
services:
  - type: web
    name: telegram-payment-api
    plan: standard  # Changed from starter
```

---

## Custom Domain Setup

### API Domain
1. Go to Render → telegram-payment-api → Settings
2. Add custom domain: `api.yourdomain.com`
3. Add DNS CNAME: `api.yourdomain.com` → `telegram-payment-api.onrender.com`

### Dashboard Domain
1. Go to Render → telepaygate-dashboard → Settings
2. Add custom domain: `dashboard.yourdomain.com`
3. Add DNS CNAME: `dashboard.yourdomain.com` → `telepaygate-dashboard.onrender.com`

---

## Monitoring & Alerts

### Health Check
The API exposes `/health` endpoint. Render automatically:
- Checks every 10 seconds
- Restarts service if 3 consecutive failures
- Sends alerts via notification settings

### Recommended Alerts
1. **Service Down** - Email when any service fails health check
2. **Deploy Failed** - Email on build/deploy failures
3. **High Error Rate** - Integrate with logging service

### Logging Services
Consider adding:
- [Logflare](https://logflare.app) - Free tier
- [Datadog](https://datadoghq.com) - APM + logs
- [Sentry](https://sentry.io) - Error tracking

---

## Troubleshooting

### API Won't Start
1. Check `DATABASE_URL` is populated (Render → Service → Environment)
2. Verify migrations succeeded in deploy logs
3. Check for missing required secrets

### Dashboard Shows Blank
1. Verify `VITE_API_URL` points to correct API URL
2. Check browser console for CORS errors
3. Rebuild: Manual Deploy → Clear cache & deploy

### Workers Exit Immediately
1. Check `TON_WALLET_MNEMONIC` is set (24 words)
2. Check `TON_API_KEY` is valid
3. Check `DATABASE_URL` is set

### Webhook Not Receiving Events
1. Verify Telegram webhook is set correctly
2. Check `TELEGRAM_WEBHOOK_SECRET` matches
3. Check API logs for incoming requests

### Database Connection Failed
1. Check PostgreSQL service is running
2. Verify connection string format
3. Check if IP allow list is blocking

---

## Rollback Procedure

1. Go to Render Dashboard → Service → Deploys
2. Find last working deploy
3. Click "Rollback to this deploy"

Or via CLI:
```bash
render deploy rollback telegram-payment-api --deploy <deploy-id>
```

---

## Cost Estimate (USD/month)

| Component | Starter | Standard |
|-----------|---------|----------|
| API Web Service | $7 | $25 |
| Dashboard Static | Free | Free |
| Worker (x2) | $14 | $50 |
| PostgreSQL | $7 | $25 |
| Redis | $0 | $10 |
| **Total** | **~$28** | **~$110** |

---

## CI/CD with GitHub Actions

Add to `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```

Get deploy hook URL from Render → Service → Settings → Deploy Hook.

---

## Security Checklist

- [ ] All secrets set via Render dashboard (not in code)
- [ ] `TON_WALLET_MNEMONIC` backed up securely offline
- [ ] HTTPS enforced (Render default)
- [ ] Redis only accepts internal connections
- [ ] Database IP allow list configured (if needed)
- [ ] Rate limiting enabled in API
- [ ] CORS configured for dashboard domain only

---

## Support

- **Documentation**: `/docs` folder
- **Issues**: GitHub Issues
- **npm Packages**: 
  - `telepaygate-core` - Core business logic
  - `telepaygate-api` - REST API
  - `telepaygate-sdk` - Client SDK
