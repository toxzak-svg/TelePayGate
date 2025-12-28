# Deploying TelePayGate to Render (Blueprint)

This guide shows the exact commands to deploy the repository to Render using `render.yaml`.

Prerequisites
- Install Render CLI: https://render.com/docs/cli
- Create a Render account and log in (or use API key)
- Ensure `render.yaml` is present at repo root (it is)
- Create `.env.render` by copying `.env.render.example` and filling production secrets

Quick commands

1. Copy example env and edit values:

```bash
cp .env.render.example .env.render
# edit .env.render and fill secrets (TON_WALLET_MNEMONIC, TELEGRAM_BOT_TOKEN, etc.)
```

2. Deploy the blueprint (the script wraps the command):

```bash
./scripts/deploy-render-blueprint.sh .env.render
```

This runs:

```bash
render blueprint deploy --file render.yaml --env-file .env.render
```

Notes
- Render will prompt for any `sync: false` secret values that are missing from the env file.
- If you prefer the Render Dashboard UI, you can create services and paste secrets manually as described in `docs/RENDER_ENV_SETUP.md`.

Using Render API key (CI/CD)

You can also run deploy from CI by setting `RENDER_API_KEY` in your CI environment and calling:

```bash
render login --api-key "$RENDER_API_KEY"
render blueprint deploy --file render.yaml --env-file .env.render
```

Post-deploy
- After deploy completes, verify these endpoints:
  - API health: `https://<api-service-url>/health`
  - Dashboard: `https://<dashboard-service-url>/`
  - Webhook endpoint: `https://<api-service-url>/v1/payments/webhook`

- Set Telegram webhook to the API URL using Bot API:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" -F "url=https://${API_DOMAIN}/v1/payments/webhook"
```

Security
- Rotate any temporary tokens after review and never commit secrets to the repo.

If you want me to run the `render blueprint deploy` command here, provide a Render API key with `blueprint:deploy` permission and confirm; otherwise run the above locally or in CI.