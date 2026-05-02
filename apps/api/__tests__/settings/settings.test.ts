/**
 * Settings Domain API Integration Tests
 *
 * Tests cover:
 * - API Keys: list, create, detail, update, soft-delete, revoke, rotate
 * - Rate Limits: list, create, detail, update, soft-delete, analytics, events
 * - Audit Log: list with filtering and pagination
 * - Manifest command routes: create, revoke, update, soft-delete, record-usage
 * - Auth checks (401), tenant isolation, validation errors, server errors
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as revokeApiKey } from "@/app/api/settings/api-keys/[id]/revoke/route";
import { POST as rotateApiKey } from "@/app/api/settings/api-keys/[id]/rotate/route";
// --- Direct route handlers (use requireCurrentUser + withRateLimit) ---
import {
  DELETE as deleteApiKey,
  GET as getApiKey,
  PUT as updateApiKey,
} from "@/app/api/settings/api-keys/[id]/route";
import { POST as commandCreateApiKey } from "@/app/api/settings/api-keys/commands/create/route";
import { POST as commandRecordUsage } from "@/app/api/settings/api-keys/commands/record-usage/route";
import { POST as commandRevokeApiKey } from "@/app/api/settings/api-keys/commands/revoke/route";
import { POST as commandSoftDeleteApiKey } from "@/app/api/settings/api-keys/commands/soft-delete/route";
import { POST as commandUpdateApiKey } from "@/app/api/settings/api-keys/commands/update/route";
// --- Manifest-generated list ---
import { GET as listApiKeysManifest } from "@/app/api/settings/api-keys/list/route";
import {
  POST as createApiKeyRoot,
  GET as listApiKeysRoot,
} from "@/app/api/settings/api-keys/route";
// --- Audit log ---
import { GET as getAuditLog } from "@/app/api/settings/audit-log/route";
// --- Rate limits (use auth + getTenantIdForOrg directly) ---
import {
  DELETE as deleteRateLimit,
  GET as getRateLimitDetail,
  PATCH as updateRateLimit,
} from "@/app/api/settings/rate-limits/[id]/route";
import { GET as getRateLimitAnalytics } from "@/app/api/settings/rate-limits/analytics/route";
import { GET as getRateLimitEvents } from "@/app/api/settings/rate-limits/events/route";
import {
  POST as createRateLimit,
  GET as listRateLimits,
} from "@/app/api/settings/rate-limits/route";

// Mock dependencies
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    apiKey: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    rateLimitConfig: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    rateLimitUsage: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    rateLimitEvent: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    audit_log: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/app/lib/api-key-service", () => ({
  generateApiKey: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/middleware/rate-limiter", () => ({
  withRateLimit: (_handler: Function, _opts?: unknown) => _handler,
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import(
  "@/app/lib/tenant"
);
const { createManifestRuntime } = await import("@/lib/manifest-runtime");
const { generateApiKey } = await import("@/app/lib/api-key-service");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_ID = "user_settings_test";
const TEST_ORG_ID = "org_settings_test";
const TEST_CLERK_ID = "clerk_settings_test";

function createMockCurrentUser() {
  return {
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "admin@test.com",
    firstName: "Test",
    lastName: "Admin",
  };
}

function createMockApiKey(overrides: Record<string, unknown> = {}) {
  return {
    id: "key-001",
    tenantId: TEST_TENANT_ID,
    name: "Test API Key",
    keyPrefix: "cp_live_",
    hashedKey: "abc123hash",
    scopes: ["read", "write"],
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    deletedAt: null,
    createdByUserId: TEST_USER_ID,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function createMockRateLimitConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: "rl-001",
    tenantId: TEST_TENANT_ID,
    name: "Default Rate Limit",
    endpointPattern: "/api/.*",
    windowMs: 60_000,
    maxRequests: 100,
    burstAllowance: 10,
    priority: 0,
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function createMockAuditLogEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "audit-001",
    tenant_id: TEST_TENANT_ID,
    table_name: "api_keys",
    table_schema: "public",
    record_id: "key-001",
    action: "update",
    old_values: { name: "Old Key" },
    new_values: { name: "New Key" },
    performed_by: TEST_USER_ID,
    ip_address: "127.0.0.1",
    user_agent: "test-agent",
    created_at: new Date("2026-01-15T10:00:00Z"),
    ...overrides,
  };
}

describe("Settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =====================================================================
  // API KEYS - Direct routes (requireCurrentUser + withRateLimit)
  // =====================================================================
  describe("API Keys", () => {
    beforeEach(() => {
      vi.mocked(requireCurrentUser).mockResolvedValue(
        createMockCurrentUser() as never
      );
    });

    // --------------------------------------------------------- LIST (root)
    describe("GET /api/settings/api-keys (list)", () => {
      it("should return API keys for the current tenant", async () => {
        const mockKeys = [
          createMockApiKey({ id: "key-1", name: "Production Key" }),
          createMockApiKey({ id: "key-2", name: "Staging Key" }),
        ];

        vi.mocked(database.apiKey.findMany).mockResolvedValue(
          mockKeys as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys"
        );
        const response = await listApiKeysRoot(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.keys).toHaveLength(2);
        expect(body.keys[0].name).toBe("Production Key");
      });

      it("should exclude soft-deleted keys and order by created_at desc", async () => {
        vi.mocked(database.apiKey.findMany).mockResolvedValue([] as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys"
        );
        await listApiKeysRoot(request);

        expect(database.apiKey.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              tenantId: TEST_TENANT_ID,
              deletedAt: null,
            },
            orderBy: [{ createdAt: "desc" }],
          })
        );
      });

      it("should exclude hashedKey from the select for security", async () => {
        vi.mocked(database.apiKey.findMany).mockResolvedValue([] as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys"
        );
        await listApiKeysRoot(request);

        const call = vi.mocked(database.apiKey.findMany).mock.calls[0][0] as {
          select: Record<string, boolean>;
        };
        expect(call.select.hashedKey).toBeUndefined();
      });

      it("should return 500 when requireCurrentUser throws", async () => {
        vi.mocked(requireCurrentUser).mockRejectedValue(
          new Error("Auth failed") as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys"
        );
        const response = await listApiKeysRoot(request);

        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Failed to fetch API keys");
      });
    });

    // ------------------------------------------------ CREATE (root POST)
    describe("POST /api/settings/api-keys (create)", () => {
      it("should create a new API key and return plain key", async () => {
        vi.mocked(database.apiKey.findFirst).mockResolvedValue(null as never);
        vi.mocked(generateApiKey).mockReturnValue({
          plainKey: "cp_live_abc123random",
          hashedKey: "sha256hash",
          keyPrefix: "cp_live_",
        });
        vi.mocked(database.apiKey.create).mockResolvedValue({
          id: "key-new",
          name: "My Key",
          keyPrefix: "cp_live_",
          scopes: ["read"],
          expiresAt: null,
          createdAt: new Date("2026-01-01"),
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys",
          {
            method: "POST",
            body: JSON.stringify({ name: "My Key", scopes: ["read"] }),
          }
        );
        const response = await createApiKeyRoot(request);

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body.name).toBe("My Key");
        expect(body.plainKey).toBe("cp_live_abc123random");
        expect(body.id).toBe("key-new");
      });

      it("should return 400 when name is missing", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/api-keys",
          {
            method: "POST",
            body: JSON.stringify({ scopes: ["read"] }),
          }
        );
        const response = await createApiKeyRoot(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Name is required");
      });

      it("should return 400 when name is not a string", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/api-keys",
          {
            method: "POST",
            body: JSON.stringify({ name: 123 }),
          }
        );
        const response = await createApiKeyRoot(request);

        expect(response.status).toBe(400);
      });

      it("should return 409 when duplicate name exists", async () => {
        vi.mocked(database.apiKey.findFirst).mockResolvedValue(
          createMockApiKey({ name: "Duplicate Key" }) as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys",
          {
            method: "POST",
            body: JSON.stringify({ name: "Duplicate Key" }),
          }
        );
        const response = await createApiKeyRoot(request);

        expect(response.status).toBe(409);
        const body = await response.json();
        expect(body.message).toBe("An API key with this name already exists");
      });

      it("should handle empty body gracefully", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/api-keys",
          {
            method: "POST",
          }
        );
        const response = await createApiKeyRoot(request);

        // Empty body means no name, should 400
        expect(response.status).toBe(400);
      });

      it("should return 500 on database error", async () => {
        vi.mocked(database.apiKey.findFirst).mockRejectedValue(
          new Error("DB error") as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys",
          {
            method: "POST",
            body: JSON.stringify({ name: "Key" }),
          }
        );
        const response = await createApiKeyRoot(request);

        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Failed to create API key");
      });
    });

    // ---------------------------------------------------- DETAIL [id]
    describe("GET /api/settings/api-keys/[id] (detail)", () => {
      it("should return a single API key by ID", async () => {
        vi.mocked(database.apiKey.findFirst).mockResolvedValue(
          createMockApiKey({ id: "key-001" }) as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001"
        );
        const response = await getApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.id).toBe("key-001");
        expect(body.name).toBe("Test API Key");
      });

      it("should return 404 when key not found", async () => {
        vi.mocked(database.apiKey.findFirst).mockResolvedValue(null as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/nonexistent"
        );
        const response = await getApiKey(request, {
          params: Promise.resolve({ id: "nonexistent" }),
        });

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.message).toBe("API key not found");
      });

      it("should enforce tenant isolation on detail queries", async () => {
        vi.mocked(database.apiKey.findFirst).mockResolvedValue(null as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001"
        );
        await getApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(database.apiKey.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              id: "key-001",
              tenantId: TEST_TENANT_ID,
            },
          })
        );
      });

      it("should return 500 on database error", async () => {
        vi.mocked(database.apiKey.findFirst).mockRejectedValue(
          new Error("DB crash") as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001"
        );
        const response = await getApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(500);
      });
    });

    // ---------------------------------------------------- UPDATE [id]
    describe("PUT /api/settings/api-keys/[id] (update)", () => {
      it("should update an API key name", async () => {
        // First call: find the existing key (returns the key)
        // Second call: check for duplicate name (returns null = no duplicate)
        vi.mocked(database.apiKey.findFirst)
          .mockResolvedValueOnce(createMockApiKey({ id: "key-001" }) as never)
          .mockResolvedValueOnce(null as never);
        vi.mocked(database.apiKey.update).mockResolvedValue({
          id: "key-001",
          name: "Updated Key",
          keyPrefix: "cp_live_",
          scopes: ["read"],
          lastUsedAt: null,
          expiresAt: null,
          revokedAt: null,
          createdByUserId: TEST_USER_ID,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-02"),
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001",
          {
            method: "PUT",
            body: JSON.stringify({ name: "Updated Key" }),
          }
        );
        const response = await updateApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.name).toBe("Updated Key");
      });

      it("should return 404 when key not found or soft-deleted", async () => {
        vi.mocked(database.apiKey.findFirst).mockResolvedValue(null as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/bad-id",
          {
            method: "PUT",
            body: JSON.stringify({ name: "New Name" }),
          }
        );
        const response = await updateApiKey(request, {
          params: Promise.resolve({ id: "bad-id" }),
        });

        expect(response.status).toBe(404);
      });

      it("should return 404 when key is soft-deleted", async () => {
        vi.mocked(database.apiKey.findFirst).mockResolvedValue(
          createMockApiKey({ deletedAt: new Date() }) as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001",
          {
            method: "PUT",
            body: JSON.stringify({ name: "New Name" }),
          }
        );
        const response = await updateApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(404);
      });

      it("should return 400 when trying to update a revoked key", async () => {
        vi.mocked(database.apiKey.findFirst).mockResolvedValue(
          createMockApiKey({ revokedAt: new Date() }) as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001",
          {
            method: "PUT",
            body: JSON.stringify({ name: "New Name" }),
          }
        );
        const response = await updateApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Cannot update a revoked API key");
      });

      it("should return 400 when no fields to update", async () => {
        vi.mocked(database.apiKey.findFirst).mockResolvedValue(
          createMockApiKey({ id: "key-001" }) as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001",
          {
            method: "PUT",
            body: JSON.stringify({}),
          }
        );
        const response = await updateApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("No fields to update");
      });

      it("should return 409 when renaming to an existing name", async () => {
        vi.mocked(database.apiKey.findFirst)
          .mockResolvedValueOnce(
            createMockApiKey({ id: "key-001", name: "Original" }) as never
          )
          .mockResolvedValueOnce(
            createMockApiKey({ id: "key-002", name: "Duplicate" }) as never
          );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001",
          {
            method: "PUT",
            body: JSON.stringify({ name: "Duplicate" }),
          }
        );
        const response = await updateApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(409);
        const body = await response.json();
        expect(body.message).toBe("An API key with this name already exists");
      });
    });

    // ------------------------------------------------ DELETE (soft-delete)
    describe("DELETE /api/settings/api-keys/[id] (soft-delete)", () => {
      it("should soft-delete an existing API key", async () => {
        vi.mocked(database.apiKey.findFirst).mockResolvedValue(
          createMockApiKey({ id: "key-001" }) as never
        );
        vi.mocked(database.apiKey.update).mockResolvedValue({} as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001",
          {
            method: "DELETE",
          }
        );
        const response = await deleteApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);

        expect(database.apiKey.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              tenantId_id: {
                tenantId: TEST_TENANT_ID,
                id: "key-001",
              },
            },
            data: {
              deletedAt: expect.any(Date),
            },
          })
        );
      });

      it("should return 404 for non-existent or already-deleted key", async () => {
        vi.mocked(database.apiKey.findFirst).mockResolvedValue(null as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/nonexistent",
          {
            method: "DELETE",
          }
        );
        const response = await deleteApiKey(request, {
          params: Promise.resolve({ id: "nonexistent" }),
        });

        expect(response.status).toBe(404);
      });
    });

    // ------------------------------------------------ REVOKE
    describe("POST /api/settings/api-keys/[id]/revoke", () => {
      it("should revoke an active API key", async () => {
        vi.mocked(database.apiKey.findUnique).mockResolvedValue(
          createMockApiKey({ id: "key-001", revokedAt: null }) as never
        );
        vi.mocked(database.apiKey.update).mockResolvedValue({
          id: "key-001",
          name: "Test API Key",
          keyPrefix: "cp_live_",
          revokedAt: new Date("2026-01-20"),
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001/revoke",
          {
            method: "POST",
          }
        );
        const response = await revokeApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.id).toBe("key-001");
        expect(body.revokedAt).toBeTruthy();
      });

      it("should return 404 when key not found", async () => {
        vi.mocked(database.apiKey.findUnique).mockResolvedValue(null as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001/revoke",
          {
            method: "POST",
          }
        );
        const response = await revokeApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(404);
      });

      it("should return 400 when key is already revoked", async () => {
        vi.mocked(database.apiKey.findUnique).mockResolvedValue(
          createMockApiKey({ revokedAt: new Date() }) as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001/revoke",
          {
            method: "POST",
          }
        );
        const response = await revokeApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("API key is already revoked");
      });

      it("should return 404 when key is soft-deleted", async () => {
        vi.mocked(database.apiKey.findUnique).mockResolvedValue(
          createMockApiKey({ deletedAt: new Date() }) as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001/revoke",
          {
            method: "POST",
          }
        );
        const response = await revokeApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(404);
      });
    });

    // ------------------------------------------------ ROTATE
    describe("POST /api/settings/api-keys/[id]/rotate", () => {
      it("should rotate an API key and return new plain key", async () => {
        vi.mocked(database.apiKey.findUnique).mockResolvedValue(
          createMockApiKey({ id: "key-001", revokedAt: null }) as never
        );
        vi.mocked(generateApiKey).mockReturnValue({
          plainKey: "cp_live_newkey123",
          hashedKey: "newhash456",
          keyPrefix: "cp_live_",
        });
        vi.mocked(database.apiKey.update).mockResolvedValue({
          id: "key-001",
          name: "Test API Key",
          keyPrefix: "cp_live_",
          scopes: ["read"],
          lastUsedAt: null,
          expiresAt: null,
          revokedAt: null,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-20"),
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001/rotate",
          {
            method: "POST",
          }
        );
        const response = await rotateApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.plainKey).toBe("cp_live_newkey123");
        expect(body.keyPrefix).toBe("cp_live_");
      });

      it("should return 404 when key not found", async () => {
        vi.mocked(database.apiKey.findUnique).mockResolvedValue(null as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001/rotate",
          {
            method: "POST",
          }
        );
        const response = await rotateApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(404);
      });

      it("should return 400 when trying to rotate a revoked key", async () => {
        vi.mocked(database.apiKey.findUnique).mockResolvedValue(
          createMockApiKey({ revokedAt: new Date() }) as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/key-001/rotate",
          {
            method: "POST",
          }
        );
        const response = await rotateApiKey(request, {
          params: Promise.resolve({ id: "key-001" }),
        });

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Cannot rotate a revoked API key");
      });
    });
  });

  // =====================================================================
  // API KEYS - Manifest-generated list route (auth + getTenantIdForOrg)
  // =====================================================================
  describe("API Keys List (manifest-generated)", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_CLERK_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/settings/api-keys/list"
      );
      const response = await listApiKeysManifest(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/settings/api-keys/list"
      );
      const response = await listApiKeysManifest(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Tenant not found");
    });

    it("should return API keys ordered by created_at desc", async () => {
      vi.mocked(database.apiKey.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/settings/api-keys/list"
      );
      await listApiKeysManifest(request);

      expect(database.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TEST_TENANT_ID, deletedAt: null },
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.apiKey.findMany).mockRejectedValue(
        new Error("DB fail") as never
      );

      const request = new NextRequest(
        "http://localhost/api/settings/api-keys/list"
      );
      const response = await listApiKeysManifest(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // =====================================================================
  // API KEYS - Manifest command routes
  // =====================================================================
  describe("API Key Commands (manifest runtime)", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_CLERK_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);
      vi.mocked(database.user.findFirst).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        authUserId: TEST_CLERK_ID,
      } as never);
    });

    // --- Create command
    describe("POST /api/settings/api-keys/commands/create", () => {
      it("should create via manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "key-new" },
          emittedEvents: [],
        });

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/create",
          {
            method: "POST",
            body: JSON.stringify({ name: "Runtime Key" }),
          }
        );
        const response = await commandCreateApiKey(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual({ id: "key-new" });
      });

      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/create",
          {
            method: "POST",
            body: JSON.stringify({ name: "Test" }),
          }
        );
        const response = await commandCreateApiKey(request);

        expect(response.status).toBe(401);
      });

      it("should return 400 when user not found in database", async () => {
        vi.mocked(database.user.findFirst).mockResolvedValue(null as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/create",
          {
            method: "POST",
            body: JSON.stringify({ name: "Test" }),
          }
        );
        const response = await commandCreateApiKey(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("User not found in database");
      });

      it("should return 403 on policy denial", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          policyDenial: { policyName: "AdminOnlyPolicy" },
        });

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/create",
          {
            method: "POST",
            body: JSON.stringify({ name: "Denied Key" }),
          }
        );
        const response = await commandCreateApiKey(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.message).toContain("Access denied");
        expect(body.message).toContain("AdminOnlyPolicy");
      });

      it("should return 422 on guard failure", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          guardFailure: { index: 0, formatted: "Name is required" },
        });

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/create",
          {
            method: "POST",
            body: JSON.stringify({}),
          }
        );
        const response = await commandCreateApiKey(request);

        expect(response.status).toBe(422);
        const body = await response.json();
        expect(body.message).toContain("Guard 0 failed");
      });

      it("should return 400 on generic command failure", async () => {
        mockRunCommand.mockResolvedValue({
          success: false,
          error: "Invalid payload",
        });

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/create",
          {
            method: "POST",
            body: JSON.stringify({}),
          }
        );
        const response = await commandCreateApiKey(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Invalid payload");
      });

      it("should return 500 on runtime crash", async () => {
        mockRunCommand.mockRejectedValue(new Error("Runtime crash"));

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/create",
          {
            method: "POST",
            body: JSON.stringify({ name: "Crash" }),
          }
        );
        const response = await commandCreateApiKey(request);

        expect(response.status).toBe(500);
      });
    });

    // --- Revoke command
    describe("POST /api/settings/api-keys/commands/revoke", () => {
      it("should revoke via manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "key-001", revokedAt: "2026-01-20" },
          emittedEvents: [],
        });

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/revoke",
          {
            method: "POST",
            body: JSON.stringify({ id: "key-001" }),
          }
        );
        const response = await commandRevokeApiKey(request);

        expect(response.status).toBe(200);
        expect(mockRunCommand).toHaveBeenCalledWith(
          "revoke",
          expect.anything(),
          {
            entityName: "ApiKey",
          }
        );
      });

      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/revoke",
          {
            method: "POST",
            body: JSON.stringify({ id: "key-001" }),
          }
        );
        const response = await commandRevokeApiKey(request);

        expect(response.status).toBe(401);
      });
    });

    // --- Update command
    describe("POST /api/settings/api-keys/commands/update", () => {
      it("should update via manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "key-001", name: "Updated" },
          emittedEvents: [],
        });

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/update",
          {
            method: "POST",
            body: JSON.stringify({ id: "key-001", name: "Updated" }),
          }
        );
        const response = await commandUpdateApiKey(request);

        expect(response.status).toBe(200);
        expect(mockRunCommand).toHaveBeenCalledWith(
          "update",
          expect.anything(),
          {
            entityName: "ApiKey",
          }
        );
      });
    });

    // --- Soft-delete command
    describe("POST /api/settings/api-keys/commands/soft-delete", () => {
      it("should soft-delete via manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "key-001" },
          emittedEvents: [],
        });

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/soft-delete",
          {
            method: "POST",
            body: JSON.stringify({ id: "key-001" }),
          }
        );
        const response = await commandSoftDeleteApiKey(request);

        expect(response.status).toBe(200);
        expect(mockRunCommand).toHaveBeenCalledWith(
          "softDelete",
          expect.anything(),
          {
            entityName: "ApiKey",
          }
        );
      });
    });

    // --- Record-usage command
    describe("POST /api/settings/api-keys/commands/record-usage", () => {
      it("should record usage via manifest runtime", async () => {
        mockRunCommand.mockResolvedValue({
          success: true,
          result: { id: "key-001", lastUsedAt: "2026-01-20" },
          emittedEvents: [],
        });

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/record-usage",
          {
            method: "POST",
            body: JSON.stringify({ id: "key-001" }),
          }
        );
        const response = await commandRecordUsage(request);

        expect(response.status).toBe(200);
        expect(mockRunCommand).toHaveBeenCalledWith(
          "recordUsage",
          expect.anything(),
          {
            entityName: "ApiKey",
          }
        );
      });

      it("should return 500 on unexpected error", async () => {
        mockRunCommand.mockRejectedValue(new Error("Unexpected"));

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys/commands/record-usage",
          {
            method: "POST",
            body: JSON.stringify({ id: "key-001" }),
          }
        );
        const response = await commandRecordUsage(request);

        expect(response.status).toBe(500);
      });
    });
  });

  // =====================================================================
  // RATE LIMITS - List & Create (auth + getTenantIdForOrg)
  // =====================================================================
  describe("Rate Limits", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_CLERK_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
    });

    // --------------------------------------------------------- LIST
    describe("GET /api/settings/rate-limits (list)", () => {
      it("should return rate limit configs for tenant", async () => {
        const mockConfigs = [
          createMockRateLimitConfig({ id: "rl-1", name: "Global Limit" }),
          createMockRateLimitConfig({ id: "rl-2", name: "API Specific" }),
        ];

        vi.mocked(database.rateLimitConfig.findMany).mockResolvedValue(
          mockConfigs as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits"
        );
        const response = await listRateLimits(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.rateLimitConfigs).toHaveLength(2);
      });

      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits"
        );
        const response = await listRateLimits(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits"
        );
        const response = await listRateLimits(request);

        expect(response.status).toBe(400);
      });

      it("should order by priority desc then created_at desc", async () => {
        vi.mocked(database.rateLimitConfig.findMany).mockResolvedValue(
          [] as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits"
        );
        await listRateLimits(request);

        expect(database.rateLimitConfig.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          })
        );
      });

      it("should return 500 on database error", async () => {
        vi.mocked(database.rateLimitConfig.findMany).mockRejectedValue(
          new Error("DB error") as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits"
        );
        const response = await listRateLimits(request);

        expect(response.status).toBe(500);
      });
    });

    // ------------------------------------------------ CREATE
    describe("POST /api/settings/rate-limits (create)", () => {
      it("should create a new rate limit config", async () => {
        vi.mocked(database.rateLimitConfig.create).mockResolvedValue({
          id: "rl-new",
          name: "New Limit",
          endpointPattern: "/api/test",
          windowMs: 60_000,
          maxRequests: 100,
          burstAllowance: 10,
          priority: 0,
          isActive: true,
          createdAt: new Date("2026-01-01"),
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits",
          {
            method: "POST",
            body: JSON.stringify({
              name: "New Limit",
              endpointPattern: "/api/test",
              windowMs: 60_000,
              maxRequests: 100,
            }),
          }
        );
        const response = await createRateLimit(request);

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body.name).toBe("New Limit");
        expect(body.windowMs).toBe(60_000);
      });

      it("should return 400 when name is missing", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits",
          {
            method: "POST",
            body: JSON.stringify({
              endpointPattern: "/api/test",
              windowMs: 60_000,
              maxRequests: 100,
            }),
          }
        );
        const response = await createRateLimit(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Name is required");
      });

      it("should return 400 when endpointPattern is missing", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits",
          {
            method: "POST",
            body: JSON.stringify({
              name: "Test",
              windowMs: 60_000,
              maxRequests: 100,
            }),
          }
        );
        const response = await createRateLimit(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Endpoint pattern is required");
      });

      it("should return 400 when windowMs is invalid", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits",
          {
            method: "POST",
            body: JSON.stringify({
              name: "Test",
              endpointPattern: "/api/test",
              windowMs: -1,
              maxRequests: 100,
            }),
          }
        );
        const response = await createRateLimit(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Window duration must be a positive number");
      });

      it("should return 400 when maxRequests is invalid", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits",
          {
            method: "POST",
            body: JSON.stringify({
              name: "Test",
              endpointPattern: "/api/test",
              windowMs: 60_000,
              maxRequests: 0,
            }),
          }
        );
        const response = await createRateLimit(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Max requests must be a positive number");
      });

      it("should return 400 for invalid regex pattern", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits",
          {
            method: "POST",
            body: JSON.stringify({
              name: "Test",
              endpointPattern: "([invalid",
              windowMs: 60_000,
              maxRequests: 100,
            }),
          }
        );
        const response = await createRateLimit(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Invalid endpoint pattern regex");
      });

      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits",
          {
            method: "POST",
            body: JSON.stringify({
              name: "Test",
              endpointPattern: "/api/test",
              windowMs: 60_000,
              maxRequests: 100,
            }),
          }
        );
        const response = await createRateLimit(request);

        expect(response.status).toBe(401);
      });
    });

    // ---------------------------------------------------- DETAIL [id]
    describe("GET /api/settings/rate-limits/[id] (detail)", () => {
      it("should return a single rate limit config", async () => {
        vi.mocked(database.rateLimitConfig.findFirst).mockResolvedValue(
          createMockRateLimitConfig({ id: "rl-001" }) as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001"
        );
        const response = await getRateLimitDetail(request, {
          params: Promise.resolve({ id: "rl-001" }),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.config.id).toBe("rl-001");
      });

      it("should return 404 when config not found", async () => {
        vi.mocked(database.rateLimitConfig.findFirst).mockResolvedValue(
          null as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/nonexistent"
        );
        const response = await getRateLimitDetail(request, {
          params: Promise.resolve({ id: "nonexistent" }),
        });

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.message).toBe("Rate limit configuration not found");
      });

      it("should enforce tenant isolation", async () => {
        vi.mocked(database.rateLimitConfig.findFirst).mockResolvedValue(
          null as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001"
        );
        await getRateLimitDetail(request, {
          params: Promise.resolve({ id: "rl-001" }),
        });

        expect(database.rateLimitConfig.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              id: "rl-001",
              tenantId: TEST_TENANT_ID,
              deletedAt: null,
            },
          })
        );
      });
    });

    // ------------------------------------------------ UPDATE [id]
    describe("PATCH /api/settings/rate-limits/[id] (update)", () => {
      it("should update a rate limit config", async () => {
        vi.mocked(database.rateLimitConfig.findFirst).mockResolvedValue(
          createMockRateLimitConfig({ id: "rl-001" }) as never
        );
        vi.mocked(database.rateLimitConfig.update).mockResolvedValue({
          id: "rl-001",
          name: "Updated Limit",
          endpointPattern: "/api/.*",
          windowMs: 120_000,
          maxRequests: 200,
          burstAllowance: 20,
          priority: 1,
          isActive: true,
          updatedAt: new Date("2026-01-20"),
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001",
          {
            method: "PATCH",
            body: JSON.stringify({ maxRequests: 200, windowMs: 120_000 }),
          }
        );
        const response = await updateRateLimit(request, {
          params: Promise.resolve({ id: "rl-001" }),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.maxRequests).toBe(200);
      });

      it("should return 404 when config not found", async () => {
        vi.mocked(database.rateLimitConfig.findFirst).mockResolvedValue(
          null as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/nonexistent",
          {
            method: "PATCH",
            body: JSON.stringify({ maxRequests: 200 }),
          }
        );
        const response = await updateRateLimit(request, {
          params: Promise.resolve({ id: "nonexistent" }),
        });

        expect(response.status).toBe(404);
      });

      it("should return 400 when windowMs is not positive", async () => {
        vi.mocked(database.rateLimitConfig.findFirst).mockResolvedValue(
          createMockRateLimitConfig({ id: "rl-001" }) as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001",
          {
            method: "PATCH",
            body: JSON.stringify({ windowMs: -100 }),
          }
        );
        const response = await updateRateLimit(request, {
          params: Promise.resolve({ id: "rl-001" }),
        });

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Window duration must be positive");
      });

      it("should return 400 when maxRequests is not positive", async () => {
        vi.mocked(database.rateLimitConfig.findFirst).mockResolvedValue(
          createMockRateLimitConfig({ id: "rl-001" }) as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001",
          {
            method: "PATCH",
            body: JSON.stringify({ maxRequests: -5 }),
          }
        );
        const response = await updateRateLimit(request, {
          params: Promise.resolve({ id: "rl-001" }),
        });

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Max requests must be positive");
      });

      it("should return 400 when endpointPattern is empty", async () => {
        vi.mocked(database.rateLimitConfig.findFirst).mockResolvedValue(
          createMockRateLimitConfig({ id: "rl-001" }) as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001",
          {
            method: "PATCH",
            body: JSON.stringify({ endpointPattern: "  " }),
          }
        );
        const response = await updateRateLimit(request, {
          params: Promise.resolve({ id: "rl-001" }),
        });

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Endpoint pattern is required");
      });

      it("should only update allowed fields", async () => {
        vi.mocked(database.rateLimitConfig.findFirst).mockResolvedValue(
          createMockRateLimitConfig({ id: "rl-001" }) as never
        );
        vi.mocked(database.rateLimitConfig.update).mockResolvedValue({
          id: "rl-001",
          name: "Updated",
          endpointPattern: "/api/.*",
          windowMs: 60_000,
          maxRequests: 100,
          burstAllowance: 10,
          priority: 0,
          isActive: true,
          updatedAt: new Date("2026-01-20"),
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001",
          {
            method: "PATCH",
            body: JSON.stringify({
              name: "Updated",
              maliciousField: "should-be-ignored",
            }),
          }
        );
        await updateRateLimit(request, {
          params: Promise.resolve({ id: "rl-001" }),
        });

        const updateCall = vi.mocked(database.rateLimitConfig.update).mock
          .calls[0][0] as {
          data: Record<string, unknown>;
        };
        expect(updateCall.data).not.toHaveProperty("maliciousField");
      });
    });

    // ------------------------------------------------ DELETE (soft-delete)
    describe("DELETE /api/settings/rate-limits/[id] (soft-delete)", () => {
      it("should soft-delete a rate limit config", async () => {
        vi.mocked(database.rateLimitConfig.findFirst).mockResolvedValue(
          createMockRateLimitConfig({ id: "rl-001" }) as never
        );
        vi.mocked(database.rateLimitConfig.update).mockResolvedValue(
          {} as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001",
          {
            method: "DELETE",
          }
        );
        const response = await deleteRateLimit(request, {
          params: Promise.resolve({ id: "rl-001" }),
        });

        expect(response.status).toBe(204);

        expect(database.rateLimitConfig.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { tenantId_id: { tenantId: TEST_TENANT_ID, id: "rl-001" } },
            data: { deletedAt: expect.any(Date) },
          })
        );
      });

      it("should return 404 when config not found", async () => {
        vi.mocked(database.rateLimitConfig.findFirst).mockResolvedValue(
          null as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/nonexistent",
          {
            method: "DELETE",
          }
        );
        const response = await deleteRateLimit(request, {
          params: Promise.resolve({ id: "nonexistent" }),
        });

        expect(response.status).toBe(404);
      });

      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001",
          {
            method: "DELETE",
          }
        );
        const response = await deleteRateLimit(request, {
          params: Promise.resolve({ id: "rl-001" }),
        });

        expect(response.status).toBe(401);
      });
    });

    // ------------------------------------------------ ANALYTICS
    describe("GET /api/settings/rate-limits/analytics", () => {
      it("should return analytics data", async () => {
        vi.mocked(database.rateLimitUsage.groupBy).mockResolvedValue([
          {
            endpoint: "/api/test",
            method: "GET",
            _sum: { requestCount: 1000, blockedCount: 50 },
            _avg: { avgResponseTime: 120 },
            _max: { maxResponseTime: 500 },
          },
        ] as never);
        vi.mocked(database.rateLimitUsage.aggregate).mockResolvedValue({
          _sum: { requestCount: 5000, blockedCount: 200 },
        } as never);
        vi.mocked(database.rateLimitEvent.groupBy)
          .mockResolvedValueOnce([
            { allowed: true, _count: 4800 },
            { allowed: false, _count: 200 },
          ] as never)
          .mockResolvedValueOnce([
            { endpoint: "/api/test", _count: 150 },
          ] as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/analytics"
        );
        const response = await getRateLimitAnalytics(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.analytics.summary.totalRequests).toBe(5000);
        expect(body.analytics.summary.totalBlocked).toBe(200);
        expect(body.analytics.byEndpoint).toHaveLength(1);
        expect(body.analytics.byEndpoint[0].endpoint).toBe("/api/test");
      });

      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/analytics"
        );
        const response = await getRateLimitAnalytics(request);

        expect(response.status).toBe(401);
      });

      it("should accept startDate and endDate query params", async () => {
        vi.mocked(database.rateLimitUsage.groupBy).mockResolvedValue(
          [] as never
        );
        vi.mocked(database.rateLimitUsage.aggregate).mockResolvedValue({
          _sum: { requestCount: null, blockedCount: null },
        } as never);
        vi.mocked(database.rateLimitEvent.groupBy)
          .mockResolvedValueOnce([] as never)
          .mockResolvedValueOnce([] as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/analytics?startDate=2026-01-01&endDate=2026-01-31"
        );
        const response = await getRateLimitAnalytics(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.analytics.period.start).toBe(
          new Date("2026-01-01").toISOString()
        );
        expect(body.analytics.period.end).toBe(
          new Date("2026-01-31").toISOString()
        );
      });

      it("should return 500 on database error", async () => {
        vi.mocked(database.rateLimitUsage.groupBy).mockRejectedValue(
          new Error("DB fail") as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/analytics"
        );
        const response = await getRateLimitAnalytics(request);

        expect(response.status).toBe(500);
      });
    });

    // ------------------------------------------------ EVENTS
    describe("GET /api/settings/rate-limits/events", () => {
      it("should return paginated rate limit events", async () => {
        vi.mocked(database.rateLimitEvent.count).mockResolvedValue(
          100 as never
        );
        vi.mocked(database.rateLimitEvent.findMany).mockResolvedValue([
          {
            id: "evt-001",
            endpoint: "/api/test",
            method: "GET",
            allowed: false,
            windowStart: new Date("2026-01-15"),
            windowEnd: new Date("2026-01-15"),
            requestsInWindow: 101,
            limit: 100,
            userId: "user-1",
            userAgent: "test-agent",
            ipHash: "abc123",
            responseTime: 50,
            timestamp: new Date("2026-01-15T10:00:00Z"),
          },
        ] as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/events?page=1&limit=10"
        );
        const response = await getRateLimitEvents(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.events).toHaveLength(1);
        expect(body.pagination.total).toBe(100);
        expect(body.pagination.page).toBe(1);
        expect(body.pagination.limit).toBe(10);
        expect(body.pagination.totalPages).toBe(10);
      });

      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/events"
        );
        const response = await getRateLimitEvents(request);

        expect(response.status).toBe(401);
      });

      it("should apply allowed filter", async () => {
        vi.mocked(database.rateLimitEvent.count).mockResolvedValue(0 as never);
        vi.mocked(database.rateLimitEvent.findMany).mockResolvedValue(
          [] as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/events?allowed=false"
        );
        await getRateLimitEvents(request);

        expect(database.rateLimitEvent.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ allowed: false }),
          })
        );
      });

      it("should cap limit at 200", async () => {
        vi.mocked(database.rateLimitEvent.count).mockResolvedValue(0 as never);
        vi.mocked(database.rateLimitEvent.findMany).mockResolvedValue(
          [] as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/events?limit=500"
        );
        await getRateLimitEvents(request);

        expect(database.rateLimitEvent.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 200,
          })
        );
      });

      it("should default page to 1 and limit to 50", async () => {
        vi.mocked(database.rateLimitEvent.count).mockResolvedValue(0 as never);
        vi.mocked(database.rateLimitEvent.findMany).mockResolvedValue(
          [] as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/events"
        );
        await getRateLimitEvents(request);

        expect(database.rateLimitEvent.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 50,
            skip: 0,
          })
        );
      });

      it("should return 500 on database error", async () => {
        vi.mocked(database.rateLimitEvent.count).mockRejectedValue(
          new Error("DB fail") as never
        );

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/events"
        );
        const response = await getRateLimitEvents(request);

        expect(response.status).toBe(500);
      });
    });
  });

  // =====================================================================
  // AUDIT LOG
  // =====================================================================
  describe("Audit Log", () => {
    beforeEach(() => {
      vi.mocked(requireCurrentUser).mockResolvedValue(
        createMockCurrentUser() as never
      );
    });

    it("should return paginated audit log entries", async () => {
      const mockLogs = [
        createMockAuditLogEntry({ id: "audit-001", action: "update" }),
        createMockAuditLogEntry({ id: "audit-002", action: "insert" }),
      ];

      vi.mocked(database.audit_log.findMany)
        .mockResolvedValueOnce(mockLogs as never) // actual query
        .mockResolvedValueOnce([
          { table_name: "api_keys" },
          { table_name: "users" },
        ] as never); // distinct tables
      vi.mocked(database.audit_log.count).mockResolvedValue(2 as never);
      vi.mocked(database.user.findMany).mockResolvedValue([
        {
          id: TEST_USER_ID,
          email: "admin@test.com",
          firstName: "Test",
          lastName: "Admin",
        },
      ] as never);

      const request = new NextRequest(
        "http://localhost/api/settings/audit-log?page=1&limit=50"
      );
      const response = await getAuditLog(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.entries).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(50);
      expect(body.totalPages).toBe(1);
      expect(body.tableNames).toEqual(["api_keys", "users"]);
    });

    it("should resolve performed_by user names", async () => {
      vi.mocked(database.audit_log.findMany)
        .mockResolvedValueOnce([
          createMockAuditLogEntry({ performed_by: TEST_USER_ID }),
        ] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(database.audit_log.count).mockResolvedValue(1 as never);
      vi.mocked(database.user.findMany).mockResolvedValue([
        {
          id: TEST_USER_ID,
          email: "admin@test.com",
          firstName: "Test",
          lastName: "Admin",
        },
      ] as never);

      const request = new NextRequest(
        "http://localhost/api/settings/audit-log"
      );
      const response = await getAuditLog(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.entries[0].performedByName).toBe("Test Admin");
      expect(body.entries[0].performedByEmail).toBe("admin@test.com");
    });

    it("should filter by action", async () => {
      vi.mocked(database.audit_log.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(database.audit_log.count).mockResolvedValue(0 as never);

      const request = new NextRequest(
        "http://localhost/api/settings/audit-log?action=update"
      );
      await getAuditLog(request);

      expect(database.audit_log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: "update",
            tenant_id: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("should ignore invalid action filter", async () => {
      vi.mocked(database.audit_log.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(database.audit_log.count).mockResolvedValue(0 as never);

      const request = new NextRequest(
        "http://localhost/api/settings/audit-log?action=invalid"
      );
      await getAuditLog(request);

      const where = (
        vi.mocked(database.audit_log.findMany).mock.calls[0][0] as {
          where: Record<string, unknown>;
        }
      ).where;
      expect(where).not.toHaveProperty("action");
    });

    it("should filter by table_name", async () => {
      vi.mocked(database.audit_log.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(database.audit_log.count).mockResolvedValue(0 as never);

      const request = new NextRequest(
        "http://localhost/api/settings/audit-log?table_name=api_keys"
      );
      await getAuditLog(request);

      expect(database.audit_log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            table_name: "api_keys",
          }),
        })
      );
    });

    it("should filter by performed_by", async () => {
      vi.mocked(database.audit_log.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(database.audit_log.count).mockResolvedValue(0 as never);

      const request = new NextRequest(
        "http://localhost/api/settings/audit-log?performed_by=user-123"
      );
      await getAuditLog(request);

      expect(database.audit_log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            performed_by: "user-123",
          }),
        })
      );
    });

    it("should cap limit at 200 and default to 50", async () => {
      vi.mocked(database.audit_log.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(database.audit_log.count).mockResolvedValue(0 as never);

      const request = new NextRequest(
        "http://localhost/api/settings/audit-log?limit=500"
      );
      await getAuditLog(request);

      const firstCall = vi.mocked(database.audit_log.findMany).mock
        .calls[0][0] as {
        take: number;
      };
      expect(firstCall.take).toBe(200);
    });

    it("should handle entries with null performed_by", async () => {
      vi.mocked(database.audit_log.findMany)
        .mockResolvedValueOnce([
          createMockAuditLogEntry({ performed_by: null }),
        ] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(database.audit_log.count).mockResolvedValue(1 as never);

      const request = new NextRequest(
        "http://localhost/api/settings/audit-log"
      );
      const response = await getAuditLog(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.entries[0].performedByName).toBeNull();
      expect(body.entries[0].performedByEmail).toBeNull();
    });

    it("should return 500 when requireCurrentUser throws", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("Auth required") as never
      );

      const request = new NextRequest(
        "http://localhost/api/settings/audit-log"
      );
      const response = await getAuditLog(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Failed to fetch audit log entries");
    });

    it("should order entries by created_at desc", async () => {
      vi.mocked(database.audit_log.findMany)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);
      vi.mocked(database.audit_log.count).mockResolvedValue(0 as never);

      const request = new NextRequest(
        "http://localhost/api/settings/audit-log"
      );
      await getAuditLog(request);

      expect(database.audit_log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { created_at: "desc" },
        })
      );
    });
  });
});
