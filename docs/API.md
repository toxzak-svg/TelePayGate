# API Reference

Complete reference for the Telegram Payment Gateway REST API.

## Base URL

Production: https://api.yourgateway.com/v1
Development: http://localhost:3000/api/v1

Use the Base URL above when calling API endpoints. The `/api/v1` prefix is the canonical versioned namespace for this project.


## Authentication

All endpoints (except registration and webhooks) require authentication via API key.

### Authentication Methods

**Method 1: Header (Recommended)**
X-API-Key: pk_your_api_key

Example (curl):

```bash
curl -H "X-API-Key: pk_your_api_key" "http://localhost:3000/api/v1/users/me"
```


**Method 2: Bearer Token**
Authorization: Bearer pk_your_api_key


**Method 3: Query Parameter**
GET /api/v1/payments?api_key=pk_your_api_key

Query param auth is supported for convenience but is discouraged for production traffic since URLs may be logged and expose sensitive keys.


---

## User Endpoints

>>>>>>> 88af574 (docs: add docs linter + spellcheck workflow and populate core docs (API, integration, architecture))
### Register New User

Create a new user account and receive API credentials (API key + secret). Store secrets in a secure vault — the server will show the `apiSecret` only once.

**Endpoint:** `POST /api/v1/users/register`  
**Authentication:** None

**Request Example:**
```json
{
  "appName": "My Telegram Bot",
  "description": "Bot description (optional)",
  "webhookUrl": "https://myapp.com/webhook"
}
```

