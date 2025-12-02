# @telepaygate/core

Core business logic for TelePayGate — a decentralized payment processor for converting Telegram Stars to TON cryptocurrency through P2P liquidity pools.

[![npm version](https://img.shields.io/npm/v/@telepaygate/core.svg)](https://www.npmjs.com/package/@telepaygate/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🌟 **Telegram Stars Integration** — Process Telegram Stars payments via webhooks
- ⚡ **TON Blockchain** — Direct wallet management, deposit monitoring, and transaction verification
- 💱 **P2P Liquidity Pools** — DEX aggregation via DeDust and Ston.fi (no centralized exchanges)
- 🔐 **Secure Key Management** — Optional AWS KMS integration for wallet encryption
- 📊 **Rate Aggregation** — Multi-source exchange rates with caching and fallback
- 🔄 **State Machine** — Robust payment/conversion status tracking
- 🪝 **Webhook Delivery** — Reliable async webhook dispatch with retry logic

## Installation

```bash
npm install @telepaygate/core
```

### Peer Dependencies

The package requires several peer dependencies. Install the ones you need:

```bash
# Required for blockchain operations
npm install @ton/core @ton/crypto @ton/ton tonweb

# Required for database
npm install pg-promise

# Required for Telegram integration  
npm install telegraf

# Optional: DEX integration
npm install @dedust/sdk @ston-fi/sdk

# Optional: Caching
npm install ioredis

# Optional: AWS KMS for key management
npm install @aws-sdk/client-kms

# Optional: Email (magic link auth)
npm install nodemailer

# Optional: TOTP 2FA
npm install speakeasy
```

## Quick Start

```typescript
import {
  initDatabase,
  PaymentService,
  TonBlockchainService,
  RateAggregatorService,
  config,
} from "@telepaygate/core";

// Initialize database connection
await initDatabase();

// Get current exchange rates
const rates = await RateAggregatorService.getRates();
console.log("TON/USD:", rates.TON_USD);

// Create a payment
const payment = await PaymentService.create({
  userId: "user_123",
  starsAmount: 100,
  telegramPaymentId: "tg_pay_xyz",
});

// Monitor TON deposits
const deposits = await TonBlockchainService.checkDeposits(walletAddress);
```

## Subpath Exports

Import specific modules for tree-shaking:

```typescript
// Services only
import { PaymentService, FeeService } from "@telepaygate/core/services";

// Models only
import { PaymentModel, ConversionModel } from "@telepaygate/core/models";

// Types only
import type { Payment, Conversion } from "@telepaygate/core/types";

// Utilities only
import { AppError, ValidationError } from "@telepaygate/core/utils";

// Database connection
import { initDatabase, getDatabase } from "@telepaygate/core/db";

// Configuration
import { config } from "@telepaygate/core/config";
```

## Configuration

Set environment variables for configuration:

```bash
# Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/telepaygate

# TON Blockchain (required for blockchain ops)
TON_WALLET_MNEMONIC="your 24 word mnemonic phrase"
TON_API_KEY=your_toncenter_key
TON_MAINNET=true

# Telegram (required for payment webhooks)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# DEX Integration (optional)
DEDUST_API_URL=https://api.dedust.io
STONFI_API_URL=https://api.ston.fi
DEX_SLIPPAGE_TOLERANCE=0.5

# Rate Sources (optional)
COINGECKO_API_KEY=your_key
COINMARKETCAP_API_KEY=your_key

# AWS KMS (optional)
AWS_KMS_KEY_ID=your_kms_key_id
AWS_REGION=us-east-1
```

## API Reference

### Services

| Service | Description |
|---------|-------------|
| `PaymentService` | Create and manage Telegram Stars payments |
| `TonBlockchainService` | Wallet creation, deposit monitoring, transactions |
| `TonPaymentService` | TON payment processing and verification |
| `DirectConversionService` | Stars → TON → Fiat conversion orchestration |
| `FeeService` | Fee calculation (platform, network, exchange) |
| `RateAggregatorService` | Multi-source exchange rate aggregation |
| `WebhookService` | Async webhook delivery with retries |
| `ReconciliationService` | State consistency validation |
| `AuthService` | API key and user authentication |
| `WalletManagerService` | Custody wallet management |
| `P2PLiquidityService` | DEX pool interactions |
| `DexAggregatorService` | Best rate selection across DEXes |

### Models

| Model | Description |
|-------|-------------|
| `PaymentModel` | Telegram Stars payment records |
| `ConversionModel` | Currency conversion tracking |
| `SettlementModel` | Fiat settlement records |
| `StarsOrderModel` | P2P Stars order book |

### Utilities

| Utility | Description |
|---------|-------------|
| `AppError` | Base error class with error codes |
| `ValidationError` | Input validation errors |
| `ConversionStateMachine` | Payment status transitions |
| `RateLockManager` | Exchange rate locking |
| `ErrorHandler` | Centralized error processing |

## Payment Flow

```
User pays with Telegram Stars
         ↓
PaymentService receives webhook
         ↓
Payment record created (status: pending)
         ↓
RateAggregatorService fetches rates
         ↓
User receives TON deposit address
         ↓
TonBlockchainService monitors deposits
         ↓
Payment confirmed after 10+ blocks
         ↓
P2PLiquidityService executes DEX swap
         ↓
WebhookService notifies merchant
         ↓
Settlement available for withdrawal
```

## Error Handling

```typescript
import { AppError, ErrorCode, ValidationError } from "@telepaygate/core";

try {
  await PaymentService.create(invalidData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Validation failed:", error.message);
  } else if (error instanceof AppError) {
    console.error(`Error [${error.code}]:`, error.message);
  }
}
```

## KMS Integration

For production wallet security, enable AWS KMS:

```typescript
import { initializeKmsProvider } from "@telepaygate/core";

// Set AWS_KMS_KEY_ID environment variable, then:
const kmsEnabled = initializeKmsProvider();
if (kmsEnabled) {
  console.log("AWS KMS configured for wallet encryption");
}
```

## Development

```bash
# Clone the monorepo
git clone https://github.com/toxzak-svg/TelePayGate.git
cd TelePayGate

# Install dependencies
npm install

# Build core package
npm run build -w @telepaygate/core

# Run tests
npm run test -w @telepaygate/core
```

## License

MIT © TelePayGate Team

## Links

- [GitHub Repository](https://github.com/toxzak-svg/TelePayGate)
- [Documentation](https://github.com/toxzak-svg/TelePayGate/tree/main/docs)
- [API Reference](https://github.com/toxzak-svg/TelePayGate/blob/main/docs/API.md)
- [Architecture](https://github.com/toxzak-svg/TelePayGate/blob/main/docs/ARCHITECTURE.md)
