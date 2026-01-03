/**
 * Lightweight KMS abstraction for local dev fallback and future KMS integration.
 *
 * - In production, replace the simple provider with a real KMS implementation
 *   (AWS KMS, Google KMS, Azure Key Vault, HashiCorp Vault, etc.).
 * - For local development the service falls back to using `WALLET_ENCRYPTION_KEY` env var.
 */

import crypto from "crypto";

const ENV_KEY_NAME = "WALLET_ENCRYPTION_KEY";

export type KmsProvider = {
  // Accepts plaintext string and returns base64 encoded encrypted blob
  encrypt: (plaintext: string) => Promise<string>;
  // Accepts base64 encrypted blob and returns plaintext string
  decrypt: (blobBase64: string) => Promise<string>;
};

// In-memory provider using env key (AES-256-GCM) for local/dev.
// SECURITY FIX: Never fall back to base64 encoding (not encryption)
// Throw error if encryption key is not properly configured
const envProvider: KmsProvider = {
  async encrypt(plaintext: string) {
    const keyHex = process.env[ENV_KEY_NAME];
    if (!keyHex) {
      throw new Error(
        `${ENV_KEY_NAME} environment variable is required for encryption. ` +
        `Please set a 64-character hex string (32 bytes for AES-256-GCM).`
      );
    }
    if (keyHex.length < 64) {
      throw new Error(
        `${ENV_KEY_NAME} must be at least 64 characters (32 bytes for AES-256-GCM). ` +
        `Current length: ${keyHex.length}.`
      );
    }
    const key = Buffer.from(keyHex, "hex");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
  },
  async decrypt(blobBase64: string) {
    const keyHex = process.env[ENV_KEY_NAME];
    if (!keyHex) {
      throw new Error(
        `${ENV_KEY_NAME} environment variable is required for decryption. ` +
        `Please set a 64-character hex string (32 bytes for AES-256-GCM).`
      );
    }
    if (keyHex.length < 64) {
      throw new Error(
        `${ENV_KEY_NAME} must be at least 64 characters (32 bytes for AES-256-GCM). ` +
        `Current length: ${keyHex.length}.`
      );
    }
    const data = Buffer.from(blobBase64, "base64");
    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const encrypted = data.slice(28);
    const key = Buffer.from(keyHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  },
};

// Default provider can be swapped by calling `setProvider` during app init.
let provider: KmsProvider = envProvider;

export function setKmsProvider(p: KmsProvider) {
  provider = p;
}

export function getKmsProvider(): KmsProvider {
  return provider;
}

export async function encryptSecret(plain: string): Promise<string> {
  return provider.encrypt(plain);
}

export async function decryptSecret(blobBase64: string): Promise<string> {
  return provider.decrypt(blobBase64);
}

export default {
  setKmsProvider,
  getKmsProvider,
  encryptSecret,
  decryptSecret,
};
