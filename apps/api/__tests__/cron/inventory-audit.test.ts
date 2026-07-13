/**
 * inventory-audit cron — per-tenant location-lookup N+1 batch-preload guard.
 *
 * The cron previously issued one `location.findFirst` per distinct tenant on
 * every tick — the main path (N tenants with due audit schedules) AND the
 * default-daily fallback (N tenants with active locations). N round-trips that
 * grew with tenant count. It now preloads every tenant's first active location
 * in ONE `location.findMany` and does an in-memory Map lookup. The global
 * `orderBy: { isPrimary: "desc" }` + first-seen-wins-per-tenant preserves the
 * exact prior `findFirst` semantics ("most-primary active, non-deleted
 * location"). These tests pin that collapse, the per-tenant primary selection,
 * the fallback path, and the auth short-circuits.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuditScheduleFindMany = vi.fn();
const mockLocationFindMany = vi.fn();
const mockLocationFindFirst = vi.fn(); // regression guard — must NEVER fire
const mockLocationGroupBy = vi.fn();
const mockCycleCountSessionFindFirst = vi.fn();

vi.mock("@repo/database", () => ({
  database: {
    auditSchedule: {
      findMany: (...args: unknown[]) => mockAuditScheduleFindMany(...args),
    },
    location: {
      findMany: (...args: unknown[]) => mockLocationFindMany(...args),
      findFirst: (...args: unknown[]) => mockLocationFindFirst(...args),
      groupBy: (...args: unknown[]) => mockLocationGroupBy(...args),
    },
    cycleCountSession: {
      findFirst: (...args: unknown[]) =>
        mockCycleCountSessionFindFirst(...args),
    },
  },
}));

vi.mock("@/lib/system-user", () => ({
  getSystemUserId: vi.fn().mockResolvedValue("system-user-id"),
}));

vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn().mockResolvedValue({ ok: true }),
}));

// createManifestRuntime is only referenced inside the runManifestCommandCore
// callback, which is fully mocked above — stub the import so the test never
// touches the real manifest runtime.
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { GET } = await import("@/app/api/cron/inventory-audit/route");
const { runManifestCommandCore } = await import(
  "@repo/manifest-runtime/run-manifest-command-core"
);

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const TENANT_A = "00000000-0000-0000-0000-0000000000a1";
const TENANT_B = "00000000-0000-0000-0000-0000000000b2";
const TENANT_C = "00000000-0000-0000-0000-0000000000c3";

function authedRequest() {
  return new Request("http://test/api/cron/inventory-audit", {
    headers: { authorization: "Bearer test-secret" },
  });
}

/** An active audit schedule row (frequency "daily" always satisfies shouldRunToday). */
function schedule(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sch-1",
    tenantId: TENANT_A,
    name: "Daily Audit",
    frequency: "daily",
    dayOfWeek: null,
    dayOfMonth: null,
    isActive: true,
    deletedAt: null,
    ...overrides,
  };
}

