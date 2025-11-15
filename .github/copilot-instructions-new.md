# Copilot Instructions for Telegram Payment Gateway

**Status**: Fragment-free payment processor | Telegram Stars → TON blockchain → Fiat conversions | Direct blockchain integration

This is a **monorepo payment gateway** that converts Telegram Stars to TON cryptocurrency without using Fragment.com's KYC API. Built with TypeScript, Express, PostgreSQL, and npm workspaces.

## Core Architecture

**Four-package monorepo** (all in `packages/`):
- `core`: Business logic (services, models, types, database)—**source of truth for services**
- `api`: Express REST API (controllers, middleware, routes)
- `sdk`: TypeScript client library for developers  
- `dashboard`: React admin dashboard

**Key principle**: Services in `core` are stateless handlers; API layer is thin; models handle persistence; background workers handle async tasks.

## Critical Services (packages/core/src/services/)

1. **DirectConversionService** (`direct-conversion.service.ts`)
   - Rate quotes with platform fees (no Fragment fees)
   - Direct TON blockchain transfers
   - Conversion state machine

2. **TonPaymentService** (`ton-payment.service.ts`)
   - Send TON via blockchain
   - Balance checking & tx verification

3. **TelegramService** (`telegram.service.ts`)
   - Webhook reception & Stars validation
   - User identification from Telegram ID

4. **RateAggregatorService** (`rate.aggregator.ts`)
   - Multi-source rates (CoinGecko, Binance, DEX)
   - Caching with TTL & fallback logic

5. **FeeService** (`fee.service.ts`)
   - Platform + network fee calculation
   - Excludes Fragment's KYC fees

6. **PaymentService** (`payment.service.ts`)
   - Payment state machine & status tracking

7. **ReconciliationService** (`reconciliation.service.ts`)
   - Periodic state consistency validation

8. **WebhookService** (`webhook.service.ts`)
   - Async webhook delivery with HMAC signatures & retry logic

## Payment Flow (No Fragment)

```
User pays Stars → Telegram webhook → PaymentService creates record
                                    ↓
                         DirectConversionService generates TON address
                                    ↓
                         User transfers TON manually (Stars → TON in Telegram app)
                                    ↓
                    TonPaymentService detects & verifies deposit
                                    ↓
                     RateAggregator locks TON/USD rate
                                    ↓
                  Direct TON transfer → Settlement → WebhookService notifies developer
```

**Status machine**: pending → received → converting → settled/failed

## Data Models (packages/core/src/models/)

- **PaymentModel**: `payments` table (Telegram Stars)
- **ConversionModel**: `conversions` table (Stars→TON)
- **SettlementModel**: `settlements` table (Fiat payouts)

All use `pg-promise`. Returns typed objects, handles nulls gracefully.

## Controllers & Routes (packages/api/src/)

**Thin HTTP layer pattern:**
```typescript
// 1. Validate & extract
const { amount } = req.body;
if (!amount) throw new Error('Required');

// 2. Call core service
const result = await PaymentService.create(amount);

// 3. Return standardized response
res.json({ success: true, data: result });
```

Routes in `packages/api/src/routes/v1.routes.ts`. Auth middleware in `packages/api/src/middleware/auth.middleware.ts`.

## Database Setup

**Canonical migration location**: `database/migrations/` (numbered SQL files)

Run with:
```bash
npm run migrate
```

Schema: users, payments, conversions, settlements, fee_collections, withdrawals, webhook_events, audit_logs.

**Connection**: Singleton pool in `packages/core/src/db/connection.ts`. Configured via `DATABASE_URL` env var (default: `postgresql://tg_user:tg_pass@localhost:5432/tg_payment_dev`).

## Workspace Imports (CRITICAL)

**Always import services from `@tg-payment/core`, NOT relative paths:**
```typescript
// ✅ Correct
import { DirectConversionService, PaymentModel } from '@tg-payment/core';

// ❌ Wrong
import { DirectConversionService } from '../../../core/src/services/...';
```

Workspace packages: `@tg-payment/core`, `@tg-payment/api`, `@tg-payment/sdk`, `@tg-payment/dashboard`.

## Environment Variables (.env)

