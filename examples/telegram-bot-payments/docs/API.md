# TelePayGate Integration API

This bot integrates with TelePayGate via the public REST API.

## Endpoints

- `POST /api/v1/payments/webhook`
  - Purpose: Log Telegram payment update and create payment record.
  - Headers:
    - `X-User-Id`: Deterministic UUID derived from Telegram `from.id`.
  - Body: Telegram update subset with `successful_payment`.
  - Response: `{ payment: { id, starsAmount, status }, message }`

- `GET /api/v1/payments/:id`
  - Purpose: Fetch payment status.
  - Headers:
    - `X-API-Key`: Derived API key based on user id.
  - Response: `{ payment: { id, status, starsAmount, ... } }`

## Authentication

The bot derives credentials from Telegram `userId`:

1. Normalize: `uuidv5(userId, USER_ID_NAMESPACE)`
2. Suffix: first 16 chars of normalized UUID without dashes
3. Keys:
   - API Key: `pk_${suffix}`
   - API Secret: `sk_${suffix}`

This mirrors server-side provisioning to enable verification and reads.

## Retry & Rate Limit

- All outbound calls are wrapped in a simple token-bucket limiter.
- Settlement verification uses exponential backoff with configurable retries.