**Response Example (201 Created):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-v4",
    "appName": "My Telegram Bot",
    "apiKey": "pk_abc123...",
    "apiSecret": "sk_xyz789...",
    "kycStatus": "pending",
    "createdAt": "2025-11-12T18:00:00Z"
  }
}
```

Notes:
- The registered `apiSecret` is shown only once — store it securely (vault / environment variable) and never commit it to source control.
- `webhookUrl` will be called by Telegram and TON-related workflows; make sure it is reachable and uses HTTPS in production.
**Endpoint:** `GET /api/v1/users/me`  
**Authentication:** Required

**Response Example (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-v4",
    "appName": "My Telegram Bot",
    "apiKey": "pk_***",
    "webhookUrl": "https://myapp.com/webhook",
    "kycStatus": "pending",
    "createdAt": "2025-11-12T18:00:00Z",
    "updatedAt": "2025-11-12T18:30:00Z"
  }
}
```
```


---

### Regenerate API Keys

Generate new API credentials. Old keys are immediately invalidated.

**Endpoint:** `POST /api/v1/users/api-keys/regenerate`  
**Authentication:** Required

**Response Example (200 OK):**
```json
{
  "success": true,
  "apiKey": "pk_new123...",
  "apiSecret": "sk_new789...",
  "message": "API keys regenerated successfully"
}
```


**⚠️ Warning:** Old keys stop working immediately.

---

## Payment Endpoints
 
## Authentication / Session Endpoints

These endpoints implement the passwordless magic-link + optional TOTP flows used by the dashboard and SDK. If you are using API keys for machine-to-machine integrations, you do not need these endpoints.

### Request Magic Link

**Endpoint:** `POST /api/v1/auth/magic-link`  
**Authentication:** None

**Request Example (application/json):**
```json
{ "email": "dev@example.com" }
```

**Response (202 Accepted):**
```json
{ "success": true, "message": "Magic link requested" }
```

### Verify Magic Link / Create Session

**Endpoint:** `POST /api/v1/auth/magic-link/verify`  
**Authentication:** None

**Request:**
```json
{ "token": "magic-token-from-email" }
```

**Response (200):** Sets secure session cookie and returns 200 with user details, or 206 if TOTP is required.

### TOTP (Optional)

`POST /api/v1/auth/totp/enable` — Begin TOTP provisioning (returns otpauth string + QR data).

`POST /api/v1/auth/totp/confirm` — Confirm provisioning by validating a 6-digit code.

`POST /api/v1/auth/totp/verify` — Verify code during login flow when TOTP is enabled.

### Session Management

`POST /api/v1/auth/logout` — Revoke session cookie (HTTP-only) and clear user session.

`POST /api/v1/auth/session/refresh` — Refresh session (rotate cookie/refresh token), returns a new session cookie.

### Backup / Recovery

`POST /api/v1/auth/backup-codes/generate` — Generate one-time backup codes for account recovery.


### Telegram Webhook

Receive payment notifications from Telegram Bot API.

**Endpoint:** `POST /api/v1/payments/webhook`  
**Authentication:** Header `X-User-Id: uuid-v4`

**Request Body:**
{
"update_id": 123456789,
"message": {
"successful_payment": {
"currency": "XTR",
"total_amount": 1000,
"invoice_payload": "user_defined_payload",
"telegram_payment_charge_id": "tg_charge_123",
"provider_payment_charge_id": "provider_123"
}
}
}


**Response:** `200 OK`
{
"success": true,
"payment": {
"id": "payment-uuid",
"starsAmount": 1000,
"status": "received",
"telegramPaymentId": "tg_charge_123",
"createdAt": "2025-11-12T18:00:00Z"
}
}


**Rate Limit:** 100 requests/minute

---

### TON Transaction Webhook

Receive notifications about TON blockchain transactions (deposits).

**Endpoint:** `POST /api/v1/webhooks/ton-transaction`  
**Authentication:** None (Public endpoint for blockchain scanners)

**Request Body:**
```json
{
  "tx_hash": "unmatched_tx_hash",
  "sender": "some_ton_address",
  "amount": "1000000000",
  "destination": "our_custodial_wallet_address"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Webhook received"
}
```

---

### Get Payment Details

Retrieve details for a specific payment.

**Endpoint:** `GET /api/v1/payments/:id`  
**Authentication:** Required

**Response:** `200 OK`
{
"success": true,
"payment": {
"id": "payment-uuid",
"userId": "user-uuid",
"telegramInvoiceId": "inv_123",
"starsAmount": 1000,
"status": "received",
"telegramPaymentId": "tg_charge_123",
"createdAt": "2025-11-12T18:00:00Z",
"updatedAt": "2025-11-12T18:00:00Z"
}
}


---

### List Payments

List all payments with pagination and filtering.

**Endpoint:** `GET /api/v1/payments`  
**Authentication:** Required

**Query Parameters:**
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 100) - Results per page
- `status` (string, optional) - Filter by status: `pending`, `received`, `converting`, `converted`, `settled`, `failed`

**Example:**
GET /api/v1/payments?page=1&limit=20&status=received


**Response:** `200 OK`
{
"success": true,
"payments": [
{
"id": "payment-uuid-1",
"starsAmount": 1000,
"status": "received",
"createdAt": "2025-11-12T18:00:00Z"
}
],
"pagination": {
"page": 1,
"limit": 20,
"total": 150,
"pages": 8
}

## Fee collection & settlement

Endpoints for fee collection, fee statistics and settlement triggers. Some endpoints are admin-only.

`GET /api/v1/fees/stats` — Aggregated fee statistics (collected, pending, sweep history)

`GET /api/v1/fees/history` — Paginated list of fee collection events

`GET /api/v1/fees/uncollected` — List pending uncollected fees suitable for sweep planning

`GET /api/v1/fees/collections` — List fee collection batches

`POST /api/v1/fees/collect` — Trigger a manual fee collection / sweep (admin-only)

`POST /api/v1/fees/collections/:id/complete` — Mark a collection batch as completed (admin-only)

}


---

### Get Payment Statistics

Get aggregated statistics for user's payments.

**Endpoint:** `GET /api/v1/payments/stats`  
**Authentication:** Required

**Response:** `200 OK`
{
"success": true,
"stats": {
"totalPayments": 150,
"totalStars": 750000,
"byStatus": {
"pending": 5,
"received": 120,
"converting": 10,
"converted": 10,
"settled": 5,
"failed": 0
}
}
}


---

## Conversion Endpoints

### Estimate Conversion

Get an estimated conversion rate without locking.

**Endpoint:** `POST /api/v1/conversions/estimate`  
**Authentication:** Required

**Request Body:**
{
"sourceAmount": 1000,
"sourceCurrency": "STARS",
"targetCurrency": "TON"
}


**Response:** `200 OK`
{
"success": true,
"estimate": {
"sourceAmount": 1000,
"sourceCurrency": "STARS",
"targetCurrency": "TON",
"estimatedAmount": 0.99,
"exchangeRate": 0.00099,
"fees": {
"telegram": 10,
"dex": 5,
"network": 2,
"total": 17
},
"netAmount": 0.983,
"validUntil": 1699564800000
}
}


---

### Lock Conversion Rate

Lock an exchange rate for a specified duration.

**Endpoint:** `POST /api/v1/conversions/lock-rate`  
**Authentication:** Required

**Request Body:**
{
"sourceAmount": 1000,
"sourceCurrency": "STARS",
"targetCurrency": "TON",
"durationSeconds": 300
}


**Response:** `200 OK`
{
"success": true,
"rateLock": {
"id": "lock-uuid",
"exchangeRate": 0.00099,
"lockedUntil": 1699565100000,
"sourceAmount": 1000,
"targetCurrency": "TON"
}
}


**Notes:**
- Minimum lock duration: 60 seconds
- Maximum lock duration: 600 seconds (10 minutes)
- Rate locks cannot be extended

---

### Create Conversion

Create a new conversion from Stars to target currency.

**Endpoint:** `POST /api/v1/conversions/create`  
**Authentication:** Required

**Request Body:**
{
"paymentIds": ["payment-uuid-1", "payment-uuid-2"],
"targetCurrency": "TON",
"rateLockId": "lock-uuid"
}


**Response:** `201 Created`
{
"success": true,
"conversion": {
"id": "conversion-uuid",
"paymentIds": ["payment-uuid-1", "payment-uuid-2"],
"sourceCurrency": "STARS",
"targetCurrency": "TON",
"sourceAmount": 5000,
"targetAmount": 4.95,
"exchangeRate": 0.00099,
"status": "pending",
"fees": {
"telegram": 50,
"dex": 25,
"total": 75
},
"createdAt": "2025-11-12T18:00:00Z"
}
}


**Requirements:**
- Minimum 1000 Stars per conversion
- All payments must be in `received` status
- Rate lock (if provided) must be valid

---

### Get Conversion Status

Check the status of an ongoing conversion.

**Endpoint:** `GET /api/v1/conversions/:id/status`  
**Authentication:** Required

**Response:** `200 OK`
{
"success": true,
"status": {
"conversion": {
"id": "conversion-uuid",
"status": "phase2_committed",
"sourceAmount": 5000,
"targetAmount": 4.95,
"dexPoolId": "dedust_pool_123",
"tonTxHash": "ton_hash_456"
},
"progress": {
"phase": "phase2_committed",
"percentage": 66,
"estimatedCompletion": 1699565400000
}
}
}


**Status Values:**
- `pending` - Conversion created
- `rate_locked` - Rate locked
- `phase1_prepared` - Payments verified
- `phase2_committed` - Submitted to DEX pool
- `phase3_confirmed` - TON received
- `completed` - Conversion complete
- `failed` - Conversion failed

---

### List Conversions

List all conversions with pagination and filtering.

**Endpoint:** `GET /api/v1/conversions`  
**Authentication:** Required

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)
- `status` (string, optional)

**Response:** `200 OK`
{
"success": true,
"conversions": [
{
"id": "conversion-uuid",
"sourceAmount": 5000,
"targetAmount": 4.95,
"status": "completed",
"createdAt": "2025-11-12T18:00:00Z"
}
],
"pagination": {
"page": 1,
"limit": 20,
"total": 50,
"pages": 3
}
}


---

## Rate Limits

| Endpoint Type | Rate Limit |
|--------------|------------|
| User Registration | 10 req/min per IP |
| Standard API | 60 req/min per user |
| Webhooks | 100 req/min per user |

**Rate Limit Headers:**
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699565400


---

## System & Admin endpoints

### Health check

Simple operational health check for the API (useful for load-balancers and uptime probes).

**Endpoint:** `GET /api/v1/health`  
**Authentication:** None (public)

**Response (200 OK):**
```json
{
  "status": "ok",
  "database": "connected",
  "cache": "connected",
  "uptime": 12345
}
```

### Admin / Dashboard endpoints (requires admin or dashboard role)

These endpoints are used by the admin dashboard and require an API key with an admin role or a dashboard session with `admin` privileges.

`GET /api/v1/admin/stats` — Returns high level KPIs (revenue, volumes, success rates)

`GET /api/v1/admin/revenue` — Returns revenue series for the given timespan

`GET /api/v1/admin/revenue/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` — Summary statistics

`GET /api/v1/admin/transactions/summary?startDate=...&endDate=...` — Transaction summaries

`GET /api/v1/admin/users` — List dashboard users

`GET /api/v1/admin/config` — Read runtime configuration (fee structure, thresholds)

`PUT /api/v1/admin/config` — Update runtime configuration (admin only)

`GET /api/v1/admin/payments` — Query payments across merchants (admin-only)

`GET /api/v1/admin/conversions` — Query conversions across the system (admin-only)


## Error Responses

All errors follow this format:

{
"success": false,
"error": {
"code": "ERROR_CODE",
"message": "Human-readable error message",
"details": {}
}
}


### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `MINIMUM_AMOUNT_NOT_MET` | 400 | Below 1000 Stars minimum |
| `INSUFFICIENT_BALANCE` | 400 | Not enough funds |
| `RATE_LOCK_EXPIRED` | 400 | Rate lock no longer valid |
| `CONVERSION_IN_PROGRESS` | 409 | Conversion already processing |
| `INTERNAL_ERROR` | 500 | Server error |

---

## DEX Endpoints

Query decentralized exchange (DEX) data and liquidity pools from DeDust and Ston.fi.

### Get DEX Rates

Fetch current exchange rates from all supported DEX providers.

**Endpoint:** `GET /api/v1/dex/rates`  
**Authentication:** Required

**Query Parameters:**
- `fromToken` (string, required): Source token symbol (e.g., "TON", "USDT")
- `toToken` (string, required): Target token symbol
- `amount` (number, optional): Amount to convert for quote

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "rates": [
      {
        "provider": "dedust",
        "rate": 2.45,
        "poolId": "EQD1...",
        "liquidity": 125000,
        "fee": 0.003,
        "priceImpact": 0.12
      },
      {
        "provider": "stonfi",
        "rate": 2.47,
        "poolId": "EQA2...",
        "liquidity": 98000,
        "fee": 0.0025,
        "priceImpact": 0.15
      }
    ],
    "bestRate": {
      "provider": "stonfi",
      "rate": 2.47,
      "expectedOutput": 12.35
    },
    "timestamp": 1699564800000
  }
}
```

