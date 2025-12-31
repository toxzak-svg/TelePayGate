# KMS Integration

This document describes the KMS abstraction used by `@tg-payment/core` and how to configure a production KMS (e.g. AWS KMS).

## Default behavior

- The code includes a lightweight KMS abstraction in `packages/core/src/services/kms.service.ts`.
- By default the abstraction uses the `WALLET_ENCRYPTION_KEY` environment variable (hex, 32 bytes / 64 hex chars) to perform AES-256-GCM encryption in local/dev environments.
- If `WALLET_ENCRYPTION_KEY` is not present, the abstraction falls back to base64 encode/decode (development-only and not secure).

## AWS KMS

An AWS KMS adapter is provided at `packages/core/src/services/kms.aws.ts`.

To enable AWS KMS provider at startup, set the following env vars:

- `AWS_KMS_KEY_ID` — the KMS Key ARN or alias (e.g. `arn:aws:kms:...:key/abcd` or `alias/my-key`).
- `AWS_REGION` or `AWS_DEFAULT_REGION` — region for KMS client.

When `AWS_KMS_KEY_ID` is set, the core package will attempt to configure the AWS provider automatically during initialization.

### Example (server bootstrap)

No change is necessary — the core package sets the provider when `AWS_KMS_KEY_ID` is present. To explicitly set a custom provider, call:

```ts
import { setKmsProvider } from "@tg-payment/core/src/services/kms.service";
import createAwsKmsProvider from "@tg-payment/core/src/services/kms.aws";

setKmsProvider(createAwsKmsProvider());
```

## Rotations and key management

- For production use, prefer fully-managed KMS (AWS KMS, Google KMS, Vault) and avoid HEX keys in env.
- When rotating keys, ensure your code gracefully re-encrypts secrets or supports multiple keys for decryption.

## Notes

- The KMS adapter returns/accepts base64 strings to remain compatible with existing `bytea` storage patterns.
- The fallback base64 encode/decode is NOT secure and only intended for local development and tests.
