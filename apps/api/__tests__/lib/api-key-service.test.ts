import { describe, expect, it } from "vitest";
import {
  extractKeyPrefix,
  generateApiKey,
  getKeyLookupInfo,
  hashKey,
  isValidKeyFormat,
  LIVE_KEY_PREFIX,
  TEST_KEY_PREFIX,
  validateKey,
} from "../../app/lib/api-key-service";

describe("api-key-service", () => {
  describe("generateApiKey", () => {
    it("should generate a key with default live prefix", () => {
      const result = generateApiKey();

      expect(result.plainKey).toMatch(/^cp_live_[A-Za-z0-9_-]{43}$/);
      expect(result.keyPrefix).toBe(LIVE_KEY_PREFIX);
      expect(result.hashedKey).toHaveLength(64); // SHA-256 hex length
    });

    it("should generate a key with test prefix when specified", () => {
      const result = generateApiKey(TEST_KEY_PREFIX);

      expect(result.plainKey).toMatch(/^cp_test_[A-Za-z0-9_-]{43}$/);
      expect(result.keyPrefix).toBe(TEST_KEY_PREFIX);
    });

    it("should generate unique keys", () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();

      expect(key1.plainKey).not.toBe(key2.plainKey);
      expect(key1.hashedKey).not.toBe(key2.hashedKey);
    });

    it("should generate key with correct total length", () => {
      const result = generateApiKey();
      // 8 (cp_live_) + 43 (base64url) = 51
      expect(result.plainKey).toHaveLength(51);
    });
  });

  describe("hashKey", () => {
    it("should produce consistent hash for same input", () => {
      const key = "cp_live_testkey123";
      const hash1 = hashKey(key);
      const hash2 = hashKey(key);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different inputs", () => {
      const hash1 = hashKey("cp_live_key1");
      const hash2 = hashKey("cp_live_key2");

      expect(hash1).not.toBe(hash2);
    });

    it("should produce 64 character hex string (SHA-256)", () => {
      const hash = hashKey("any-key");

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("validateKey", () => {
    it("should return true for matching key and hash", () => {
      const { plainKey, hashedKey } = generateApiKey();

      expect(validateKey(plainKey, hashedKey)).toBe(true);
    });

    it("should return false for non-matching key and hash", () => {
      const { hashedKey } = generateApiKey();
      const { plainKey: wrongKey } = generateApiKey();

      expect(validateKey(wrongKey, hashedKey)).toBe(false);
    });

    it("should return false for invalid hash length", () => {
      const { plainKey } = generateApiKey();

      expect(validateKey(plainKey, "short-hash")).toBe(false);
    });
  });

  describe("extractKeyPrefix", () => {
    it("should extract live prefix", () => {
      const prefix = extractKeyPrefix("cp_live_abc123");

      expect(prefix).toBe(LIVE_KEY_PREFIX);
    });

    it("should extract test prefix", () => {
      const prefix = extractKeyPrefix("cp_test_xyz789");

      expect(prefix).toBe(TEST_KEY_PREFIX);
    });

    it("should extract custom prefix ending with underscore", () => {
      // Note: extractKeyPrefix extracts to the FIRST underscore, not the last
      const prefix = extractKeyPrefix("custom_prefix_abc");

      expect(prefix).toBe("custom_");
    });

    it("should return empty string for key without underscore", () => {
      const prefix = extractKeyPrefix("nounderscore");

      expect(prefix).toBe("");
    });

    it("should return empty string for key starting with underscore", () => {
      const prefix = extractKeyPrefix("_startsWithUnderscore");

      expect(prefix).toBe("");
    });
  });

  describe("getKeyLookupInfo", () => {
    it("should return prefix and hash for database lookup", () => {
      const { plainKey, hashedKey, keyPrefix } = generateApiKey();
      const lookupInfo = getKeyLookupInfo(plainKey);

      expect(lookupInfo.keyPrefix).toBe(keyPrefix);
      expect(lookupInfo.hashedKey).toBe(hashedKey);
    });

    it("should compute consistent hash", () => {
      const { plainKey } = generateApiKey();
      const info1 = getKeyLookupInfo(plainKey);
      const info2 = getKeyLookupInfo(plainKey);

      expect(info1.hashedKey).toBe(info2.hashedKey);
    });
  });

  describe("isValidKeyFormat", () => {
    it("should return true for valid live key", () => {
      const { plainKey } = generateApiKey(LIVE_KEY_PREFIX);

      expect(isValidKeyFormat(plainKey)).toBe(true);
    });

    it("should return true for valid test key", () => {
      const { plainKey } = generateApiKey(TEST_KEY_PREFIX);

      expect(isValidKeyFormat(plainKey)).toBe(true);
    });

    it("should return false for key without prefix", () => {
      expect(isValidKeyFormat("invalidkey")).toBe(false);
    });

    it("should return false for key with too short random part", () => {
      expect(isValidKeyFormat("cp_live_short")).toBe(false);
    });

    it("should return false for key with invalid characters", () => {
      // Contains spaces which are not valid base64url
      expect(isValidKeyFormat("cp_live_invalid chars in key!")).toBe(false);
    });
  });
});
