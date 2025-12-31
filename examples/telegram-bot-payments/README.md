# Telegram Bot Payments Example (TelePayGate)

Production-ready Telegram bot example integrating the Bot Payments API with TelePayGate payment processing.

## Overview

- Digital storefront with 4 products and inline buttons showing prices in XTR.
- Secure payment flow using `sendInvoice`, `pre_checkout_query`, and `successful_payment`.
- TelePayGate integration for payment logging and settlement verification.
- Rate limiting for outbound API calls and monitoring hooks.

## Setup

1. Create a Telegram bot via BotFather and enable Telegram Stars.
2. Environment variables:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEPAYGATE_API_URL` (default: `http://localhost:3000`)
   - `MONITORING_WEBHOOK_URL` (optional)
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```

## Files

- `src/bot.ts` — Bot implementation and handlers.
- `src/products.ts` — Storefront products and prices.
- `src/telepaygate.ts` — TelePayGate client with auth and retry.
- `src/rateLimiter.ts` — Lightweight rate limiter.
- `src/logger.ts` — Simple structured logging.
- `src/monitoring.ts` — Monitoring webhook integration.
- `tests/*.test.ts` — Unit/integration tests and e2e skeleton.

## Documentation

- See [API.md](./docs/API.md) for TelePayGate integration details.
- See [USER_FLOW.md](./docs/USER_FLOW.md) for user journey and handlers.
- See [ERROR_HANDLING.md](./docs/ERROR_HANDLING.md) for failure modes and responses.

