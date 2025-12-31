# Railway Deployment Guide

This guide covers deploying TelePayGate to [Railway](https://railway.app), a modern platform for deploying containerized applications with integrated PostgreSQL databases.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Database Configuration](#database-configuration)
- [Environment Variables](#environment-variables)
- [Deployment Process](#deployment-process)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- [Railway account](https://railway.app)
- GitHub repository with your TelePayGate code
- Railway CLI (optional): `npm i -g @railway/cli`

## Quick Start

### 1. Create New Project

1. Login to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Choose your TelePayGate repository
5. Railway will automatically detect the `railway.json` configuration

### 2. Add PostgreSQL Database

1. In your project, click **New** → **Database** → **PostgreSQL**
2. Railway will automatically provision a PostgreSQL 16+ instance
3. The `DATABASE_URL` environment variable is automatically injected

### 3. Configure Environment Variables

Go to your service's **Variables** tab and add the required environment variables (see [Environment Variables](#environment-variables) section below).

### 4. Deploy

Railway will automatically deploy on every push to your main branch. The first deployment will:
1. Build the Docker image using `Dockerfile`
2. Run database migrations via `node database/migrate.cjs up` (configured in `railway.json`)
3. Start the application

## Database Configuration

### Automatic DATABASE_URL

Railway automatically provides `DATABASE_URL` in the format:
```
postgresql://postgres:password@containers-us-west-XXX.railway.app:5432/railway
```

**Important:** The migration scripts and application are configured to:
- ✅ Prioritize `DATABASE_URL` environment variable
- ✅ Use SSL connections for Railway's PostgreSQL (with `rejectUnauthorized: false`)
- ✅ Automatically run migrations on deployment via `preDeployCommand`

### Manual Migration (if needed)

If you need to run migrations manually:

```bash
# Using Railway CLI
railway run node database/migrate.cjs up

# Check migration status
railway run node database/migrate.cjs status
```

### Database Connection Pooling

Configure connection pooling via environment variables:
```bash
DATABASE_POOL_MAX=10          # Max connections (default: 10)
DATABASE_POOL_MIN=2           # Min connections (default: 2)
DB_IDLE_TIMEOUT=30000         # Idle timeout in ms (default: 30000)
DB_CONNECTION_TIMEOUT=5000    # Connection timeout in ms (default: 5000)
```

## Environment Variables

### Required Variables

Add these in Railway's **Variables** section:

#### Database (Auto-configured)
```bash
DATABASE_URL=<automatically-set-by-railway>
NODE_ENV=production
```

#### Telegram Integration
```bash
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_WEBHOOK_SECRET=<random-secret>
```

#### TON Blockchain
```bash
TON_WALLET_MNEMONIC=<24-word-seed-phrase>
TON_API_KEY=<tonx-api-key>
TON_API_URL=https://toncenter.com/api/v2/jsonRPC
TON_MAINNET=true
TON_WORKCHAIN=0
```

#### P2P DEX Integration
```bash
DEDUST_API_URL=https://api.dedust.io
STONFI_API_URL=https://api.ston.fi
DEX_SLIPPAGE_TOLERANCE=0.5
```

#### Security
```bash
API_SECRET_KEY=<random-256-bit-hex>
JWT_SECRET=<random-jwt-secret>
WALLET_ENCRYPTION_KEY=<256-bit-hex-key>
```

#### Rate Providers (Optional)
```bash
COINGECKO_API_KEY=<optional>
COINMARKETCAP_API_KEY=<optional>
```

### Optional Variables

```bash
# Conversion Settings
MIN_CONVERSION_STARS=100
RATE_LOCK_DURATION_SECONDS=300
MAX_PENDING_CONVERSIONS=10
P2P_POOL_REFRESH_INTERVAL=30

# Logging
LOG_LEVEL=info
```

### Generating Secrets

Use the provided scripts to generate secure secrets:

```bash
# Generate TON wallet
npm run generate-wallet

# Generate API keys
node scripts/generate-dashboard-key.js
```

## Deployment Process

### Automatic Deployment (Recommended)

Railway automatically deploys when you push to your configured branch (usually `main`):

```bash
git add .
git commit -m "Deploy to Railway"
git push origin main
```

Railway will:
1. Detect changes
2. Build Docker image
3. Run `preDeployCommand`: `node database/migrate.cjs up`
4. Deploy the new version
5. Run health checks on `/health` endpoint

### Manual Deployment via CLI

```bash
# Login to Railway
railway login

# Link to your project
railway link

# Deploy manually
railway up

# View logs
railway logs
```

### Deployment Configuration

The `railway.json` file configures:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "preDeployCommand": ["node database/migrate.cjs up"],
    "healthcheckPath": "/health",
    "healthcheckTimeout": 90,
    "restartPolicyType": "always"
  }
}
```

## Post-Deployment

### 1. Verify Health Endpoint

```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-29T...",
  "database": "connected"
}
```

### 2. Check Database Migrations

```bash
railway run node database/migrate.cjs status
```

Should show all migrations as applied.

### 3. Test API Endpoints

```bash
# Create a test user/developer account
curl -X POST https://your-app.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

