# Vercel Deployment Build Resolution

## Summary
- Fixed Vercel config conflict by removing the `functions` property when `builds` is present.
- Resolved dashboard build error caused by incorrect named import.
- Verified local builds for Dashboard and API.
- Identified required environment configuration for serverless API on Vercel.

## Observed Errors
- Vercel config error: “The `functions` property cannot be used in conjunction with the `builds` property.”  
  - Cause: `vercel.json` defined both `builds` and `functions`.
  - Fix: Removed `functions` section. The Node function is defined via `builds` entry.
- Dashboard build failed with:
  - `NitroSwaps.tsx (3:9): "api" is not exported by "src/services/api.ts"`
  - Cause: `api` is a default export; page imported it as a named export.
  - Fix: Changed import to `import api from '../services/api'`.

## Local Verification
- Dashboard build:
  - Command: `npm run -w @tg-payment/dashboard build`
  - Result: Success, assets generated under `packages/dashboard/dist`
- API build (typecheck):
  - Command: `npm run -w telepaygate-api build`
  - Result: Success; server code compiles to `packages/api/dist`

## Vercel Configuration
- `vercel.json`:
  - Builds:
    - `@vercel/static-build` for Dashboard (`packages/dashboard`)
    - `@vercel/node` for API entry (`packages/api/vercel.ts`)
  - Rewrites:
    - `/api/v1/*` → `/packages/api/vercel.ts`
    - `/` → Dashboard static `dist/index.html`
  - Env:
    - `VITE_API_URL="/api/v1"` for Dashboard at runtime
- Required Project Environment Variables (set in Vercel Project Settings):
  - `DATABASE_URL`: Postgres connection string accessible from Vercel (e.g., Neon, Supabase, Render)
  - Optional:
    - `TON_API_URL`, `TON_API_KEY`, `TON_WALLET_MNEMONIC` (if Nitro/TON features are used)
    - `JWT_SECRET`, `API_SECRET_KEY`
    - `EMAIL_FROM` and SMTP credentials if email features are used

## Common Issues Checklist
- Dependency conflicts/missing:
  - Ensure workspace install: Vercel uses root `workspaces` to install packages.
  - API depends on `telepaygate-core` via workspace; ensure it’s part of the repo (present under `packages/core`).
- Environment misconfig:
  - `DATABASE_URL` must be set for serverless runtime. Without it, the API handler will fail to initialize the DB.
- Build timeouts:
  - Dashboard builds in ~5–6s locally; if timeouts occur, confirm Node version and cache warm.
- Framework compilation:
  - Vite build expects correct exports; fixed NitroSwaps import.

## Deployment Validation
- Preview Deployment:
  - With corrected `vercel.json`, Vercel should build Dashboard and API.
  - Confirm `/health` and `/api/v1/…` endpoints respond; dashboard static assets load.
- Production Deployment:
  - Promote the successful preview or trigger production build.
  - Validate runtime API DB connection using `DATABASE_URL`.

## Recommendations
- Node version: Use Node 20 in Vercel Project Settings to match workspace engines.
- Secrets management: Store sensitive env vars in Vercel’s env, not in `vercel.json`.
- Monitoring: Enable logs for serverless functions to track DB initialization or external API usage.

## File References
- Updated Vercel config: [vercel.json](file:///c:/dev/projects/TelePayGate/vercel.json)
- Fixed NitroSwaps import: [NitroSwaps.tsx](file:///c:/dev/projects/TelePayGate/packages/dashboard/src/pages/NitroSwaps.tsx)

## CLI Steps Used
- Pull project settings and env:
  - `npx vercel pull` (interactive)
- Local build with Build Output API:
  - `npx vercel build`
  - Results placed in `.vercel/output`
- Preview deploy using prebuilt artifacts:
  - `npx vercel deploy --prebuilt`
- Inspect deployment logs:
  - `npx vercel inspect <preview-url> --logs`
- Promote to production:
  - `npx vercel deploy --prod` (optional after validation)
