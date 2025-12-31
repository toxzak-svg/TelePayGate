# Telegram Apps Center Submission Checklist

Use this checklist when preparing to submit TelePayGate to the Telegram Apps Center.

Before you start
- Ensure you have a production domain with HTTPS and valid TLS certificate.
- Ensure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` are configured in production and **never** committed to the repo.
- Prepare short and long descriptions (see `docs/MARKETING.md`).

Assets
- App icon: PNG 512×512 (primary)
- Fallback icon: PNG 192×192
- Screenshots: PNG 1200×800 (3 recommended)
- Optional promo video MP4 (≤30s)

Docs & legal
- Privacy Policy URL (HTTPS) — `https://<your-domain>/PRIVACY/` (MkDocs will serve `/PRIVACY/`)
- Terms of Service URL (HTTPS) — `https://<your-domain>/TERMS/`
- Contact/support email and website

Technical verification
- Webhook endpoint: POST /v1/payments/webhook responding 200
- HMAC verification: `X-Webhook-Signature` present and validated
- BotSet up: Bot token registered via @BotFather with username and description
- Webhook latency: verify median latency < 500ms for webhook processing (depends on deployment)

Reviewer preparation
- Provide temporary test bot token and temporary dashboard API key only to reviewers on request.
- Provide reviewer guide: `docs/REVIEWER_GUIDE.md` and `docs/REVIEWER_CREDENTIALS.md`.

Submission form contents (suggested)
- App name: TelePayGate
- Short description: Decentralized gateway to accept Telegram Stars and convert to TON or fiat.
- Long description: See `docs/MARKETING.md`.
- Category: Finance / Payments
- Tags: payments, telegram, ton, crypto
- Privacy policy URL: `https://<your-domain>/PRIVACY/`
- Terms URL: `https://<your-domain>/TERMS/`
- Support email: support@example.com

After submission
- Monitor review feedback and supply requested logs or temporary credentials promptly.
- Rotate any temporary tokens after review completion.

This file is a template; replace placeholders with real domain and contact information before submission.