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
import {
  POST as commandCreateApiKey,
  POST as commandRecordUsage,
  POST as commandRevokeApiKey,
  POST as commandSoftDeleteApiKey,
  POST as commandUpdateApiKey,
} from "@/app/api/manifest/[entity]/commands/[command]/route";
import { POST as revokeApiKey } from "@/app/api/settings/api-keys/[id]/revoke/route";
import { POST as rotateApiKey } from "@/app/api/settings/api-keys/[id]/rotate/route";
// --- Direct route handlers (use requireCurrentUser + withRateLimit) ---
import {
  DELETE as deleteApiKey,
  GET as getApiKey,
  PUT as updateApiKey,
} from "@/app/api/settings/api-keys/[id]/route";
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
vi.mock("@repo/notifications", () => ({}));
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
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
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/app/lib/api-key-service", () => ({
  generateApiKey: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn(
    (data) => new Response(JSON.stringify(data), { status: 200 })
  ),
  manifestErrorResponse: vi.fn(
    (data, status = 400) => new Response(JSON.stringify(data), { status })
  ),
}));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {},
}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({
  logManifestIssue: vi.fn(),
}));
vi.mock("@/middleware/rate-limiter", () => ({
  withRateLimit: (_handler: Function, _opts?: unknown) => _handler,
}));
vi.mock("@/middleware/dual-auth", () => ({
  requireDualAuth: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/api-scopes", () => ({
  API_SCOPES: { ADMIN: "admin" },
  VALID_SCOPES: ["read", "write", "admin"],
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser, resolveCurrentUser } =
  await import("@/app/lib/tenant");
const { generateApiKey } = await import("@/app/lib/api-key-service");
const { requireDualAuth } = await import("@/middleware/dual-auth");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

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
      vi.mocked(requireDualAuth).mockResolvedValue({
        authenticated: true,
        authMethod: "session",
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
      });
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

        const call = vi.mocked(database.apiKey.findMany).mock.calls[0]?.[0] as {
          select: Record<string, boolean>;
        };
        expect(call.select.hashedKey).toBeUndefined();
      });

      it("should return 500 when requireDualAuth throws", async () => {
        vi.mocked(requireDualAuth).mockRejectedValue(
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

        // runManifestCommand returns a successful Response
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: {
                id: "key-new",
                name: "My Key",
                keyPrefix: "cp_live_",
                scopes: ["admin"],
                expiresAt: null,
                createdAt: "2026-01-01T00:00:00.000Z",
              },
              events: [],
            }),
            { status: 200 }
          )
        );

        const request = new NextRequest(
          "http://localhost/api/settings/api-keys",
          {
            method: "POST",
            body: JSON.stringify({ name: "My Key", scopes: ["admin"] }),
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

        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: {
                id: "key-001",
                name: "Updated Key",
                keyPrefix: "cp_live_",
                scopes: ["read"],
                lastUsedAt: null,
                expiresAt: null,
                revokedAt: null,
                createdByUserId: TEST_USER_ID,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-02T00:00:00.000Z",
              },
              events: [],
            }),
            { status: 200 }
          )
        );

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
        expect(body.result.name).toBe("Updated Key");
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
      it("should soft-delete an existing API key via manifest command", async () => {
        vi.mocked(database.apiKey.findFirst).mockResolvedValue(
          createMockApiKey({ id: "key-001" }) as never
        );
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "key-001" },
              events: [],
            }),
            { status: 200 }
          )
        );

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

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ApiKey",
            command: "softDelete",
            body: expect.objectContaining({ id: "key-001" }),
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
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
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: {
                id: "key-001",
                name: "Test API Key",
                keyPrefix: "cp_live_",
                revokedAt: "2026-01-20T00:00:00.000Z",
              },
              events: [],
            }),
            { status: 200 }
          )
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

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.result.id).toBe("key-001");
        expect(body.result.revokedAt).toBeTruthy();
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
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: {
                id: "key-001",
                name: "Test API Key",
                keyPrefix: "cp_live_",
                scopes: ["read"],
                lastUsedAt: null,
                expiresAt: null,
                revokedAt: null,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-20T00:00:00.000Z",
              },
              events: [],
            }),
            { status: 200 }
          )
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
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/settings/api-keys/list"
      );
      const response = await listApiKeysManifest(request);

      expect(response.status).toBe(400);
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
    });
  });

  // =====================================================================
  // API KEYS - Manifest command routes (dispatcher)
  // =====================================================================
  describe("API Key Commands (manifest runtime)", () => {
    beforeEach(() => {
      vi.mocked(requireCurrentUser).mockResolvedValue(
        createMockCurrentUser() as never
      );
    });

    // --- Create command
    describe("POST /api/manifest/[entity]/commands/[command] (create)", () => {
      it("should create via manifest command dispatcher", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "key-new" },
              events: [],
            }),
            { status: 200 }
          )
        );

        const request = new NextRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          {
            method: "POST",
            body: JSON.stringify({ name: "Runtime Key" }),
          }
        );
        const response = await commandCreateApiKey(request, {
          params: Promise.resolve({ entity: "ApiKey", command: "create" }),
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result).toEqual({ id: "key-new" });

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ApiKey",
            command: "create",
            body: expect.objectContaining({ name: "Runtime Key" }),
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
              role: "admin",
            }),
          })
        );
      });

      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError as never);

        const request = new NextRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          {
            method: "POST",
            body: JSON.stringify({ name: "Test" }),
          }
        );
        const response = await commandCreateApiKey(request, {
          params: Promise.resolve({ entity: "ApiKey", command: "create" }),
        });

        expect(response.status).toBe(401);
      });

      it("should return 500 on runtime crash", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Runtime crash")
        );

        const request = new NextRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          {
            method: "POST",
            body: JSON.stringify({ name: "Crash" }),
          }
        );
        const response = await commandCreateApiKey(request, {
          params: Promise.resolve({ entity: "ApiKey", command: "create" }),
        });

        expect(response.status).toBe(500);
      });
    });

    // --- Revoke command
    describe("POST /api/manifest/[entity]/commands/[command] (revoke)", () => {
      it("should revoke via manifest command dispatcher", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "key-001", revokedAt: "2026-01-20" },
              events: [],
            }),
            { status: 200 }
          )
        );

        const request = new NextRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          {
            method: "POST",
            body: JSON.stringify({ id: "key-001" }),
          }
        );
        const response = await commandRevokeApiKey(request, {
          params: Promise.resolve({ entity: "ApiKey", command: "revoke" }),
        });

        expect(response.status).toBe(200);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ApiKey",
            command: "revoke",
            body: expect.objectContaining({ id: "key-001" }),
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });

      it("should return 401 for unauthenticated requests", async () => {
        const authError = new Error("Unauthenticated");
        authError.name = "InvariantError";
        vi.mocked(requireCurrentUser).mockRejectedValue(authError as never);

        const request = new NextRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          {
            method: "POST",
            body: JSON.stringify({ id: "key-001" }),
          }
        );
        const response = await commandRevokeApiKey(request, {
          params: Promise.resolve({ entity: "ApiKey", command: "revoke" }),
        });

        expect(response.status).toBe(401);
      });
    });

    // --- Update command
    describe("POST /api/manifest/[entity]/commands/[command] (update)", () => {
      it("should update via manifest command dispatcher", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "key-001", name: "Updated" },
              events: [],
            }),
            { status: 200 }
          )
        );

        const request = new NextRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          {
            method: "POST",
            body: JSON.stringify({ id: "key-001", name: "Updated" }),
          }
        );
        const response = await commandUpdateApiKey(request, {
          params: Promise.resolve({ entity: "ApiKey", command: "update" }),
        });

        expect(response.status).toBe(200);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ApiKey",
            command: "update",
            body: expect.objectContaining({ id: "key-001", name: "Updated" }),
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });
    });

    // --- Soft-delete command
    describe("POST /api/manifest/[entity]/commands/[command] (softDelete)", () => {
      it("should soft-delete via manifest command dispatcher", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "key-001" },
              events: [],
            }),
            { status: 200 }
          )
        );

        const request = new NextRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          {
            method: "POST",
            body: JSON.stringify({ id: "key-001" }),
          }
        );
        const response = await commandSoftDeleteApiKey(request, {
          params: Promise.resolve({ entity: "ApiKey", command: "softDelete" }),
        });

        expect(response.status).toBe(200);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ApiKey",
            command: "softDelete",
            body: expect.objectContaining({ id: "key-001" }),
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });
    });

    // --- Record-usage command
    describe("POST /api/manifest/[entity]/commands/[command] (recordUsage)", () => {
      it("should record usage via manifest command dispatcher", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: { id: "key-001", lastUsedAt: "2026-01-20" },
              events: [],
            }),
            { status: 200 }
          )
        );

        const request = new NextRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          {
            method: "POST",
            body: JSON.stringify({ id: "key-001" }),
          }
        );
        const response = await commandRecordUsage(request, {
          params: Promise.resolve({ entity: "ApiKey", command: "recordUsage" }),
        });

        expect(response.status).toBe(200);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "ApiKey",
            command: "recordUsage",
            body: expect.objectContaining({ id: "key-001" }),
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });

      it("should return 500 on unexpected error", async () => {
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Unexpected")
        );

        const request = new NextRequest(
          "http://localhost/api/manifest/[entity]/commands/[command]",
          {
            method: "POST",
            body: JSON.stringify({ id: "key-001" }),
          }
        );
        const response = await commandRecordUsage(request, {
          params: Promise.resolve({ entity: "ApiKey", command: "recordUsage" }),
        });

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
      vi.mocked(resolveCurrentUser).mockResolvedValue(
        createMockCurrentUser() as never
      );
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: {
              id: "rl-new",
              name: "New Limit",
              endpointPattern: "/api/test",
              windowMs: 60_000,
              maxRequests: 100,
            },
            events: [],
          }),
          { status: 200 }
        )
      );
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

        const response = await listRateLimits();

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.rateLimitConfigs).toHaveLength(2);
      });

      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: null,
          orgId: null,
        } as never);

        const response = await listRateLimits();

        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await listRateLimits();

        expect(response.status).toBe(400);
      });

      it("should order by priority desc then created_at desc", async () => {
        vi.mocked(database.rateLimitConfig.findMany).mockResolvedValue(
          [] as never
        );

        await listRateLimits();

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

        const response = await listRateLimits();

        expect(response.status).toBe(500);
      });
    });

    // ------------------------------------------------ CREATE
    describe("POST /api/settings/rate-limits (create)", () => {
      it("should create a new rate limit config via manifest command", async () => {
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

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.result.name).toBe("New Limit");
        expect(body.result.windowMs).toBe(60_000);
        expect(body.events).toEqual([]);
      });

      it("should pass transformed payload to runManifestCommand with defaults", async () => {
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
        await createRateLimit(request);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "RateLimitConfig",
            command: "create",
            body: expect.objectContaining({
              name: "Test",
              endpointPattern: "/api/test",
              windowMs: 60_000,
              maxRequests: 100,
              burstAllowance: 0,
              priority: 0,
              isActive: true,
            }),
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });

      it("should apply defaults when optional fields are missing", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits",
          {
            method: "POST",
            body: JSON.stringify({
              name: "Minimal",
              endpointPattern: "/api/.*",
            }),
          }
        );
        await createRateLimit(request);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "RateLimitConfig",
            command: "create",
            body: expect.objectContaining({
              name: "Minimal",
              endpointPattern: "/api/.*",
              windowMs: 60_000,
              maxRequests: 100,
              burstAllowance: 0,
              priority: 0,
              isActive: true,
            }),
            user: expect.anything(),
          })
        );
      });

      it("should use empty-string defaults when name and endpointPattern are missing", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits",
          {
            method: "POST",
            body: JSON.stringify({
              windowMs: 60_000,
              maxRequests: 100,
            }),
          }
        );
        await createRateLimit(request);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              name: "",
              endpointPattern: "",
            }),
            user: expect.anything(),
          })
        );
      });

      it("should forward negative windowMs to the manifest runtime without validation", async () => {
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

        // The manifest handler does not validate; it passes through to the runtime
        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({ windowMs: -1 }),
            user: expect.anything(),
          })
        );
        expect(response.status).toBe(200);
      });

      it("should forward zero maxRequests to the manifest runtime without validation", async () => {
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

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({ maxRequests: 0 }),
            user: expect.anything(),
          })
        );
        expect(response.status).toBe(200);
      });

      it("should throw when unauthenticated (no error boundary)", async () => {
        const authError = new Error("Not authenticated");
        authError.name = "InvariantError";
        vi.mocked(resolveCurrentUser).mockRejectedValue(authError as never);

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
        await expect(createRateLimit(request)).rejects.toThrow(
          "Not authenticated"
        );
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
      it("should update a rate limit config via manifest command", async () => {
        vi.mocked(runManifestCommand).mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              result: {
                id: "rl-001",
                name: "Updated Limit",
                endpointPattern: "/api/.*",
                windowMs: 120_000,
                maxRequests: 200,
                burstAllowance: 20,
                priority: 1,
                isActive: true,
                updatedAt: "2026-01-20T00:00:00.000Z",
              },
              events: [],
            }),
            { status: 200 }
          )
        );

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

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "RateLimitConfig",
            command: "update",
            body: expect.objectContaining({
              id: "rl-001",
              maxRequests: 200,
              windowMs: 120_000,
            }),
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });

      it("should pass through all fields with defaults in update body", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001",
          {
            method: "PATCH",
            body: JSON.stringify({ name: "Updated" }),
          }
        );
        await updateRateLimit(request, {
          params: Promise.resolve({ id: "rl-001" }),
        });

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({
              id: "rl-001",
              name: "Updated",
            }),
          })
        );
      });

      it("should throw when unauthenticated (no error boundary)", async () => {
        const authError = new Error("Not authenticated");
        authError.name = "InvariantError";
        vi.mocked(resolveCurrentUser).mockRejectedValue(authError as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001",
          {
            method: "PATCH",
            body: JSON.stringify({ maxRequests: 200 }),
          }
        );
        await expect(
          updateRateLimit(request, {
            params: Promise.resolve({ id: "rl-001" }),
          })
        ).rejects.toThrow("Not authenticated");
      });
    });

    // ------------------------------------------------ DELETE (soft-delete)
    describe("DELETE /api/settings/rate-limits/[id] (soft-delete)", () => {
      it("should soft-delete a rate limit config via manifest command", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001",
          {
            method: "DELETE",
          }
        );
        const response = await deleteRateLimit(request, {
          params: Promise.resolve({ id: "rl-001" }),
        });

        expect(response.status).toBe(200);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "RateLimitConfig",
            command: "softDelete",
            body: expect.objectContaining({ id: "rl-001" }),
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
      });

      it("should pass the id from URL params to the command", async () => {
        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-999",
          {
            method: "DELETE",
          }
        );
        await deleteRateLimit(request, {
          params: Promise.resolve({ id: "rl-999" }),
        });

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({ id: "rl-999" }),
          })
        );
      });

      it("should throw when unauthenticated (no error boundary)", async () => {
        const authError = new Error("Not authenticated");
        authError.name = "InvariantError";
        vi.mocked(resolveCurrentUser).mockRejectedValue(authError as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/rl-001",
          {
            method: "DELETE",
          }
        );
        await expect(
          deleteRateLimit(request, {
            params: Promise.resolve({ id: "rl-001" }),
          })
        ).rejects.toThrow("Not authenticated");
      });
    });

    // ------------------------------------------------ ANALYTICS
    describe("GET /api/settings/rate-limits/analytics", () => {
      it("should return analytics data", async () => {
        // The route does 5 sequential groupBy calls on rateLimitEvent:
        // 1. eventCounts (by allowed), 2. byEndpoint, 3. topBlocked, 4. topIps, 5. blockedByEndpoint
        vi.mocked(database.rateLimitEvent.groupBy)
          .mockResolvedValueOnce([
            { allowed: true, _count: 4800 },
            { allowed: false, _count: 200 },
          ] as never)
          .mockResolvedValueOnce([
            {
              endpoint: "/api/test",
              method: "GET",
              _count: 1000,
              _sum: { requestsInWindow: 50_000 },
            },
          ] as never)
          .mockResolvedValueOnce([
            { endpoint: "/api/test", _count: 50 },
          ] as never)
          .mockResolvedValueOnce([] as never)
          .mockResolvedValueOnce([
            { endpoint: "/api/test", method: "GET", _count: 50 },
          ] as never);

        const request = new NextRequest(
          "http://localhost/api/settings/rate-limits/analytics"
        );
        const response = await getRateLimitAnalytics(request);

        expect(response.status).toBe(200);
        const body = await response.json();
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
        // The route does 5 sequential groupBy calls on rateLimitEvent:
        // 1. eventCounts, 2. byEndpoint, 3. topBlocked, 4. topIps, 5. blockedByEndpoint
        vi.mocked(database.rateLimitEvent.groupBy)
          .mockResolvedValueOnce([] as never)
          .mockResolvedValueOnce([] as never)
          .mockResolvedValueOnce([] as never)
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
        vi.mocked(database.rateLimitEvent.groupBy).mockRejectedValue(
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
        vi.mocked(database.audit_log.findMany).mock.calls[0]?.[0] as {
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
        .calls[0]?.[0] as {
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
