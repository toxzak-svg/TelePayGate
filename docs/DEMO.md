# Demo & Quick Verification

Steps to demo TelePayGate for reviewers or internal QA.

1. Deployment & setup
   - Deploy the API and dashboard to a public domain with TLS.
   - Ensure environment variables: `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `WALLET_ENCRYPTION_KEY`, `TON_API_URL`, `TON_WALLET_MNEMONIC` (if testing TON flows).

2. Create a dashboard account
   - Sign up and create an API key.

3. Set Telegram webhook (if not auto-configured)
   - The service's `Telegram.service.initializeWebhook()` will set the webhook during startup if configured.
   - Alternatively call Bot API directly: `curl -X POST https://api.telegram.org/bot<token>/setWebhook -F "url=https://<your-domain>/v1/payments/webhook"`

4. Simulate a payment
   - Send a `successful_payment` update to `/v1/payments/webhook` with a valid `X-Webhook-Signature` HMAC.

5. Verify conversion and settlement
   - Watch the `conversions` and `settlements` tables, or use the dashboard Payments/Transactions UI.

6. Webhook delivery to developers
   - Create a sample developer webhook URL in the dashboard and confirm receipt of `conversion.completed` events with valid signatures.

7. Teardown
   - Revoke test API keys and rotate `TELEGRAM_BOT_TOKEN` if you used a test bot.

Commands reference

- Set webhook via Bot API:

```bash
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" -F "url=https://${DOMAIN}/v1/payments/webhook"
```

- Generate HMAC for testing payloads (Linux/macOS):

```bash
echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //'
```

Replace placeholders with actual values before testing.