---

### Get DEX Liquidity

Retrieve liquidity pool information for a specific token pair.

**Endpoint:** `GET /api/v1/dex/liquidity`  
**Authentication:** Required

**Query Parameters:**
- `token0` (string, required): First token symbol
- `token1` (string, required): Second token symbol
- `provider` (string, optional): Filter by provider ("dedust", "stonfi", or omit for all)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "pools": [
      {
        "provider": "dedust",
        "poolId": "EQD1...",
        "token0": "TON",
        "token1": "USDT",
        "reserve0": 50000,
        "reserve1": 120000,
        "totalLiquidity": 77460,
        "fee": 0.003,
        "volume24h": 250000,
        "apy": 12.5
      }
    ],
    "totalLiquidity": 77460,
    "aggregatedVolume24h": 250000
  }
}
```

---

### Find Best Route

Find the optimal swap route for a given token pair and amount.

**Endpoint:** `POST /api/v1/dex/route`  
**Authentication:** Required

**Request Body:**
```json
{
  "fromToken": "TON",
  "toToken": "USDT",
  "amount": 10,
  "maxHops": 2
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "route": [
      {
        "provider": "stonfi",
        "poolId": "EQA2...",
        "fromToken": "TON",
        "toToken": "USDT",
        "expectedOutput": 24.7,
        "priceImpact": 0.15,
        "fee": 0.025
      }
    ],
    "totalOutput": 24.7,
    "totalFees": 0.025,
    "priceImpact": 0.15,
    "estimatedGas": 0.05,
    "executionTime": 180
  }
}
```

---

### Execute Swap (Admin Only)

Execute a swap through the DEX (requires admin privileges).

**Endpoint:** `POST /api/v1/dex/swap`  
**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "provider": "stonfi",
  "poolId": "EQA2...",
  "fromToken": "TON",
  "toToken": "USDT",
  "amount": 10,
  "minReceive": 24.0,
  "slippage": 0.5
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "txHash": "abc123...",
    "outputAmount": 24.65,
    "executedRate": 2.465,
    "gasUsed": 0.048,
    "timestamp": 1699564800000
  }
}
```

