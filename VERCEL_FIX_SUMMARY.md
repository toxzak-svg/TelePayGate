# Vercel Build Fix Summary

The Vercel builds were likely failing due to missing peer dependencies in the `packages/api` workspace. The `telepaygate-core` package lists several critical libraries (like `pg-promise`, `@ton/ton`, etc.) as `peerDependencies`, which means the consumer (`packages/api`) is responsible for installing them.

## Changes Made

1.  **Updated `packages/api/package.json`**:
    *   Added missing dependencies that are required by `telepaygate-core`:
        *   `pg-promise`
        *   `@ton/ton`
        *   `@ton/core`
        *   `@ton/crypto`
        *   `tonweb`
        *   `telegraf`
        *   `ioredis`
        *   `nodemailer`
        *   `speakeasy`
        *   `@dedust/sdk`
        *   `@ston-fi/sdk`

## Verification

*   The `packages/api` build should now succeed on Vercel because `@vercel/node` will be able to resolve these dependencies.
*   The `packages/dashboard` build was already configured correctly and builds locally.

## Next Steps

1.  **Push changes**: Commit and push the changes to `packages/api/package.json` and `package-lock.json`.
2.  **Trigger Redeploy**: Vercel should automatically trigger a new build.
3.  **Check Vercel Logs**: If the build still fails, check the logs for any other missing dependencies or configuration issues.
4.  **Environment Variables**: Ensure all required environment variables (like `DATABASE_URL`, `TON_WALLET_MNEMONIC`, etc.) are set in the Vercel Project Settings.

## Note on Monorepo

The project uses a monorepo structure. Vercel's default behavior usually handles this well, provided the root `package.json` has the correct `postinstall` script (which it does: `"npm run build -w telepaygate-core"`). This ensures the core library is built before the API function is bundled.
