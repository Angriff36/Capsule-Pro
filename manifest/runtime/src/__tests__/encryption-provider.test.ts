/**
 * Tests for the AES-256-GCM encryption provider.
 *
 * Verifies:
 * 1. Provider creation with valid key
 * 2. Provider returns null without key (dev mode)
 * 3. Encrypt/decrypt roundtrip preserves plaintext
 * 4. Each encryption uses unique IV (nonces don't repeat)
 * 5. Key rotation: old key decrypts, new key encrypts
 * 6. Wrong key fails decryption (auth tag mismatch)
 * 7. Unknown keyId throws descriptive error
 * 8. Empty string encrypts/decrypts correctly
 * 9. Unicode plaintext survives roundtrip
 * 10. Large payload roundtrips
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createAesGcmEncryptionProvider } from "../encryption-provider";

/** Generate a valid 64-char hex key for testing. */
function testKey(): string {
  return "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
}

/** Generate a different valid key for rotation testing. */
function otherKey(): string {
  return "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";
}

describe("createAesGcmEncryptionProvider", () => {
  const originalEnv = process.env.ENCRYPTION_KEY;
  const originalEnvPrev = process.env.ENCRYPTION_KEY_PREVIOUS;

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
    if (originalEnvPrev !== undefined) {
      process.env.ENCRYPTION_KEY_PREVIOUS = originalEnvPrev;
    } else {
      delete process.env.ENCRYPTION_KEY_PREVIOUS;
    }
  });

  it("returns null when no ENCRYPTION_KEY env var is set", () => {
    delete process.env.ENCRYPTION_KEY;
    const provider = createAesGcmEncryptionProvider();
    expect(provider).toBeNull();
  });

  it("returns null when ENCRYPTION_KEY is invalid (not 64 hex chars)", () => {
    process.env.ENCRYPTION_KEY = "not-a-valid-key";
    const provider = createAesGcmEncryptionProvider();
    expect(provider).toBeNull();
  });

  it("returns null when ENCRYPTION_KEY is too short", () => {
    process.env.ENCRYPTION_KEY = "abcdef0123456789";
    const provider = createAesGcmEncryptionProvider();
    expect(provider).toBeNull();
  });

  it("creates provider with valid ENCRYPTION_KEY", () => {
    process.env.ENCRYPTION_KEY = testKey();
    const provider = createAesGcmEncryptionProvider();
    expect(provider).not.toBeNull();
    expect(provider).toHaveProperty("encrypt");
    expect(provider).toHaveProperty("decrypt");
  });

  it("creates provider with explicit options (ignoring env)", () => {
    delete process.env.ENCRYPTION_KEY;
    const provider = createAesGcmEncryptionProvider({
      encryptionKey: testKey(),
    });
    expect(provider).not.toBeNull();
  });

  describe("encrypt/decrypt roundtrip", () => {
    let provider: NonNullable<ReturnType<typeof createAesGcmEncryptionProvider>>;

    beforeEach(() => {
      process.env.ENCRYPTION_KEY = testKey();
      provider = createAesGcmEncryptionProvider()!;
    });

    it("preserves plaintext through encrypt then decrypt", async () => {
      const plaintext = "Hello, World!";
      const encrypted = await provider.encrypt(plaintext);
      const decrypted = await provider.decrypt(encrypted.ciphertext, encrypted.keyId);
      expect(decrypted).toBe(plaintext);
    });

    it("returns consistent keyId for the same key", async () => {
      const a = await provider.encrypt("test1");
      const b = await provider.encrypt("test2");
      expect(a.keyId).toBe(b.keyId);
    });

    it("produces different ciphertext for same plaintext (unique IV)", async () => {
      const a = await provider.encrypt("same input");
      const b = await provider.encrypt("same input");
      expect(a.ciphertext).not.toBe(b.ciphertext);
    });

    it("handles empty string", async () => {
      const encrypted = await provider.encrypt("");
      const decrypted = await provider.decrypt(encrypted.ciphertext, encrypted.keyId);
      expect(decrypted).toBe("");
    });

    it("handles unicode characters", async () => {
      const plaintext = "日本語テスト 🎉 Ñoño café";
      const encrypted = await provider.encrypt(plaintext);
      const decrypted = await provider.decrypt(encrypted.ciphertext, encrypted.keyId);
      expect(decrypted).toBe(plaintext);
    });

    it("handles large payloads", async () => {
      const plaintext = "x".repeat(10_000);
      const encrypted = await provider.encrypt(plaintext);
      const decrypted = await provider.decrypt(encrypted.ciphertext, encrypted.keyId);
      expect(decrypted).toBe(plaintext);
    });

    it("handles JSON-like strings", async () => {
      const plaintext = '{"nested":{"key":"value with \\"quotes\\"","num":42}}';
      const encrypted = await provider.encrypt(plaintext);
      const decrypted = await provider.decrypt(encrypted.ciphertext, encrypted.keyId);
      expect(decrypted).toBe(plaintext);
    });

    it("ciphertext is longer than plaintext (IV + authTag overhead)", async () => {
      const plaintext = "short";
      const encrypted = await provider.encrypt(plaintext);
      // 12 bytes IV + 16 bytes authTag + ciphertext, all hex-encoded
      expect(encrypted.ciphertext.length).toBeGreaterThan(plaintext.length);
    });
  });

  describe("key rotation", () => {
    it("decrypts with previous key after rotation", async () => {
      // Encrypt with the "old" key
      const oldProvider = createAesGcmEncryptionProvider({
        encryptionKey: otherKey(),
      })!;
      const encrypted = await oldProvider.encrypt("sensitive data");

      // Now rotate: new key is primary, old key is previous
      const rotatedProvider = createAesGcmEncryptionProvider({
        encryptionKey: testKey(),
        previousKey: otherKey(),
      })!;

      // Should decrypt with the old keyId using previousKey
      const decrypted = await rotatedProvider.decrypt(encrypted.ciphertext, encrypted.keyId);
      expect(decrypted).toBe("sensitive data");
    });

    it("new provider encrypts with new keyId", async () => {
      const rotatedProvider = createAesGcmEncryptionProvider({
        encryptionKey: testKey(),
        previousKey: otherKey(),
      })!;

      const encrypted = await rotatedProvider.encrypt("new data");

      // The keyId should be for the NEW key, not the previous one
      const newKeyProvider = createAesGcmEncryptionProvider({
        encryptionKey: testKey(),
      })!;
      const newEncrypted = await newKeyProvider.encrypt("test");
      expect(encrypted.keyId).toBe(newEncrypted.keyId);
    });
  });

  describe("error handling", () => {
    it("throws on unknown keyId during decrypt", async () => {
      const provider = createAesGcmEncryptionProvider({
        encryptionKey: testKey(),
      })!;

      await expect(
        provider.decrypt("aabbccdd", "unknown1"),
      ).rejects.toThrow(/unknown keyId "unknown1"/);
    });

    it("throws on tampered ciphertext (auth tag mismatch)", async () => {
      const provider = createAesGcmEncryptionProvider({
        encryptionKey: testKey(),
      })!;
      const encrypted = await provider.encrypt("secret");

      // Tamper with the ciphertext by flipping a bit
      const tampered = encrypted.ciphertext.slice(0, -4) + "ffff";

      await expect(
        provider.decrypt(tampered, encrypted.keyId),
      ).rejects.toThrow();
    });
  });
});
