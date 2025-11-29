import { KmsProvider } from './kms.service';

// The AWS SDK is an optional dependency in some dev environments and CI images.
// Avoid top-level static imports so TypeScript/tsc doesn't fail the build when
// `@aws-sdk/client-kms` isn't installed. We dynamically require the module at
// runtime and return a safe provider that throws helpful errors when used but
// doesn't break builds in environments where KMS is unnecessary.

const KEY_ID = process.env.AWS_KMS_KEY_ID;
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

if (!KEY_ID) {
  // Nothing — provider may not be used.
}

export function createAwsKmsProvider(): KmsProvider {
  // Try to load the AWS SDK client at runtime. If unavailable, return a
  // provider that throws clearly when encrypt/decrypt are called.
  let KMSClient: any | undefined;
  let EncryptCommand: any | undefined;
  let DecryptCommand: any | undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const kms = require('@aws-sdk/client-kms');
    KMSClient = kms?.KMSClient ?? kms?.KmsClient;
    EncryptCommand = kms?.EncryptCommand;
    DecryptCommand = kms?.DecryptCommand;
  } catch (err) {
    KMSClient = undefined;
  }

  if (!KMSClient || !EncryptCommand || !DecryptCommand) {
    // Return a safe stub provider — it will surface a clear runtime error if
    // used, but it won't prevent the project from building in dev environments
    // where the optional SDK is not present.
    return {
      async encrypt() {
        throw new Error('AWS KMS client unavailable: @aws-sdk/client-kms is not installed in this environment.');
      },
      async decrypt() {
        throw new Error('AWS KMS client unavailable: @aws-sdk/client-kms is not installed in this environment.');
      }
    } as KmsProvider;
  }

  const client = new KMSClient({ region: REGION });

  return {
    async encrypt(plaintext: string) {
      if (!KEY_ID) throw new Error('AWS_KMS_KEY_ID not set');
      const cmd = new EncryptCommand({ KeyId: KEY_ID, Plaintext: Buffer.from(plaintext, 'utf8') });
      const res = await client.send(cmd);
      if (!res.CiphertextBlob) throw new Error('KMS encrypt returned empty CiphertextBlob');
      return Buffer.from(res.CiphertextBlob).toString('base64');
    },
    async decrypt(blobBase64: string) {
      const blob = Buffer.from(blobBase64, 'base64');
      const cmd = new DecryptCommand({ CiphertextBlob: blob });
      const res = await client.send(cmd);
      if (!res.Plaintext) throw new Error('KMS decrypt returned empty Plaintext');
      return Buffer.from(res.Plaintext).toString('utf8');
    }
  };
}

export default createAwsKmsProvider;
