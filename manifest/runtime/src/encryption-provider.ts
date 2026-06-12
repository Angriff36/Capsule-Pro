/**
 * AES-256-GCM encryption provider for Manifest `encrypted` properties.
 *
 * Uses a 256-bit key from the `ENCRYPTION_KEY` environment variable.
 * The key must be a 64-character hex string (32 bytes).
 *
 * The Manifest runtime expects the EncryptionProvider interface:
 *   encrypt(plaintext: string) -> { ciphertext: string, keyId: string }
 *   decrypt(ciphertext: string, keyId: string) -> string
 *
 * The runtime wraps encrypted values in a JSON envelope: {v:1, kid, ct}.
 * This provider's output becomes the `ct` field.
 *
 * Key rotation: when `ENCRYPTION_KEY` is rotated, set `ENCRYPTION_KEY_PREVIOUS`
 * to the old key. The provider will try the current key first, then fall back
 * to the previous key for decryption. This allows graceful rotation without
 * data migration.
 *
 * Security notes:
 * - AES-256-GCM provides authenticated encryption (confidentiality + integrity)
 * - Each encryption uses a unique 12-byte IV (nonce) generated via crypto.randomBytes
 * - The IV is prepended to the ciphertext for storage (first 24 hex chars)
 * - The keyId is derived from a SHA-256 hash of the key (first 8 chars), allowing
 *   the runtime to identify which key encrypted a given value
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit IV for GCM
const AUTH_TAG_BYTES = 16; // 128-bit auth tag
const KEY_BYTES = 32; // 256-bit key

/**
 * Derive a short key identifier from the encryption key.
 * This allows the runtime to know which key encrypted a value.
 */
function deriveKeyId(key: Buffer): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 8);
}

/**
 * Parse a hex-encoded encryption key from an environment variable.
 * Validates length and hex format. Returns null if missing or invalid.
 */
function parseKey(envValue: string | undefined): Buffer | null {
  if (!envValue) {
    return null;
  }
  if (!/^[0-9a-fA-F]{64}$/.test(envValue)) {
    return null;
  }
  return Buffer.from(envValue, "hex");
}

export interface AesGcmEncryptionProviderOptions {
  /** Current encryption key as a 64-char hex string. Required. */
  encryptionKey: string;
  /** Previous encryption key for key rotation. Optional. */
  previousKey?: string;
}

/**
 * Create an AES-256-GCM encryption provider for Manifest runtime.
 *
 * Wire into the factory via RuntimeOptions.encryptionProvider.
 * When the ENCRYPTION_KEY env var is set, encryption is active.
 * When absent, the runtime treats `encrypted` properties as plaintext (safe for dev).
 *
 * @example
 * ```ts
 * // In manifest-runtime-factory.ts
 * import { createAesGcmEncryptionProvider } from "./encryption-provider";
 *
 * const provider = createAesGcmEncryptionProvider();
 * if (provider) {
 *   // wire into RuntimeOptions
 * }
 * ```
 */
export function createAesGcmEncryptionProvider(
  opts?: AesGcmEncryptionProviderOptions
): {
  encrypt: (
    plaintext: string
  ) => Promise<{ ciphertext: string; keyId: string }>;
  decrypt: (ciphertext: string, keyId: string) => Promise<string>;
} | null {
  const key = opts
    ? Buffer.from(opts.encryptionKey, "hex")
    : parseKey(process.env.ENCRYPTION_KEY);

  if (!key || key.length !== KEY_BYTES) {
    // No valid key — encryption disabled. The runtime will store plaintext.
    return null;
  }

  const keyId = deriveKeyId(key);
  const previousKey = opts?.previousKey
    ? Buffer.from(opts.previousKey, "hex")
    : parseKey(process.env.ENCRYPTION_KEY_PREVIOUS);

  // Build a keyId -> key lookup for decryption (supports rotation)
  const keyLookup = new Map<string, Buffer>();
  keyLookup.set(keyId, key);
  if (previousKey && previousKey.length === KEY_BYTES) {
    keyLookup.set(deriveKeyId(previousKey), previousKey);
  }

  return {
    async encrypt(
      plaintext: string
    ): Promise<{ ciphertext: string; keyId: string }> {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, key, iv);

      const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      // Format: iv (12 bytes) + authTag (16 bytes) + ciphertext
      // All hex-encoded for storage as a string
      const combined = Buffer.concat([iv, authTag, encrypted]);
      return {
        ciphertext: combined.toString("hex"),
        keyId,
      };
    },

    async decrypt(ciphertext: string, kid: string): Promise<string> {
      const decryptionKey = keyLookup.get(kid);
      if (!decryptionKey) {
        throw new Error(
          `EncryptionProvider: unknown keyId "${kid}". ` +
            `Available keyIds: ${[...keyLookup.keys()].join(", ")}. ` +
            "If you rotated ENCRYPTION_KEY, set ENCRYPTION_KEY_PREVIOUS to the old key."
        );
      }

      const raw = Buffer.from(ciphertext, "hex");

      // Extract components
      const iv = raw.subarray(0, IV_BYTES);
      const authTag = raw.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
      const encrypted = raw.subarray(IV_BYTES + AUTH_TAG_BYTES);

      const decipher = createDecipheriv(ALGORITHM, decryptionKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString("utf8");
    },
  };
}
