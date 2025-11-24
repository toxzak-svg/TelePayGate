import { KmsProvider } from "./kms.service";
import { KMSClient, EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms";

const KEY_ID = process.env.AWS_KMS_KEY_ID;
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

if (!KEY_ID) {
  // Nothing — provider may not be used.
}

export function createAwsKmsProvider(): KmsProvider {
  const client = new KMSClient({ region: REGION });

  return {
    async encrypt(plaintext: string) {
      if (!KEY_ID) throw new Error("AWS_KMS_KEY_ID not set");
      const cmd = new EncryptCommand({
        KeyId: KEY_ID,
        Plaintext: Buffer.from(plaintext, "utf8"),
      });
      const res = await client.send(cmd);
      if (!res.CiphertextBlob)
        throw new Error("KMS encrypt returned empty CiphertextBlob");
      return Buffer.from(res.CiphertextBlob).toString("base64");
    },
    async decrypt(blobBase64: string) {
      const blob = Buffer.from(blobBase64, "base64");
      const cmd = new DecryptCommand({ CiphertextBlob: blob });
      const res = await client.send(cmd);
      if (!res.Plaintext)
        throw new Error("KMS decrypt returned empty Plaintext");
      return Buffer.from(res.Plaintext).toString("utf8");
    },
  };
}

export default createAwsKmsProvider;
