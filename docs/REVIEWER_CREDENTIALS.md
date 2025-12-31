# Reviewer Credentials & Test Instructions

This document describes how to test TelePayGate with temporary/demo credentials. DO NOT publish long-lived production secrets.

Demo accounts
- Dashboard demo account (create via Signup or provide temporary test account on request)
- Developer webhook URL: reviewers should configure any public endpoint (e.g., webhook.site) to receive developer webhooks

Test bot
- Create a temporary bot with @BotFather and provide the token to reviewers only when asked. Rotate token after review.

Sample test steps
1. Reviewer obtains a temporary API key from the dashboard (or the reviewer uses a provided demo API key).
2. Set webhook to `https://<your-domain>/v1/payments/webhook` using Bot API or let the service set it automatically.
3. Use the `DEMO.md` script to generate a `successful_payment` payload and HMAC signature to POST to the webhook endpoint.
4. Verify payment appears in the dashboard and that developer webhooks (to webhook.site or provided URL) are delivered with `X-Webhook-Signature`.

Temporary secrets handling
- Provide ephemeral tokens only to reviewers.
- After review, revoke tokens and rotate `TELEGRAM_BOT_TOKEN`.

Contact
- support@example.com
