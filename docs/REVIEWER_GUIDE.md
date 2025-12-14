# Reviewer Guide

This guide helps Telegram Apps Center reviewers exercise TelePayGate end-to-end.

Prerequisites
- Public HTTPS endpoint for the API and dashboard (ensure TLS certificate).
- Bot token from @BotFather configured in `TELEGRAM_BOT_TOKEN`.
- Webhook secret configured in `TELEGRAM_WEBHOOK_SECRET` / `WEBHOOK_SECRET`.

Important links
- Privacy Policy: /docs/PRIVACY.md
- Terms of Service: /docs/TERMS.md
- Documentation Index: /docs/INDEX.md

Quick test steps

1. Create a developer account (or use test account):
   - Sign up at the dashboard and create an API key.
2. Configure webhook for review:
   - Ensure the service is running and reachable at `https://<your-domain>/v1/payments/webhook`.
   - If you need to manually test webhook delivery, run the following (replace SECRET and URL):

```bash
PAYLOAD='{"update_id":100000000,"message":{"message_id":1,"from":{"id":12345},"chat":{"id":12345},"successful_payment":{"currency":"USD","total_amount":1000}}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "YOUR_WEBHOOK_SECRET" | sed 's/^.* //')
curl -v -H "Content-Type: application/json" -H "X-Webhook-Signature: $SIGNATURE" -d "$PAYLOAD" https://<your-domain>/v1/payments/webhook
```

3. Verify webhook delivery and processing:
   - The server should return HTTP 200.
   - Check the dashboard payments list and `payments` table for a new record.
4. Simulate deposit monitoring (if applicable):
   - Use the worker endpoints or run the deposit monitor in dev mode to mark a deposit as confirmed.
5. Check webhooks dispatched to developer URLs:
   - Confirm `webhook_events` entries and HMAC signatures in the `X-Webhook-Signature` header.

Test credentials
- Provide reviewer with a temporary test bot token and a short-lived API key if you want them to test live flows. Do this only on request.

Notes for reviewers
- Look for clear HMAC verification headers, TLS, and proper error codes on invalid signatures.
- Payment privacy: do not expect to see PII; Telegram user IDs are recorded as numeric IDs only.

Contact for issues
- support@example.com

This document is a draft — replace placeholders with real domain, secrets, and credentials before submission.