# DEX P2P Marketplace

This marketplace matches sellers of Telegram Stars with buyers and routes execution via:
- P2P order book (stars_orders)
- DEX liquidity pools (DeDust, Ston.fi)
- Optional Fragment integration

## Core Components
- P2PLiquidityService: route selection and execution  
  [p2p-liquidity.service.ts](file:///c:/dev/projects/TelePayGate/packages/core/src/services/p2p-liquidity.service.ts)
- DexAggregatorService: multi-DEX quoting and swap execution  
  [dex-aggregator.service.ts](file:///c:/dev/projects/TelePayGate/packages/core/src/services/dex-aggregator.service.ts)
- StarsP2PService: order creation and atomic matching  
  [stars-p2p.service.ts](file:///c:/dev/projects/TelePayGate/packages/core/src/services/stars-p2p.service.ts)
- FragmentService: optional route  
  [fragment.service.ts](file:///c:/dev/projects/TelePayGate/packages/core/src/services/fragment.service.ts)
- ConversionService: conversion orchestration and webhook emission  
  [conversion.service.ts](file:///c:/dev/projects/TelePayGate/packages/core/src/services/conversion.service.ts)

## Environment
```
DEDUST_API_URL=https://api.dedust.io
STONFI_API_URL=https://api.ston.fi
DEX_SLIPPAGE_TOLERANCE=0.5
FRAGMENT_ENABLED=true
FRAGMENT_API_URL=https://fragment.example/api
TON_API_URL=https://toncenter.com/api/v2/jsonRPC
TON_API_KEY=...
TON_WALLET_MNEMONIC=...
```

## Usage
- Sellers create sell orders; buyers create buy orders via API:
  [p2p-orders.controller.ts](file:///c:/dev/projects/TelePayGate/packages/api/src/controllers/p2p-orders.controller.ts)
- Conversion flow:
  - lockRate → createConversion → auto route selection → execute via P2P/DEX/Fragment
- Events:
  - conversion.executed and conversion.completed enqueued to webhook_events

## Testing
- Run core tests:
```
npm run test -w telepaygate-core
```
- Edge cases are covered for routing and matching:
  - [p2p-liquidity.service.test.ts](file:///c:/dev/projects/TelePayGate/packages/core/src/__tests__/unit/p2p-liquidity.service.test.ts)
  - [stars-p2p.service.test.ts](file:///c:/dev/projects/TelePayGate/packages/core/src/__tests__/unit/stars-p2p.service.test.ts)

## Security
- Access control in API controllers for order ownership  
  [p2p-orders.controller.ts](file:///c:/dev/projects/TelePayGate/packages/api/src/controllers/p2p-orders.controller.ts)
- Input validation for order creation and conversion amounts
- Jetton operations (TEP-74) used for TON; ERC-20/721 analogs apply conceptually

## Deployment
- API and Dashboard are deployable on Vercel with serverless handler  
  [vercel.json](file:///c:/dev/projects/TelePayGate/vercel.json)
- Configure environment in Vercel Project settings

## Examples
- Buyer flow:
```
POST /api/v1/p2p/orders { type: "buy", tonAmount: "1.0", rate: "0.000015" }
```
- Seller flow:
```
POST /api/v1/p2p/orders { type: "sell", starsAmount: 1000, rate: "0.000015" }
```
