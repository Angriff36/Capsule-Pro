/**
 * Goodshuffle Integration API Tests
 *
 * Covers the 9 route handlers under `/api/integrations/goodshuffle/*`:
 *   - config (GET, POST, DELETE) — credential management with masked secrets
 *   - status (GET) — sync status summary
 *   - test (POST, GET) — credential validation against the upstream API
 *   - sync (POST) — trigger event sync with date-range validation
 *   - events (GET) — list event sync records with status filter + pagination
 *   - inventory (GET) — list inventory sync records
 *   - invoices (GET) — list invoice sync records
 *   - inventory/sync (POST) — trigger inventory sync
 *   - invoices/sync (POST) — trigger invoice sync (optional date range)
 *
 * Why these tests matter:
 *   - The Goodshuffle integration owns the SOURCE-OF-TRUTH credentials for the
 *     tenant's event-rental sync. A regression that leaks `apiSecret` or
 *     `webhookSecret` over the GET endpoint is a real customer-impact security
 *     bug — we assert `apiSecret` is always returned as `"********"` and
 *     `apiKey` is always masked to first-4 + last-4.
 *   - The POST `config` endpoint MUST test the connection BEFORE persisting,
 *     otherwise we save broken creds and silently corrupt every subsequent
 *     scheduled sync. We verify the order: testConnection → upsert.
 *   - Every handler is tenant-scoped (`tenantId` from Clerk org). A missing
 *     tenant must return 401, not 200 with empty/null tenant. We assert that.
 *   - Sync routes accept date-range params; `startDate >= endDate` MUST be
 *     rejected with 400 — otherwise the upstream API returns garbage.
 *   - List routes thread `status`, `limit`, `offset` query params into the
 *     Prisma `where` and pagination clauses. A regression that drops the
 *     status filter ships the wrong records to a "Failed Syncs" UI tab.
 *   - All error paths must call `captureException` so ops can detect upstream
 *     Goodshuffle outages even though the route returns 500.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  // Clerk auth
  authMock: vi.fn(),
  // Tenant resolution
  getTenantIdForOrgMock: vi.fn(),
  // Sentry
  captureExceptionMock: vi.fn(),
  // Goodshuffle client factory
  createGoodshuffleClientMock: vi.fn(),
  // Sync services
  getGoodshuffleSyncStatusMock: vi.fn(),
  runGoodshuffleEventSyncMock: vi.fn(),
  runGoodshuffleInventorySyncMock: vi.fn(),
  runGoodshuffleInvoiceSyncMock: vi.fn(),
  // Prisma model mocks
  configFindUniqueMock: vi.fn(),
  configUpsertMock: vi.fn(),
  configDeleteMock: vi.fn(),
  eventSyncFindManyMock: vi.fn(),
  eventSyncCountMock: vi.fn(),
  inventorySyncFindManyMock: vi.fn(),
  inventorySyncCountMock: vi.fn(),
  invoiceSyncFindManyMock: vi.fn(),
  invoiceSyncCountMock: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
  auth: mocks.authMock,
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.getTenantIdForOrgMock,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureExceptionMock,
}));

vi.mock("@/app/lib/goodshuffle-client", () => ({
  createGoodshuffleClient: mocks.createGoodshuffleClientMock,
}));

vi.mock("@/app/lib/goodshuffle-event-sync-service", () => ({
  getGoodshuffleSyncStatus: mocks.getGoodshuffleSyncStatusMock,
  runGoodshuffleEventSync: mocks.runGoodshuffleEventSyncMock,
}));

vi.mock("@/app/lib/goodshuffle-inventory-sync-service", () => ({
  runGoodshuffleInventorySync: mocks.runGoodshuffleInventorySyncMock,
}));

vi.mock("@/app/lib/goodshuffle-invoice-sync-service", () => ({
  runGoodshuffleInvoiceSync: mocks.runGoodshuffleInvoiceSyncMock,
}));

vi.mock("@repo/database", () => ({
  database: {
    goodshuffleConfig: {
      findUnique: mocks.configFindUniqueMock,
      upsert: mocks.configUpsertMock,
      delete: mocks.configDeleteMock,
    },
    goodshuffleEventSync: {
      findMany: mocks.eventSyncFindManyMock,
      count: mocks.eventSyncCountMock,
    },
    goodshuffleInventorySync: {
      findMany: mocks.inventorySyncFindManyMock,
      count: mocks.inventorySyncCountMock,
    },
    goodshuffleInvoiceSync: {
      findMany: mocks.invoiceSyncFindManyMock,
      count: mocks.invoiceSyncCountMock,
    },
  },
}));

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_ORG_ID = "org_test_001";
const TEST_TENANT_ID = "00000000-0000-4000-a000-000000000001";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authedSession() {
  mocks.authMock.mockResolvedValue({ orgId: TEST_ORG_ID });
  mocks.getTenantIdForOrgMock.mockResolvedValue(TEST_TENANT_ID);
}

function unauthedSession() {
  mocks.authMock.mockResolvedValue({ orgId: null });
}

function noTenantSession() {
  mocks.authMock.mockResolvedValue({ orgId: TEST_ORG_ID });
  mocks.getTenantIdForOrgMock.mockResolvedValue(null);
}

function makeGetRequest(path: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}`), {
    method: "GET",
  });
}

function makePostRequest(path: string, body: unknown): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(path: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}`), {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. config — GET / POST / DELETE
// ---------------------------------------------------------------------------

describe("GET /api/integrations/goodshuffle/config", () => {
  it("returns 401 when unauthenticated", async () => {
    unauthedSession();
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when no tenant resolves for the org", async () => {
    noTenantSession();
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns configured:false when no config row exists", async () => {
    authedSession();
    mocks.configFindUniqueMock.mockResolvedValue(null);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ configured: false, config: null });
  });

  it("masks apiKey to first-4...last-4 and ALWAYS hides apiSecret", async () => {
    authedSession();
    mocks.configFindUniqueMock.mockResolvedValue({
      id: "cfg-1",
      apiKey: "ABCD1234567890WXYZ",
      syncEnabled: true,
      syncDirection: "one_way",
      conflictResolution: "convoy_wins",
      webhookSecret: "wh-secret",
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      autoSyncInterval: 60,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
    });
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.configured).toBe(true);
    expect(body.config.apiKey).toBe("ABCD...WXYZ");
    expect(body.config.apiSecret).toBe("********");
    expect(body.config.webhookSecret).toBe("********");
  });

  it("returns webhookSecret as null when not set (not '********')", async () => {
    authedSession();
    mocks.configFindUniqueMock.mockResolvedValue({
      id: "cfg-2",
      apiKey: "ABCDEFGH",
      syncEnabled: true,
      syncDirection: "one_way",
      conflictResolution: "convoy_wins",
      webhookSecret: null,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      autoSyncInterval: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await GET();
    const body = await res.json();
    expect(body.config.webhookSecret).toBeNull();
  });

  it("masks short apiKey (<= 8 chars) to '****'", async () => {
    authedSession();
    mocks.configFindUniqueMock.mockResolvedValue({
      id: "cfg-3",
      apiKey: "short",
      syncEnabled: true,
      syncDirection: "one_way",
      conflictResolution: "convoy_wins",
      webhookSecret: null,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      autoSyncInterval: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await GET();
    const body = await res.json();
    expect(body.config.apiKey).toBe("****");
  });

  it("returns 500 + reports to Sentry on Prisma failure", async () => {
    authedSession();
    const dbError = new Error("connection refused");
    mocks.configFindUniqueMock.mockRejectedValue(dbError);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await GET();
    expect(res.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(dbError);
  });
});

describe("POST /api/integrations/goodshuffle/config", () => {
  const validBody = {
    apiKey: "key-1234",
    apiSecret: "secret-9876",
    syncEnabled: true,
    syncDirection: "one_way" as const,
    conflictResolution: "convoy_wins" as const,
  };

  it("returns 401 when unauthenticated", async () => {
    unauthedSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/config", validBody)
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when no tenant", async () => {
    noTenantSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/config", validBody)
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when body fails Zod validation", async () => {
    authedSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/config", {
        apiKey: "",
        apiSecret: "",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(Array.isArray(body.details)).toBe(true);
  });

  it("returns 400 when connection test fails (and does NOT upsert)", async () => {
    authedSession();
    mocks.createGoodshuffleClientMock.mockReturnValue({
      testConnection: vi
        .fn()
        .mockResolvedValue({ success: false, message: "401 Unauthorized" }),
    });
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/config", validBody)
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("401 Unauthorized");
    // CRITICAL: bad creds must NEVER persist
    expect(mocks.configUpsertMock).not.toHaveBeenCalled();
  });

  it("upserts config when connection test passes", async () => {
    authedSession();
    mocks.createGoodshuffleClientMock.mockReturnValue({
      testConnection: vi.fn().mockResolvedValue({ success: true }),
    });
    mocks.configUpsertMock.mockResolvedValue({
      id: "cfg-new",
      tenantId: TEST_TENANT_ID,
      apiKey: validBody.apiKey,
      apiSecret: validBody.apiSecret,
      webhookSecret: null,
      syncEnabled: true,
      syncDirection: "one_way",
      conflictResolution: "convoy_wins",
      autoSyncInterval: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/config", validBody)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.config.apiSecret).toBe("********");
    // Connection MUST be tested with creds before upsert
    expect(mocks.createGoodshuffleClientMock).toHaveBeenCalledWith({
      apiKey: validBody.apiKey,
      apiSecret: validBody.apiSecret,
    });
    expect(mocks.configUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TEST_TENANT_ID } })
    );
  });

  it("returns 500 + Sentry when upsert throws", async () => {
    authedSession();
    mocks.createGoodshuffleClientMock.mockReturnValue({
      testConnection: vi.fn().mockResolvedValue({ success: true }),
    });
    const dbError = new Error("unique constraint violation");
    mocks.configUpsertMock.mockRejectedValue(dbError);
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/config", validBody)
    );
    expect(res.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(dbError);
  });
});

describe("DELETE /api/integrations/goodshuffle/config", () => {
  it("returns 401 when unauthenticated", async () => {
    unauthedSession();
    const { DELETE } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it("returns 401 when no tenant", async () => {
    noTenantSession();
    const { DELETE } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await DELETE();
    expect(res.status).toBe(401);
  });

  it("deletes the config row scoped by tenantId", async () => {
    authedSession();
    mocks.configDeleteMock.mockResolvedValue({ id: "cfg-1" });
    const { DELETE } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mocks.configDeleteMock).toHaveBeenCalledWith({
      where: { tenantId: TEST_TENANT_ID },
    });
  });

  it("returns 500 + Sentry when delete throws", async () => {
    authedSession();
    const dbError = new Error("record not found");
    mocks.configDeleteMock.mockRejectedValue(dbError);
    const { DELETE } = await import(
      "@/app/api/integrations/goodshuffle/config/route"
    );
    const res = await DELETE();
    expect(res.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(dbError);
  });
});

// ---------------------------------------------------------------------------
// 2. status — GET
// ---------------------------------------------------------------------------

describe("GET /api/integrations/goodshuffle/status", () => {
  it("returns 401 when unauthenticated", async () => {
    unauthedSession();
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/status/route"
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when no tenant", async () => {
    noTenantSession();
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/status/route"
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the status object from getGoodshuffleSyncStatus", async () => {
    authedSession();
    const status = {
      configured: true,
      lastSyncAt: "2026-04-30T00:00:00.000Z",
      pending: 2,
      failed: 1,
    };
    mocks.getGoodshuffleSyncStatusMock.mockResolvedValue(status);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/status/route"
    );
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(status);
    expect(mocks.getGoodshuffleSyncStatusMock).toHaveBeenCalledWith(
      TEST_TENANT_ID
    );
  });

  it("returns 500 + Sentry when service throws", async () => {
    authedSession();
    const err = new Error("boom");
    mocks.getGoodshuffleSyncStatusMock.mockRejectedValue(err);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/status/route"
    );
    const res = await GET();
    expect(res.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// 3. test — POST (provided creds) / GET (saved creds)
// ---------------------------------------------------------------------------

describe("POST /api/integrations/goodshuffle/test", () => {
  it("returns 401 when unauthenticated", async () => {
    unauthedSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/test/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/test", {
        apiKey: "k",
        apiSecret: "s",
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when no tenant", async () => {
    noTenantSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/test/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/test", {
        apiKey: "k",
        apiSecret: "s",
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when body missing required fields", async () => {
    authedSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/test/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/test", {})
    );
    expect(res.status).toBe(400);
  });

  it("returns the connection-test result from the client", async () => {
    authedSession();
    const expected = { success: true, message: "Connected" };
    mocks.createGoodshuffleClientMock.mockReturnValue({
      testConnection: vi.fn().mockResolvedValue(expected),
    });
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/test/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/test", {
        apiKey: "k",
        apiSecret: "s",
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(expected);
    expect(mocks.createGoodshuffleClientMock).toHaveBeenCalledWith({
      apiKey: "k",
      apiSecret: "s",
    });
  });

  it("returns 500 + Sentry when client.testConnection throws", async () => {
    authedSession();
    const err = new Error("network");
    mocks.createGoodshuffleClientMock.mockReturnValue({
      testConnection: vi.fn().mockRejectedValue(err),
    });
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/test/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/test", {
        apiKey: "k",
        apiSecret: "s",
      })
    );
    expect(res.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(err);
  });
});

describe("GET /api/integrations/goodshuffle/test", () => {
  it("returns 401 when unauthenticated", async () => {
    unauthedSession();
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/test/route"
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when no tenant", async () => {
    noTenantSession();
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/test/route"
    );
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns success:false 'not configured' when no config row exists", async () => {
    authedSession();
    mocks.configFindUniqueMock.mockResolvedValue(null);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/test/route"
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/not configured/i);
    expect(mocks.createGoodshuffleClientMock).not.toHaveBeenCalled();
  });

  it("uses saved creds to test the connection when config exists", async () => {
    authedSession();
    mocks.configFindUniqueMock.mockResolvedValue({
      apiKey: "saved-key",
      apiSecret: "saved-secret",
    });
    const expected = { success: true };
    mocks.createGoodshuffleClientMock.mockReturnValue({
      testConnection: vi.fn().mockResolvedValue(expected),
    });
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/test/route"
    );
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(expected);
    expect(mocks.createGoodshuffleClientMock).toHaveBeenCalledWith({
      apiKey: "saved-key",
      apiSecret: "saved-secret",
    });
  });
});

// ---------------------------------------------------------------------------
// 4. sync — POST (event sync)
// ---------------------------------------------------------------------------

describe("POST /api/integrations/goodshuffle/sync", () => {
  const validBody = {
    startDate: "2026-04-01T00:00:00.000Z",
    endDate: "2026-04-30T00:00:00.000Z",
    dryRun: false,
    direction: "goodshuffle_to_convoy" as const,
  };

  it("returns 401 when unauthenticated", async () => {
    unauthedSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/sync", validBody)
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when no tenant", async () => {
    noTenantSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/sync", validBody)
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when body fails validation", async () => {
    authedSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/sync", { dryRun: false })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when startDate >= endDate", async () => {
    authedSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/sync", {
        ...validBody,
        startDate: "2026-05-01T00:00:00.000Z",
        endDate: "2026-04-01T00:00:00.000Z",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/before end date/i);
    expect(mocks.runGoodshuffleEventSyncMock).not.toHaveBeenCalled();
  });

  it("returns 400 when startDate equals endDate (boundary)", async () => {
    authedSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/sync", {
        ...validBody,
        startDate: "2026-04-01T00:00:00.000Z",
        endDate: "2026-04-01T00:00:00.000Z",
      })
    );
    expect(res.status).toBe(400);
  });

  it("calls runGoodshuffleEventSync with parsed Date objects", async () => {
    authedSession();
    const result = { synced: 5, errors: 0 };
    mocks.runGoodshuffleEventSyncMock.mockResolvedValue(result);
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/sync", validBody)
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(result);
    expect(mocks.runGoodshuffleEventSyncMock).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      expect.objectContaining({
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2026-04-30T00:00:00.000Z"),
        dryRun: false,
        direction: "goodshuffle_to_convoy",
      })
    );
  });

  it("returns 500 + Sentry when sync service throws", async () => {
    authedSession();
    const err = new Error("upstream timeout");
    mocks.runGoodshuffleEventSyncMock.mockRejectedValue(err);
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/sync", validBody)
    );
    expect(res.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// 5. events — GET (list event syncs)
// ---------------------------------------------------------------------------

describe("GET /api/integrations/goodshuffle/events", () => {
  it("returns 401 when unauthenticated", async () => {
    unauthedSession();
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/events/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/events")
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when no tenant", async () => {
    noTenantSession();
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/events/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/events")
    );
    expect(res.status).toBe(401);
  });

  it("scopes findMany by tenantId with default pagination (50/0)", async () => {
    authedSession();
    mocks.eventSyncFindManyMock.mockResolvedValue([]);
    mocks.eventSyncCountMock.mockResolvedValue(0);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/events/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/events")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ syncs: [], total: 0, limit: 50, offset: 0 });
    expect(mocks.eventSyncFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TEST_TENANT_ID },
        orderBy: { updatedAt: "desc" },
        take: 50,
        skip: 0,
      })
    );
  });

  it("threads status filter into where clause", async () => {
    authedSession();
    mocks.eventSyncFindManyMock.mockResolvedValue([]);
    mocks.eventSyncCountMock.mockResolvedValue(0);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/events/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/events?status=failed")
    );
    expect(res.status).toBe(200);
    expect(mocks.eventSyncFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TEST_TENANT_ID, status: "failed" },
      })
    );
    expect(mocks.eventSyncCountMock).toHaveBeenCalledWith({
      where: { tenantId: TEST_TENANT_ID, status: "failed" },
    });
  });

  it("threads custom limit/offset query params", async () => {
    authedSession();
    mocks.eventSyncFindManyMock.mockResolvedValue([]);
    mocks.eventSyncCountMock.mockResolvedValue(100);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/events/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/events?limit=10&offset=20")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.limit).toBe(10);
    expect(body.offset).toBe(20);
    expect(mocks.eventSyncFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 })
    );
  });

  it("returns 500 + Sentry when Prisma throws", async () => {
    authedSession();
    const err = new Error("query failed");
    mocks.eventSyncFindManyMock.mockRejectedValue(err);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/events/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/events")
    );
    expect(res.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// 6. inventory — GET (list inventory syncs)
// ---------------------------------------------------------------------------

describe("GET /api/integrations/goodshuffle/inventory", () => {
  it("returns 401 when unauthenticated", async () => {
    unauthedSession();
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/inventory/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/inventory")
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when no tenant", async () => {
    noTenantSession();
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/inventory/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/inventory")
    );
    expect(res.status).toBe(401);
  });

  it("returns inventory syncs scoped by tenant", async () => {
    authedSession();
    const records = [
      { id: "is-1", status: "success", externalId: "ext-1" },
      { id: "is-2", status: "failed", externalId: "ext-2" },
    ];
    mocks.inventorySyncFindManyMock.mockResolvedValue(records);
    mocks.inventorySyncCountMock.mockResolvedValue(2);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/inventory/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/inventory")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.syncs).toEqual(records);
    expect(body.total).toBe(2);
    expect(mocks.inventorySyncFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TEST_TENANT_ID } })
    );
  });

  it("threads status filter", async () => {
    authedSession();
    mocks.inventorySyncFindManyMock.mockResolvedValue([]);
    mocks.inventorySyncCountMock.mockResolvedValue(0);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/inventory/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/inventory?status=pending")
    );
    expect(res.status).toBe(200);
    expect(mocks.inventorySyncFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TEST_TENANT_ID, status: "pending" },
      })
    );
  });

  it("returns 500 + Sentry when Prisma throws", async () => {
    authedSession();
    const err = new Error("db down");
    mocks.inventorySyncFindManyMock.mockRejectedValue(err);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/inventory/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/inventory")
    );
    expect(res.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// 7. invoices — GET (list invoice syncs)
// ---------------------------------------------------------------------------

describe("GET /api/integrations/goodshuffle/invoices", () => {
  it("returns 401 when unauthenticated", async () => {
    unauthedSession();
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/invoices/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/invoices")
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when no tenant", async () => {
    noTenantSession();
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/invoices/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/invoices")
    );
    expect(res.status).toBe(401);
  });

  it("returns invoice syncs with default pagination", async () => {
    authedSession();
    mocks.invoiceSyncFindManyMock.mockResolvedValue([]);
    mocks.invoiceSyncCountMock.mockResolvedValue(0);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/invoices/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/invoices")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ syncs: [], total: 0, limit: 50, offset: 0 });
  });

  it("threads status filter and pagination", async () => {
    authedSession();
    mocks.invoiceSyncFindManyMock.mockResolvedValue([]);
    mocks.invoiceSyncCountMock.mockResolvedValue(0);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/invoices/route"
    );
    const res = await GET(
      makeGetRequest(
        "/api/integrations/goodshuffle/invoices?status=success&limit=5&offset=10"
      )
    );
    expect(res.status).toBe(200);
    expect(mocks.invoiceSyncFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TEST_TENANT_ID, status: "success" },
        take: 5,
        skip: 10,
      })
    );
  });

  it("returns 500 + Sentry when Prisma throws", async () => {
    authedSession();
    const err = new Error("kaboom");
    mocks.invoiceSyncFindManyMock.mockRejectedValue(err);
    const { GET } = await import(
      "@/app/api/integrations/goodshuffle/invoices/route"
    );
    const res = await GET(
      makeGetRequest("/api/integrations/goodshuffle/invoices")
    );
    expect(res.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// 8. inventory/sync — POST (trigger inventory sync)
// ---------------------------------------------------------------------------

describe("POST /api/integrations/goodshuffle/inventory/sync", () => {
  it("returns 401 when unauthenticated", async () => {
    unauthedSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/inventory/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/inventory/sync", {})
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when no tenant", async () => {
    noTenantSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/inventory/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/inventory/sync", {})
    );
    expect(res.status).toBe(401);
  });

  it("accepts empty body and applies schema defaults (dryRun=false, direction=goodshuffle_to_convoy)", async () => {
    authedSession();
    mocks.runGoodshuffleInventorySyncMock.mockResolvedValue({ synced: 0 });
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/inventory/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/inventory/sync", {})
    );
    expect(res.status).toBe(200);
    expect(mocks.runGoodshuffleInventorySyncMock).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      { dryRun: false, direction: "goodshuffle_to_convoy" }
    );
  });

  it("returns 400 when direction is invalid", async () => {
    authedSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/inventory/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/inventory/sync", {
        direction: "invalid",
      })
    );
    expect(res.status).toBe(400);
    expect(mocks.runGoodshuffleInventorySyncMock).not.toHaveBeenCalled();
  });

  it("forwards dryRun=true and custom direction", async () => {
    authedSession();
    mocks.runGoodshuffleInventorySyncMock.mockResolvedValue({ synced: 3 });
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/inventory/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/inventory/sync", {
        dryRun: true,
        direction: "both",
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.runGoodshuffleInventorySyncMock).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      { dryRun: true, direction: "both" }
    );
  });

  it("returns 500 + Sentry when service throws", async () => {
    authedSession();
    const err = new Error("inventory upstream 503");
    mocks.runGoodshuffleInventorySyncMock.mockRejectedValue(err);
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/inventory/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/inventory/sync", {})
    );
    expect(res.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(err);
  });
});

// ---------------------------------------------------------------------------
// 9. invoices/sync — POST (trigger invoice sync, optional date range)
// ---------------------------------------------------------------------------

describe("POST /api/integrations/goodshuffle/invoices/sync", () => {
  it("returns 401 when unauthenticated", async () => {
    unauthedSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/invoices/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/invoices/sync", {})
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when no tenant", async () => {
    noTenantSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/invoices/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/invoices/sync", {})
    );
    expect(res.status).toBe(401);
  });

  it("accepts empty body (date range optional)", async () => {
    authedSession();
    mocks.runGoodshuffleInvoiceSyncMock.mockResolvedValue({ synced: 0 });
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/invoices/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/invoices/sync", {})
    );
    expect(res.status).toBe(200);
    expect(mocks.runGoodshuffleInvoiceSyncMock).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      expect.objectContaining({
        dryRun: false,
        direction: "goodshuffle_to_convoy",
      })
    );
  });

  it("returns 400 when only startDate >= endDate (both provided)", async () => {
    authedSession();
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/invoices/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/invoices/sync", {
        startDate: "2026-05-01T00:00:00.000Z",
        endDate: "2026-04-01T00:00:00.000Z",
      })
    );
    expect(res.status).toBe(400);
    expect(mocks.runGoodshuffleInvoiceSyncMock).not.toHaveBeenCalled();
  });

  it("does NOT enforce date order if only startDate is provided", async () => {
    authedSession();
    mocks.runGoodshuffleInvoiceSyncMock.mockResolvedValue({ synced: 1 });
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/invoices/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/invoices/sync", {
        startDate: "2026-04-01T00:00:00.000Z",
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.runGoodshuffleInvoiceSyncMock).toHaveBeenCalled();
  });

  it("forwards parsed dates and options to runGoodshuffleInvoiceSync", async () => {
    authedSession();
    mocks.runGoodshuffleInvoiceSyncMock.mockResolvedValue({ synced: 7 });
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/invoices/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/invoices/sync", {
        startDate: "2026-04-01T00:00:00.000Z",
        endDate: "2026-04-30T00:00:00.000Z",
        dryRun: true,
        direction: "convoy_to_goodshuffle",
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.runGoodshuffleInvoiceSyncMock).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      {
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2026-04-30T00:00:00.000Z"),
        dryRun: true,
        direction: "convoy_to_goodshuffle",
      }
    );
  });

  it("returns 500 + Sentry when service throws", async () => {
    authedSession();
    const err = new Error("invoice upstream timeout");
    mocks.runGoodshuffleInvoiceSyncMock.mockRejectedValue(err);
    const { POST } = await import(
      "@/app/api/integrations/goodshuffle/invoices/sync/route"
    );
    const res = await POST(
      makePostRequest("/api/integrations/goodshuffle/invoices/sync", {})
    );
    expect(res.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledWith(err);
  });
});

// Reference makeDeleteRequest so unused-helper lint doesn't flag the export
void makeDeleteRequest;
