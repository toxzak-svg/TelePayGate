# Security & Privacy Checklist

Use this checklist to validate TelePayGate before submission.

- Secrets & env vars
  - Ensure `WALLET_ENCRYPTION_KEY` is set and strong.
  - `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` not committed to repo.

- Key storage
  - Private mnemonics encrypted at rest or stored in a KMS.
  - If using `TON_WALLET_MNEMONIC` for development, rotate in production.

- Transport
  - TLS (HTTPS) enforced for all endpoints including webhooks.
  - HSTS enabled on production domain.

- Webhook verification
  - Validate `X-Webhook-Signature` HMAC on incoming developer webhooks and on incoming Telegram payloads if used.
  - Reject requests with invalid signatures and log the attempt.

- Data minimization
  - Only store Telegram user IDs and necessary payment metadata.
  - Avoid storing PII like names or phone numbers unless necessary; document retention reasons.

- Logging & monitoring
  - Do not log sensitive secrets or full mnemonics.
  - Monitor webhook delivery failures and set alerts for repeated failures.

- Rate limiting & brute force protection
  - Apply rate limits to public endpoints to prevent abuse.

- Incident response
  - Include contact `support@example.com` and an incident response plan in `docs/SECURITY.md`.

- Legal & compliance
  - Ensure privacy/terms mention retention, third-party services (TON, DeDust, Ston.fi), and user rights.

Runbook
- How to rotate `TELEGRAM_BOT_TOKEN`.
- How to rotate `WALLET_ENCRYPTION_KEY` (re-encrypt stored keys).

Replace `support@example.com` and placeholders with production details before submission.