**Error Codes:**
| Code | Status | Description |
|------|--------|-------------|
| `INSUFFICIENT_LIQUIDITY` | 400 | Pool lacks liquidity |
| `SLIPPAGE_EXCEEDED` | 400 | Price moved beyond tolerance |
| `SWAP_FAILED` | 500 | Blockchain transaction failed |
| `ADMIN_ONLY` | 403 | Admin privileges required |

---

## P2P Order Endpoints

Manage peer-to-peer Stars ↔ TON orders.

### Create P2P Order

Create a new buy or sell order for Stars/TON exchange.

**Endpoint:** `POST /api/v1/p2p/orders`  
**Authentication:** Required

**Request Body:**
```json
{
  "type": "buy",
  "starsAmount": 1000,
  "tonAmount": 5.0,
  "rate": 0.005
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid",
    "type": "buy",
    "starsAmount": 1000,
    "tonAmount": 5.0,
    "rate": 0.005,
    "status": "pending",
    "createdAt": "2025-11-12T18:00:00Z",
    "expiresAt": "2025-11-12T19:00:00Z"
  }
}
```

---

### Get P2P Orders

List all P2P orders (own or available for matching).

**Endpoint:** `GET /api/v1/p2p/orders`  
**Authentication:** Required

**Query Parameters:**
- `type` (string, optional): Filter by "buy" or "sell"
- `status` (string, optional): Filter by status
- `own` (boolean, optional): Show only user's orders

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "orderId": "order-uuid",
        "type": "buy",
        "starsAmount": 1000,
        "tonAmount": 5.0,
        "rate": 0.005,
        "status": "pending",
        "createdAt": "2025-11-12T18:00:00Z"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

