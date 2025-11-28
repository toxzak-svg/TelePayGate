# Docker & docker-compose — Development and local testing

This project includes a multi-stage `Dockerfile` for building a production image and an opinionated `docker-compose.yml` for local development and testing.

Contents
- `docker-compose.yml` — services used for local stacks (db, redis, api, mailhog), plus a `migrations` utility service.
- `docker-compose.override.yml` — development override (volume mounts + dev server commands for `api` and `dashboard`).

Quick start (development)

1. Copy environment file and set secrets (recommended):

```bash
cp .env.example .env
# Edit .env and set values like POSTGRES_PASSWORD, TELEGRAM_BOT_TOKEN, JWT_SECRET, etc.
```

2. Start the stack (background):

```bash
docker-compose up -d
```

3. Run database migrations once the database is healthy:

```bash
docker-compose run --rm migrations
```

4. Check logs and verify services:

```bash
docker-compose logs -f api
```

Dev workflow (live reload and code mounts)

Use the override file to mount your working copy into the containers and run dev servers:

```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

This runs the `api` service in development mode (ts-node-dev) and the `dashboard` vite dev server. Code changes in your workspace will be reflected immediately inside the containers.

Common commands

- Build a production image: `docker build -t tg-payment-gateway .`
- Start the default compose stack: `docker-compose up -d`
- Stop the stack: `docker-compose down`
- Run migrations: `docker-compose run --rm migrations`
- Tail logs: `docker-compose logs -f`

Notes

- The compose file exposes Postgres (5432), Redis (6379), the API (3000) and the dashboard dev server (5173) for convenience in local dev. Use caution before exposing those ports in public environments.
- The `migrations` service is a convenient helper for local development; for production you should run migrations during your CI deployment or release process.
