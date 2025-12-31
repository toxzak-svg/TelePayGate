# TelePayGate SDK

TypeScript/JavaScript SDK for integrating with the TelePayGate payment gateway API.

[![npm version](https://img.shields.io/npm/v/telepaygate-sdk.svg)](https://www.npmjs.com/package/telepaygate-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install telepaygate-sdk
```

## Quick Start

```typescript
import TelePayGate from 'telepaygate-sdk';

// Initialize client
const gateway = new TelePayGate({
  apiKey: 'pk_your_api_key',
  apiSecret: 'sk_your_api_secret',
  apiUrl: 'https://api.telepaygate.com/v1', // optional
});

// Estimate conversion
const estimate = await gateway.estimateConversion({
  starsAmount: 5000,
  targetCurrency: 'TON',
});

console.log('Estimated TON:', estimate.tonEquivalent);
console.log('Fees:', estimate.fees.total);
```

## Features

- ✅ **Full TypeScript support** - Complete type definitions for all methods
- ✅ **Rate locking** - Lock exchange rates for time-sensitive conversions
- ✅ **Payment tracking** - Monitor payment status in real-time
- ✅ **Conversion management** - Create and track Stars → TON conversions
- ✅ **Error handling** - Comprehensive error types and messages

## API Reference

### Initialize Client

```typescript
const gateway = new TelePayGate({
  apiKey: 'pk_xxx',      // Required: Your public API key
  apiSecret: 'sk_xxx',   // Optional: Your secret API key
  apiUrl: 'https://...', // Optional: Custom API URL
  timeout: 30000,        // Optional: Request timeout (default: 30s)
});
```

### Conversion Methods

#### Estimate Conversion

```typescript
const estimate = await gateway.estimateConversion({
  starsAmount: 5000,
  targetCurrency: 'TON',
});
```

**Response:**
```json
{
  "starsAmount": 5000,
  "tonEquivalent": 4.95,
  "exchangeRate": 0.00099,
  "fees": {
    "telegram": 50,
    "dex": 25,
    "total": 75
  }
}
```

#### Lock Conversion Rate

```typescript
const rateLock = await gateway.lockRate({
  starsAmount: 5000,
  targetCurrency: 'TON',
  durationSeconds: 300, // 5 minutes
});
```

#### Create Conversion

```typescript
const conversion = await gateway.createConversion({
  paymentIds: ['payment-uuid-1', 'payment-uuid-2'],
  targetCurrency: 'TON',
  rateLockId: 'lock-uuid', // optional
});
```

#### Get Conversion Status

```typescript
const status = await gateway.getConversionStatus('conversion-uuid');
```

#### List Conversions

```typescript
const result = await gateway.listConversions({
  page: 1,
  limit: 20,
  status: 'completed', // optional filter
});
```

### Payment Methods

#### Get Payment

```typescript
const payment = await gateway.getPayment('payment-uuid');
```

#### List Payments

```typescript
const result = await gateway.listPayments({
  page: 1,
  limit: 20,
  status: 'received', // optional filter
});
```

#### Get Payment Statistics

```typescript
const stats = await gateway.getPaymentStats();
```

### User Methods

#### Get User Profile

```typescript
const profile = await gateway.getProfile();
```

#### Regenerate API Keys

```typescript
const newKeys = await gateway.regenerateApiKeys();
console.log('New API Key:', newKeys.apiKey);
console.log('New Secret:', newKeys.apiSecret);
```

### Rate Methods

#### Get Exchange Rates

```typescript
const rates = await gateway.getExchangeRates();
```

## Error Handling

All methods throw `APIError` on failure:

```typescript
import TelePayGate, { APIError } from 'telepaygate-sdk';

try {
  const estimate = await gateway.estimateConversion({
    starsAmount: 500, // Below minimum
    targetCurrency: 'TON',
  });
} catch (error) {
  const apiError = error as APIError;
  if (apiError.code === 'MINIMUM_AMOUNT_NOT_MET') {
    console.error('Amount too small:', apiError.message);
  }
}
```

**Error Structure:**
```typescript
interface APIError {
  message: string;   // Human-readable error message
  code: string;      // Machine-readable error code
  status: number;    // HTTP status code
  details?: any;     // Additional error details
}
```

## TypeScript Support

All types are exported for your convenience:

```typescript
import type {
  Conversion,
  Payment,
  ConversionStatusType,
  Currency,
  PaymentGatewayConfig,
  EstimationParams,
  EstimationResult,
} from 'telepaygate-sdk';
```

## Related Packages

- [`telepaygate-core`](https://www.npmjs.com/package/telepaygate-core) - Core business logic
- [`telepaygate-api`](https://www.npmjs.com/package/telepaygate-api) - REST API server

## License

MIT
