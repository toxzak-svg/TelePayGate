# Payments & Compliance

This document describes TelePayGate's payment flow, fee model, refund policy, third-party integrations, and compliance considerations.

Overview
- TelePayGate converts Telegram Stars to TON (and optionally fiat) using decentralized P2P liquidity pools (DeDust, Ston.fi).
- No centralized custodian or exchange is used by the gateway; conversions occur directly via smart contract or P2P pool interactions.

Fee Model
- Platform fee: configurable per account (expressed as percentage of conversion).
- Telegram fee: passed through as necessary.
- DEX/slippage: variable depending on pool liquidity; we recommend adding a slippage tolerance (`DEX_SLIPPAGE_TOLERANCE` env var).
- Fee calculation is performed server-side via `FeeService` (see `packages/core/src/services/fee.service.ts`).

Refunds
- Refunds are processed at the developer's discretion. On-chain reversals are generally irreversible; refunds may require off-chain settlement with the developer.
- The system stores transaction metadata to support reconciliation and dispute resolution.

Third-party services
- TON blockchain via TonWeb/@ton/ton
- DeDust and Ston.fi for P2P liquidity
- Hosting providers (Render, Netlify, AWS) for dashboards and APIs

Compliance notes
- No-KYC model: The gateway itself does not perform KYC; developers using TelePayGate should ensure compliance with local regulations.
- Data retention: Payment logs retained for 180 days minimum; longer retention may be enforced where legally required.
- Prohibited activities: Money laundering, fraud, terrorism financing — we reserve the right to suspend accounts.

Security controls
- Webhook signatures: HMAC-SHA256 using `WEBHOOK_SECRET` and `TELEGRAM_WEBHOOK_SECRET`.
- Mnemonic & key handling: Use `WALLET_ENCRYPTION_KEY` and recommend storing encrypted keys in a KMS for production.

Audit & Reporting
- Provide developer-facing reports via the dashboard and webhooks for `conversion.completed` and `settlement.completed` events.
- Keep an audit trail for all conversion events.

Contact for compliance inquiries: support@example.com