### 4. Configure Telegram Webhook

Set your Telegram bot webhook to point to Railway:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-app.railway.app/api/v1/payments/webhook/telegram"}'
```

### 5. Monitor Logs

View real-time logs in Railway Dashboard or via CLI:

```bash
railway logs --follow
```

## Troubleshooting

### Migration Failures

**Problem:** Migrations fail during deployment

**Solution:**
1. Check Railway logs for specific SQL errors
2. Verify `DATABASE_URL` is set correctly
3. Manually run migrations:
   ```bash
   railway run node database/migrate.cjs status
   railway run node database/migrate.cjs up
   ```

### SSL Connection Errors

**Problem:** `unable to verify the first certificate` or SSL errors

**Solution:** The code is configured to handle Railway's SSL certificates. If issues persist:
1. Verify `NODE_ENV=production` is set
2. Check that `DATABASE_URL` includes `railway.app`
3. The connection code automatically sets `ssl: { rejectUnauthorized: false }`

### Database Connection Pool Exhausted

**Problem:** `sorry, too many clients already`

**Solution:**
1. Reduce `DATABASE_POOL_MAX` (default: 10)
2. Check for connection leaks in code
3. Increase Railway's PostgreSQL plan if needed

### Health Check Timeouts

**Problem:** Deployment fails with health check timeout

**Solution:**
1. Verify `/health` endpoint responds quickly
2. Increase `healthcheckTimeout` in `railway.json`
3. Check database connectivity

### Environment Variable Not Found

**Problem:** `DATABASE_URL is required` or similar errors

**Solution:**
1. Verify all required environment variables are set in Railway Variables
2. Check variable names match exactly (case-sensitive)
3. Redeploy after adding variables

### Webhook Not Receiving Events

**Problem:** Telegram webhooks not reaching the application

**Solution:**
1. Verify webhook URL is set correctly in Telegram
2. Check Railway logs for incoming requests
3. Verify `TELEGRAM_WEBHOOK_SECRET` matches
4. Ensure app is publicly accessible (not in private network)

## Performance Optimization

### Connection Pooling

Optimize for Railway's resource limits:

```bash
# For Starter plan (512MB RAM)
DATABASE_POOL_MAX=5
DATABASE_POOL_MIN=2

# For Pro plan (8GB RAM)
DATABASE_POOL_MAX=20
DATABASE_POOL_MIN=5
```

### Node.js Memory

Adjust Node.js memory in `Dockerfile`:
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=512"  # Adjust based on plan
```

### Caching

Enable rate caching to reduce external API calls:
```bash
P2P_POOL_REFRESH_INTERVAL=30  # Seconds between rate updates
```

## Scaling

### Horizontal Scaling

Railway supports horizontal scaling:
1. Go to **Settings** → **Replicas**
2. Increase replica count
3. Railway handles load balancing automatically

**Note:** Ensure your application is stateless for proper horizontal scaling.

### Vertical Scaling

Upgrade your Railway plan for more resources:
- Starter: 512MB RAM, 1 vCPU
- Pro: 8GB RAM, 8 vCPU
- Enterprise: Custom resources

## Backup and Recovery

### Database Backups

Railway provides automated backups for paid plans. To manually backup:

```bash
# Export database
railway run pg_dump $DATABASE_URL > backup.sql

# Restore from backup
railway run psql $DATABASE_URL < backup.sql
```

### Environment Variable Backup

Export all environment variables:
```bash
railway variables > env-backup.txt
```

## Security Best Practices

1. **Never commit secrets** to Git
2. **Use Railway's Variables** for all sensitive data
3. **Rotate credentials** regularly using `scripts/rotate-credentials.sh`
4. **Enable 2FA** on your Railway account
5. **Use private networking** for service-to-service communication
6. **Monitor logs** for suspicious activity

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [TelePayGate Architecture](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Security Checklist](./SECURITY_CHECKLIST.md)

## Support

- Railway Support: https://help.railway.app
- TelePayGate Issues: https://github.com/toxzak-svg/TelePayGate/issues
- Documentation: `docs/` directory
