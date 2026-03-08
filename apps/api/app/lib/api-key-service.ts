import { createHash, randomBytes } from "node:crypto";

/**
 * API Key Service
 *
 * Provides secure API key generation, hashing, and validation.
 * Keys are formatted as: {prefix}{random_base64url}
 * - Prefix: "cp_live_" (default) or "cp_test_"
 * - Random part: 32 bytes encoded as base64url (43 characters)
 * - Total length: ~51 characters
 */

/** Default prefix for production API keys */
export const LIVE_KEY_PREFIX = "cp_live_";

/** Prefix for test/sandbox API keys */
export const TEST_KEY_PREFIX = "cp_test_";

/** Number of random bytes for the key (32 bytes = 43 base64url characters) */
const KEY_RANDOM_BYTES = 32;

/** Regex for validating base64url characters */
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

/**
 * Converts a buffer to base64url encoding (URL-safe, no padding)
 */
function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

/**
 * Generates a secure random API key
 *
 * @param prefix - The key prefix (defaults to "cp_live_")
 * @returns Object containing the plain key, hashed key, and prefix
 */
export function generateApiKey(prefix: string = LIVE_KEY_PREFIX): {
  plainKey: string;
  hashedKey: string;
  keyPrefix: string;
} {
  const randomBytesBuffer = randomBytes(KEY_RANDOM_BYTES);
  const randomPart = toBase64Url(randomBytesBuffer);
  const plainKey = `${prefix}${randomPart}`;
  const hashedKey = hashKey(plainKey);

  return {
    plainKey,
    hashedKey,
    keyPrefix: prefix,
  };
}

/**
 * Hashes an API key using SHA-256
 *
 * @param plainKey - The plain text API key
 * @returns The SHA-256 hash as a hex string
 */
export function hashKey(plainKey: string): string {
  return createHash("sha256").update(plainKey).digest("hex");
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by comparing all characters regardless of match
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal, false otherwise
 */
function timingSafeEqual(a: string, b: string): boolean {
  // Timing-safe comparison using XOR to prevent timing attacks
  // Note: Bitwise operators are required here for constant-time comparison
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    // biome-ignore lint/suspicious/noBitwiseOperators: Bitwise ops required for timing-safe comparison
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validates an API key by comparing its hash to the stored hash
 * Uses timing-safe comparison to prevent timing attacks
 *
 * @param plainKey - The plain text API key to validate
 * @param hashedKey - The stored hash to compare against
 * @returns True if the key matches, false otherwise
 */
export function validateKey(plainKey: string, hashedKey: string): boolean {
  const computedHash = hashKey(plainKey);

  // Use timing-safe comparison to prevent timing attacks
  if (computedHash.length !== hashedKey.length) {
    return false;
  }

  return timingSafeEqual(computedHash, hashedKey);
}

/**
 * Extracts the prefix from an API key
 *
 * @param plainKey - The API key
 * @returns The prefix (e.g., "cp_live_" or "cp_test_") or empty string if no recognized prefix
 */
export function extractKeyPrefix(plainKey: string): string {
  if (plainKey.startsWith(LIVE_KEY_PREFIX)) {
    return LIVE_KEY_PREFIX;
  }
  if (plainKey.startsWith(TEST_KEY_PREFIX)) {
    return TEST_KEY_PREFIX;
  }
  // Try to extract any prefix pattern (prefix ends with underscore)
  const underscoreIndex = plainKey.indexOf("_");
  if (underscoreIndex > 0) {
    return plainKey.slice(0, underscoreIndex + 1);
  }
  return "";
}

/**
 * Gets lookup information from a plain API key
 * Used for database queries to find the key record
 *
 * @param plainKey - The plain text API key
 * @returns Object containing the key prefix and hashed key for lookup
 */
export function getKeyLookupInfo(plainKey: string): {
  keyPrefix: string;
  hashedKey: string;
} {
  return {
    keyPrefix: extractKeyPrefix(plainKey),
    hashedKey: hashKey(plainKey),
  };
}

/**
 * Validates the format of an API key
 *
 * @param plainKey - The API key to validate
 * @returns True if the key format is valid
 */
export function isValidKeyFormat(plainKey: string): boolean {
  const prefix = extractKeyPrefix(plainKey);
  if (!prefix) {
    return false;
  }

  const randomPart = plainKey.slice(prefix.length);
  // Base64url encoded 32 bytes should be 43 characters
  // Allow some flexibility for different key lengths
  if (randomPart.length < 32 || randomPart.length > 64) {
    return false;
  }

  // Check that random part contains only valid base64url characters
  return BASE64URL_REGEX.test(randomPart);
}
