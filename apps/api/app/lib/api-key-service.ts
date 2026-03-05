/**
 * API Key Service
 *
 * Handles API key lifecycle: generate, rotate, revoke
 * with scoped permissions, usage tracking, and expiration policies.
 */

import { createHash, randomBytes } from "node:crypto";
import { database } from "@repo/database";

// ============================================================================
// Types
// ============================================================================

export const API_KEY_PREFIX = "cpk_";
export const API_KEY_LENGTH = 32;
export const API_KEY_PREFIX_LENGTH = 8;

export type ApiKeyScope =
  | "events:read"
  | "events:write"
  | "kitchen:read"
  | "kitchen:write"
  | "inventory:read"
  | "inventory:write"
  | "staff:read"
  | "staff:write"
  | "crm:read"
  | "crm:write"
  | "reports:read"
  | "webhooks:manage"
  | "admin:all";

export const VALID_API_KEY_SCOPES: ReadonlySet<ApiKeyScope> = new Set([
  "events:read",
  "events:write",
  "kitchen:read",
  "kitchen:write",
  "inventory:read",
  "inventory:write",
  "staff:read",
  "staff:write",
  "crm:read",
  "crm:write",
  "reports:read",
  "webhooks:manage",
  "admin:all",
] as const);

export interface CreateApiKeyParams {
  tenantId: string;
  name: string;
  scopes: ApiKeyScope[];
  expiresAt?: Date | null;
  createdByUserId: string;
}

export interface ApiKeyWithRawKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  rawKey: string; // Only returned on creation
  scopes: ApiKeyScope[];
  expiresAt: Date | null;
  createdAt: Date;
}