/** A location row in the batched findMany projection ({id, name, tenantId}). */
function location(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "loc-1",
    name: "Main Kitchen",
    tenantId: TENANT_A,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

// ---------------------------------------------------------------------------

describe("GET /api/cron/inventory-audit — per-tenant location preload", () => {
  it("preloads every tenant's location in ONE findMany and never calls findFirst", async () => {
    // 3 distinct tenants, each with one due schedule → a reverted-to-serial
    // impl would fire 3 location.findFirst; the preload fires 1 findMany.
    mockAuditScheduleFindMany.mockResolvedValue([
      schedule({ id: "sch-a", tenantId: TENANT_A }),
      schedule({ id: "sch-b", tenantId: TENANT_B }),
      schedule({ id: "sch-c", tenantId: TENANT_C }),
    ]);
    mockLocationFindMany.mockResolvedValue([
      location({ id: "loc-a", tenantId: TENANT_A }),
      location({ id: "loc-b", tenantId: TENANT_B }),
      location({ id: "loc-c", tenantId: TENANT_C }),
    ]);

    const res = await GET(authedRequest());
    const json = await res.json();

    // Regression guard: N+1 collapsed regardless of tenant count.
    expect(mockLocationFindMany).toHaveBeenCalledTimes(1);
    expect(mockLocationFindFirst).not.toHaveBeenCalled();
    // The preload is scoped to the distinct tenant ids, with the same
    // isActive/deletedAt filters + isPrimary ordering as the old findFirst.
    expect(mockLocationFindMany).toHaveBeenCalledWith({
      where: {
        tenantId: { in: [TENANT_A, TENANT_B, TENANT_C] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, name: true, tenantId: true },
      orderBy: { isPrimary: "desc" },
    });

    // Behavior parity: one governed session per schedule across all 3 tenants.
    expect(runManifestCommandCore).toHaveBeenCalledTimes(3);
    expect(json).toMatchObject({
      sessionsCreated: 3,
      tenantsProcessed: 3,
      schedulesChecked: 3,
      schedulesRun: 3,
    });
  });

  it("keeps each tenant's PRIMARY location (first-seen-wins under isPrimary desc)", async () => {
    // Tenant A has a primary + a non-primary location. The global isPrimary
    // "desc" ordering yields primary first (simulated by the mock return
    // order), so the Map must keep the primary id — matching the prior
    // per-tenant findFirst({ orderBy: { isPrimary: "desc" } }).
    mockAuditScheduleFindMany.mockResolvedValue([
      schedule({ id: "sch-a", tenantId: TENANT_A }),
    ]);
    mockLocationFindMany.mockResolvedValue([
      location({ id: "loc-a-primary", tenantId: TENANT_A }),
      location({ id: "loc-a-other", tenantId: TENANT_A }),
    ]);

    await GET(authedRequest());

    expect(runManifestCommandCore).toHaveBeenCalledTimes(1);
    expect(runManifestCommandCore).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.objectContaining({ locationId: "loc-a-primary" }),
      })
    );
  });

  it("skips a tenant that has no active location in the preload", async () => {
    // Tenant A has a location; Tenant B does not → B is skipped (no session).
    mockAuditScheduleFindMany.mockResolvedValue([
      schedule({ id: "sch-a", tenantId: TENANT_A }),
      schedule({ id: "sch-b", tenantId: TENANT_B }),
    ]);
    mockLocationFindMany.mockResolvedValue([
      location({ id: "loc-a", tenantId: TENANT_A }),
      // no row for TENANT_B
    ]);

    const res = await GET(authedRequest());
    const json = await res.json();

    expect(runManifestCommandCore).toHaveBeenCalledTimes(1);
    expect(json).toMatchObject({ sessionsCreated: 1, tenantsProcessed: 1 });
  });

  it("fallback (default-daily) path also batches the location lookup into one findMany", async () => {
    // No active schedules → createDefaultDailySessions runs. It must preload
    // locations once, not per-tenant. (The pending-session check stays
    // per-tenant — out of this increment's scope.)
    mockAuditScheduleFindMany.mockResolvedValue([]);
    mockLocationGroupBy.mockResolvedValue([
      { tenantId: TENANT_A },
      { tenantId: TENANT_B },
    ]);
    mockCycleCountSessionFindFirst.mockResolvedValue(null); // no pending sessions
    mockLocationFindMany.mockResolvedValue([
      location({ id: "loc-a", tenantId: TENANT_A }),
      location({ id: "loc-b", tenantId: TENANT_B }),
    ]);

    const res = await GET(authedRequest());
    const json = await res.json();

    expect(mockLocationFindMany).toHaveBeenCalledTimes(1);
    expect(mockLocationFindFirst).not.toHaveBeenCalled();
    expect(runManifestCommandCore).toHaveBeenCalledTimes(2);
    expect(json).toMatchObject({
      sessionsCreated: 2,
      tenantsProcessed: 2,
      mode: "default_daily",
    });
  });

  it("rejects with 401 when the bearer secret is wrong", async () => {
    const req = new Request("http://test/api/cron/inventory-audit", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(mockAuditScheduleFindMany).not.toHaveBeenCalled();
  });

  it("rejects with 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(new Request("http://test/api/cron/inventory-audit"));

    expect(res.status).toBe(503);
    expect(mockAuditScheduleFindMany).not.toHaveBeenCalled();
  });
});
