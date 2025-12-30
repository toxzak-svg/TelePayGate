# Vercel Build Fix Summary (V2)

The Vercel builds were failing due to two main issues:
1.  **Missing Peer Dependencies**: `packages/api` was missing dependencies required by `telepaygate-core`.
2.  **TypeScript Configuration Error**: `packages/api/tsconfig.json` was configured with `"rootDir": "./src"` but included `vercel.ts` which is outside that directory. This caused `npm run build` to fail with `error TS6059`.

## Changes Made

1.  **Updated `packages/api/package.json`**:
    *   Added missing dependencies: `pg-promise`, `@ton/ton`, `@ton/core`, `@ton/crypto`, `tonweb`, `telegraf`, `ioredis`, `nodemailer`, `speakeasy`, `@dedust/sdk`, `@ston-fi/sdk`.

2.  **Updated `packages/api/tsconfig.json`**:
    *   Removed `"vercel.ts"` from the `include` array. This fixes the `TS6059` error and allows `npm run build` to succeed. `vercel.ts` is still compiled by Vercel's `@vercel/node` builder using the project configuration.

## Verification

*   **Local Build**: `npm run build -w telepaygate-api` now passes locally (previously failed).
*   **Dashboard Build**: `npm run build -w @tg-payment/dashboard` passes locally.
*   **Core Build**: `npm run build -w telepaygate-core` passes locally.

## Next Steps

1.  **Push changes**: Commit and push the changes to `packages/api/package.json`, `packages/api/tsconfig.json`, and `package-lock.json`.
2.  **Trigger Redeploy**: Vercel should automatically trigger a new build.
3.  **Environment Variables**: Ensure `DATABASE_URL` and other secrets are set in Vercel.