export interface ApiKeyInfo {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  isActive: boolean;
  status: "active" | "expired" | "revoked";
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Errors
// ============================================================================

export class ApiKeyError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400
  ) {
    super(message);
    this.name = "ApiKeyError";
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate a cryptographically secure random API key.
 * Format: cpk_<32 random alphanumeric characters>
 */
export function generateRawApiKey(): string {
  const bytes = randomBytes(API_KEY_LENGTH);
  const key = bytes
    .toString("base64")
    .replace(/[+/=]/g, "")
    .substring(0, API_KEY_LENGTH);
  return `${API_KEY_PREFIX}${key}`;
}

/**
 * Extract the key prefix from a raw API key.
 * Returns first 8 characters after the prefix for identification.
 */
export function extractKeyPrefix(rawKey: string): string {
  if (!rawKey.startsWith(API_KEY_PREFIX)) {
    throw new ApiKeyError("Invalid API key format", "INVALID_KEY_FORMAT", 400);
  }
  return rawKey.substring(
    API_KEY_PREFIX.length,
    API_KEY_PREFIX.length + API_KEY_PREFIX_LENGTH
  );
}

/**
 * Hash an API key for secure storage using SHA-256.
 * In production, consider using Argon2 or bcrypt with proper salts.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/**
 * Validate API key scopes.
 */
export function validateScopes(scopes: string[]): scopes is ApiKeyScope[] {
  return (
    Array.isArray(scopes) &&
    scopes.length > 0 &&
    scopes.every((s) => VALID_API_KEY_SCOPES.has(s as ApiKeyScope))
  );
}

/**
 * Determine the status of an API key.
 */
export function getApiKeyStatus(
  expiresAt: Date | null,
  revokedAt: Date | null
): "active" | "expired" | "revoked" {
  if (revokedAt && revokedAt < new Date()) {
    return "revoked";
  }
  if (expiresAt && expiresAt < new Date()) {
    return "expired";
  }
  return "active";
}

// ============================================================================
// API Key Operations
// ============================================================================

/**
 * Create a new API key.
 * Returns the API key info with the raw key (only shown once).
 */
export async function createApiKey(
  params: CreateApiKeyParams
): Promise<ApiKeyWithRawKey> {
  const { tenantId, name, scopes, expiresAt, createdByUserId } = params;

  // Validate name
  if (!name || name.trim().length === 0) {
    throw new ApiKeyError("API key name is required", "NAME_REQUIRED", 400);
  }

  // Validate scopes
  if (!validateScopes(scopes)) {
    throw new ApiKeyError("Invalid API key scopes", "INVALID_SCOPES", 400);
  }

  // Check for duplicate name
  const existing = await database.apiKey.findFirst({
    where: {
      tenantId,
      name: { equals: name, mode: "insensitive" },
      deletedAt: null,
    },
  });

  if (existing) {
    throw new ApiKeyError(
      `API key with name "${name}" already exists`,
      "DUPLICATE_NAME",
      409
    );
  }

  // Generate and hash the key
  const rawKey = generateRawApiKey();
  const keyPrefix = extractKeyPrefix(rawKey);
  const hashedKey = hashApiKey(rawKey);

  // Create the API key record
  const apiKey = await database.apiKey.create({
    data: {
      tenantId,
      name: name.trim(),
      keyPrefix,
      hashedKey,
      scopes: scopes as string[],
      expiresAt: expiresAt ?? null,
      createdByUserId,
    },
  });

  return {
    id: apiKey.id,
    tenantId: apiKey.tenantId,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    rawKey, // Only returned on creation
    scopes: apiKey.scopes as ApiKeyScope[],
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
  };
}

/**
 * List API keys for a tenant.
 */
export async function listApiKeys(
  tenantId: string,
  options: {
    includeRevoked?: boolean;
    includeExpired?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ apiKeys: ApiKeyInfo[]; total: number }> {
  const {
    includeRevoked = false,
    includeExpired = true,
    limit = 50,
    offset = 0,
  } = options;

  const where: Record<string, unknown> = {
    tenantId,
    deletedAt: null,
  };

  // Filter by status
  if (!(includeRevoked || includeExpired)) {
    where.revokedAt = null;
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
  } else if (!includeRevoked) {
    where.revokedAt = null;
  }

  const [apiKeys, total] = await Promise.all([
    database.apiKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    database.apiKey.count({ where }),
  ]);

  return {
    apiKeys: apiKeys.map((key) => ({
      id: key.id,
      tenantId: key.tenantId,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes as ApiKeyScope[],
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      revokedAt: key.revokedAt,
      isActive: getApiKeyStatus(key.expiresAt, key.revokedAt) === "active",
      status: getApiKeyStatus(key.expiresAt, key.revokedAt),
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    })),
    total,
  };
}

/**
 * Get a single API key by ID (without the raw key).
 */
export async function getApiKey(
  tenantId: string,
  id: string
): Promise<ApiKeyInfo | null> {
  const apiKey = await database.apiKey.findFirst({
    where: { tenantId, id, deletedAt: null },
  });

  if (!apiKey) {
    return null;
  }

  return {
    id: apiKey.id,
    tenantId: apiKey.tenantId,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    scopes: apiKey.scopes as ApiKeyScope[],
    lastUsedAt: apiKey.lastUsedAt,
    expiresAt: apiKey.expiresAt,
    revokedAt: apiKey.revokedAt,
    isActive: getApiKeyStatus(apiKey.expiresAt, apiKey.revokedAt) === "active",
    status: getApiKeyStatus(apiKey.expiresAt, apiKey.revokedAt),
    createdAt: apiKey.createdAt,
    updatedAt: apiKey.updatedAt,
  };
}

/**
 * Rotate an API key (generate a new key while keeping the same ID).
 */
export async function rotateApiKey(
  tenantId: string,
  id: string
): Promise<ApiKeyWithRawKey> {
  const existing = await database.apiKey.findFirst({
    where: { tenantId, id, deletedAt: null },
  });

  if (!existing) {
    throw new ApiKeyError("API key not found", "NOT_FOUND", 404);
  }

  // Generate new key
  const rawKey = generateRawApiKey();
  const keyPrefix = extractKeyPrefix(rawKey);
  const hashedKey = hashApiKey(rawKey);

  const updated = await database.apiKey.update({
    where: { tenantId_id: { tenantId, id } },
    data: {
      keyPrefix,
      hashedKey,
      updatedAt: new Date(),
    },
  });

  return {
    id: updated.id,
    tenantId: updated.tenantId,
    name: updated.name,
    keyPrefix: updated.keyPrefix,
    rawKey, // Only returned on rotation
    scopes: updated.scopes as ApiKeyScope[],
    expiresAt: updated.expiresAt,
    createdAt: updated.createdAt,
  };
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(
  tenantId: string,
  id: string,
  reason?: string
): Promise<void> {
  const existing = await database.apiKey.findFirst({
    where: { tenantId, id, deletedAt: null },
  });

  if (!existing) {
    throw new ApiKeyError("API key not found", "NOT_FOUND", 404);
  }

  if (existing.revokedAt) {
    throw new ApiKeyError("API key is already revoked", "ALREADY_REVOKED", 400);
  }

  await database.apiKey.update({
    where: { tenantId_id: { tenantId, id } },
    data: { revokedAt: new Date(), updatedAt: new Date() },
  });
}

/**
 * Update API key scopes.
 */
export async function updateApiKeyScopes(
  tenantId: string,
  id: string,
  scopes: ApiKeyScope[]
): Promise<void> {
  if (!validateScopes(scopes)) {
    throw new ApiKeyError("Invalid API key scopes", "INVALID_SCOPES", 400);
  }

  const existing = await database.apiKey.findFirst({
    where: { tenantId, id, deletedAt: null },
  });

  if (!existing) {
    throw new ApiKeyError("API key not found", "NOT_FOUND", 404);
  }

  await database.apiKey.update({
    where: { tenantId_id: { tenantId, id } },
    data: { scopes: scopes as string[], updatedAt: new Date() },
  });
}

/**
 * Update API key expiration.
 */
export async function updateApiKeyExpiration(
  tenantId: string,
  id: string,
  expiresAt: Date | null
): Promise<void> {
  const existing = await database.apiKey.findFirst({
    where: { tenantId, id, deletedAt: null },
  });

  if (!existing) {
    throw new ApiKeyError("API key not found", "NOT_FOUND", 404);
  }

  await database.apiKey.update({
    where: { tenantId_id: { tenantId, id } },
    data: { expiresAt, updatedAt: new Date() },
  });
}

/**
 * Delete an API key (soft delete).
 */
export async function deleteApiKey(
  tenantId: string,
  id: string
): Promise<void> {
  const existing = await database.apiKey.findFirst({
    where: { tenantId, id, deletedAt: null },
  });

  if (!existing) {
    throw new ApiKeyError("API key not found", "NOT_FOUND", 404);
  }

  await database.apiKey.update({
    where: { tenantId_id: { tenantId, id } },
    data: { deletedAt: new Date() },
  });
}

// ============================================================================
// API Key Authentication
// ============================================================================

export interface AuthenticatedApiKey {
  id: string;
  tenantId: string;
  name: string;
  scopes: ApiKeyScope[];
  isActive: boolean;
}

/**
 * Validate an API key and return the associated key info.
 * Used for authenticating API requests.
 */
export async function validateApiKey(
  rawKey: string
): Promise<AuthenticatedApiKey | null> {
  if (!rawKey.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const keyPrefix = extractKeyPrefix(rawKey);
  const hashedKey = hashApiKey(rawKey);

  const apiKey = await database.apiKey.findFirst({
    where: {
      keyPrefix,
      hashedKey,
      deletedAt: null,
    },
  });

  if (!apiKey) {
    return null;
  }

  // Check if key is expired or revoked
  const status = getApiKeyStatus(apiKey.expiresAt, apiKey.revokedAt);
  if (status !== "active") {
    return null;
  }

  // Update last used timestamp
  await database.apiKey.update({
    where: { tenantId_id: { tenantId: apiKey.tenantId, id: apiKey.id } },
    data: { lastUsedAt: new Date() },
  });

  return {
    id: apiKey.id,
    tenantId: apiKey.tenantId,
    name: apiKey.name,
    scopes: apiKey.scopes as ApiKeyScope[],
    isActive: true,
  };
}

/**
 * Check if an API key has a specific scope permission.
 */
export function hasScope(
  apiKey: AuthenticatedApiKey | null,
  requiredScope: string
): boolean {
  if (!(apiKey && apiKey.isActive)) {
    return false;
  }

  // Admin scope grants all permissions
  if (apiKey.scopes.includes("admin:all")) {
    return true;
  }

  // Direct scope match
  if (apiKey.scopes.includes(requiredScope as ApiKeyScope)) {
    return true;
  }

  // Write scope implies read scope
  if (requiredScope.endsWith(":read")) {
    const writeScope = requiredScope.replace(":read", ":write") as ApiKeyScope;
    return apiKey.scopes.includes(writeScope);
  }

  return false;
}

/**
 * Middleware helper to authenticate an API key from a request.
 */
export async function authenticateApiKeyFromRequest(
  request: Request
): Promise<AuthenticatedApiKey | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawKey = authHeader.substring(7); // Remove "Bearer " prefix
  return validateApiKey(rawKey);
}