```bash
# Database
DATABASE_URL=postgresql://tg_user:tg_pass@localhost:5432/tg_payment_dev

# TON Blockchain (Direct—No Fragment)
TON_API_KEY=your_key
TON_API_ENDPOINT=https://toncenter.com/api/v2/jsonRPC
TON_MAINNET=true

# Telegram
TELEGRAM_BOT_TOKEN=your_token

# Security
JWT_SECRET=dev_secret
API_SECRET_KEY=dev_key

# Conversion
MIN_CONVERSION_STARS=100  # Much lower than Fragment's 1000
RATE_LOCK_DURATION_SECONDS=300
```

## Quick Start

```bash
# Install all workspaces
npm install

# Start Docker (postgres + redis + api)
docker-compose up -d

# Run migrations
npm run migrate

# Start API in dev mode (watches TypeScript)
npm run dev --workspace=@tg-payment/api

# OR explicit workspace syntax (PowerShell):
npm -w @tg-payment/api run dev
```

Health check: `http://localhost:3000/health`

## Code Patterns

### Services (packages/core/src/services/)
Stateless handlers with instance or static methods:
```typescript
export class PaymentService {
  async processWebhook(payload: any) {
    // Validate, create records, return result
    // NO state maintained between calls
  }
}
```

### Models (packages/core/src/models/)
Database access layer using `pg-promise`:
```typescript
export class PaymentModel {
  async create(data: CreatePaymentInput): Promise<Payment> {
    return this.db.one('INSERT INTO payments ... RETURNING *', [...]);
  }
}
```

### Error Handling
Custom errors with `code` and `message`. Global error middleware in `packages/api/src/middleware/error.middleware.ts`:
```typescript
{ success: false, error: { code: 'PAYMENT_NOT_FOUND', message: '...' } }
```

## Authentication

**API Key auth**: `x-api-key` header format `pk_*`. Middleware extracts user from database and attaches to `req.user`.

Protected routes use `authenticateApiKey` middleware.

## Testing & Debugging

**Test scripts** in `packages/api/scripts/`:
- `test-payment.js`: Simulate webhook
- `test-conversion.js`: Quote → conversion flow
- `test-fees.js`: Fee calculation edge cases

**Debug checklist:**
- Payment webhook not received? Verify `TELEGRAM_BOT_TOKEN` and webhook URL
- Conversion stuck? Run `ReconciliationService.checkConsistency()` for stale states
- Rate unexpected? Check `RateAggregator` API keys
- Database errors? Run `npm run migrate:status` to check pending migrations

## Common Tasks

**Adding a new API endpoint:**
1. Create controller method in `packages/api/src/controllers/`
2. Add route to `packages/api/src/routes/v1.routes.ts`
3. Call core service from `@tg-payment/core`
4. Return standardized response format

**Adding database fields:**
1. Create migration in `database/migrations/` (next number)
2. Add field to SQL schema
3. Update TypeScript type in `packages/core/src/types/`
4. Update model methods if needed

**Debugging payment flow:**
1. Check webhook in DB: `SELECT * FROM payments ORDER BY created_at DESC LIMIT 1;`
2. Trace status through conversions table
3. Check `error_message` column for failure reasons
4. Use `ReconciliationService` for stuck payments

## Important Gotchas

1. **Workspace setup**: After cloning, run `npm install` to hoist dependencies. Docker volumes must mount `./packages`.

2. **Direct blockchain**: All conversions go directly to TON—no Fragment intermediary. Requires `TON_API_KEY` from Toncenter.

3. **Rate locking**: Conversions lock rates for `RATE_LOCK_DURATION_SECONDS`. Check `rate_locked_until` timestamp.

4. **No Fragment fees**: FeeService calculates only platform + network fees. Remove Fragment-related fee logic.

5. **Migration source**: Canonical migration location is `database/migrations/` (run by `database/migrate.js`).

## Build & Deploy

```bash
# Build all packages
npm run build --workspaces

# Run tests
npm run test --workspaces

# Lint
npm run lint

# Format code
npm run format
```

Docker image: `Dockerfile` at root. Builds and runs API on port 3000.

Deployment targets: Render, Railway, or self-hosted VPS.

---

**For the latest feature roadmap, see `docs/DEVELOPMENT.md`** (16-week phased rollout).

**This file is optimized for AI agents. Update when architecture changes or new patterns emerge.**