---

### Cancel P2P Order

Cancel a pending P2P order.

**Endpoint:** `DELETE /api/v1/p2p/orders/:orderId`  
**Authentication:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

---

## Webhooks

Configure webhook URL in your user profile to receive real-time events.

### Webhook Events

**Payment Received:**
{
"event": "payment.received",
"timestamp": 1699564800000,
"data": {
"paymentId": "payment-uuid",
"starsAmount": 1000
}
}


**Conversion Completed:**
{
"event": "conversion.completed",
"timestamp": 1699564800000,
"data": {
"conversionId": "conversion-uuid",
"tonAmount": 4.95,
"txHash": "ton_hash_456"
}
}


### Webhook Signature Verification

const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
const hmac = crypto.createHmac('sha256', secret);
const digest = hmac.update(payload).digest('hex');
return signature === digest;
}

// Express middleware
app.post('/webhook', (req, res) => {
const signature = req.headers['x-webhook-signature'];
const payload = JSON.stringify(req.body);

if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
return res.status(401).json({ error: 'Invalid signature' });
}

// Process webhook...
});


---

## SDK Usage

For TypeScript/JavaScript projects, use the official SDK.

Install the client SDK and initialize it in your application:

```bash
npm install @tg-payment/sdk
```

```js
import TelegramPaymentGateway from '@tg-payment/sdk';

const gateway = new TelegramPaymentGateway({
  apiKey: process.env.TG_API_KEY,
  apiSecret: process.env.TG_API_SECRET,
});

// Example: estimate a conversion
const estimate = await gateway.estimateConversion({
  starsAmount: 5000,
  targetCurrency: 'TON',
});
console.log('Estimate:', estimate);
```

See [SDK Documentation](../packages/sdk/README.md) for complete reference.