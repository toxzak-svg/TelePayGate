# telepaygate-api

REST API server for TelePayGate — a decentralized payment processor for converting Telegram Stars to TON cryptocurrency.

[![npm version](https://img.shields.io/npm/v/telepaygate-api.svg)](https://www.npmjs.com/package/telepaygate-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Express-based REST API** — Production-ready server with helmet, CORS, rate limiting
- 🔐 **Authentication** — API key auth, magic links, TOTP 2FA support
- 💳 **Payment Endpoints** — Telegram Stars webhook handling, payment status tracking
- 💱 **Conversion API** — Stars → TON quotes and conversion execution
- 🔔 **Webhooks** — Configurable merchant webhook delivery
- 📊 **Admin Dashboard** — Analytics and fee management endpoints
- 🛡️ **Security** — CSRF protection, rate limiting, input validation

## Installation

```bash
npm install telepaygate-api
```

### Peer Dependencies

```bash
npm install pg
```

## Quick Start

### As a standalone server

```bash
# Set environment variables
export DATABASE_URL=postgresql://user:pass@localhost:5432/telepaygate
export PORT=3000

# Run the server
npx telepaygate-api
```

### As a library

```typescript
import createServer from "telepaygate-api/server";
import http from "http";

const app = createServer();
const server = http.createServer(app);

server.listen(3000, () => {
  console.log("API running on port 3000");
});
```

### Using middleware in your own Express app

```typescript
import express from "express";
import { 
  authenticateApiKey, 
  errorHandler, 
  rateLimiter 
} from "telepaygate-api/middleware";
import { v1Routes } from "telepaygate-api/routes";

const app = express();

// Use TelePayGate middleware
app.use(rateLimiter);
app.use("/api/v1", authenticateApiKey, v1Routes);
app.use(errorHandler);
```

## API Endpoints

### Health & Status

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/status` | GET | API status |

### Payments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/payments` | POST | Create payment intent |
| `/api/v1/payments/:id` | GET | Get payment status |
| `/api/v1/payments` | GET | List payments |

### Conversions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/conversions/quote` | POST | Get conversion quote |
| `/api/v1/conversions` | POST | Execute conversion |
| `/api/v1/conversions/:id` | GET | Get conversion status |

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | Register new user |
| `/api/v1/auth/login` | POST | Login with credentials |
| `/api/v1/auth/magic-link` | POST | Request magic link |
| `/api/v1/auth/verify-magic-link` | GET | Verify magic link |
| `/api/v1/auth/totp/setup` | POST | Setup TOTP 2FA |
| `/api/v1/auth/totp/verify` | POST | Verify TOTP code |

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks/telegram` | POST | Telegram payment webhook |
| `/api/v1/webhooks/config` | GET/PUT | Webhook configuration |

### Admin

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/admin/stats` | GET | Dashboard statistics |
| `/api/v1/admin/fees` | GET/PUT | Fee configuration |
| `/api/v1/admin/fees/collect` | POST | Trigger fee collection |

## Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/telepaygate

# Server
PORT=3000
NODE_ENV=production

# Security
API_SECRET_KEY=your-secret-key
JWT_SECRET=your-jwt-secret
CSRF_SECRET=your-csrf-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret

# CORS
CORS_ORIGIN=https://yourdomain.com
```

## Middleware

### Authentication

```typescript
import { authenticateApiKey, requireRole } from "telepaygate-api/middleware";

// Require API key
router.use(authenticateApiKey);

// Require admin role
router.use(requireRole("admin"));
```

### Rate Limiting

```typescript
import { rateLimiter, strictRateLimiter } from "telepaygate-api/middleware";

// Standard rate limit (100 req/15min)
app.use(rateLimiter);

// Strict rate limit for sensitive endpoints
app.use("/auth", strictRateLimiter);
```

### Error Handling

```typescript
import { errorHandler } from "telepaygate-api/middleware";

// Must be last middleware
app.use(errorHandler);
```

## Development

```bash
# Clone the monorepo
git clone https://github.com/toxzak-svg/TelePayGate.git
cd TelePayGate

# Install dependencies
npm install

# Start development server
npm run dev -w telepaygate-api
```

## License

MIT © TelePayGate Team

## Links

- [GitHub Repository](https://github.com/toxzak-svg/TelePayGate)
- [Core Package](https://www.npmjs.com/package/telepaygate-core)
- [API Documentation](https://github.com/toxzak-svg/TelePayGate/blob/main/docs/API.md)
