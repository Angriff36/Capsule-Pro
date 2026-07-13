/**
 * GET /api/analytics/events/advanced — #16 dedupe guard.
 *
 * The route previously defined a LOCAL getTenantIdForOrg (findFirst +
 * conditional account.create, NO cache, write-on-read on every GET). It now
 * imports the shared cached resolver from @/app/lib/tenant (the 30s-TTL cache
 * shipped in #2). These tests pin that the local account-provisioning code is
 * gone (no account.findFirst/create) and the shared resolver is used with the
 * authenticated orgId, plus the tenantId is threaded into the OLAP reads.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/database", () => {
  const account = {
    findFirst: vi.fn(),
    create: vi.fn(),
  };
  // `database` exposes `account` only so the dedupe guard can assert the local
  // provisioning code path is gone (the route no longer references it).
  const analyticsDatabase = {
    $queryRawUnsafe: vi.fn(),
    account,
  };
  return { database: analyticsDatabase, analyticsDatabase };
});

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { analyticsDatabase } = await import("@repo/database");

// --- Route import (after mocks are registered) ---

import { GET as getAdvanced } from "@/app/api/analytics/events/advanced/route";

// --- Constants ---

const TENANT_ID = "00000000-0000-0000-0000-0000000000a1";
const ORG_ID = "org_advanced_test";

// --- Helpers ---

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: ORG_ID, userId: "u1" } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID);
}

function makeRequest(query = ""): Request {
  return new Request(
    new URL(`/api/analytics/events/advanced${query}`, "http://localhost:3000")
  );
}

/** Discriminating $queryRawUnsafe mock: routes the call by the table in the SQL. */
function mockRawByTable() {
  vi.mocked(analyticsDatabase.$queryRawUnsafe).mockImplementation(((
    sql: string
  ) => {
    if (sql.includes("FROM tenant_events.events")) {
      return Promise.resolve([
        {
          id: "e1",
          event_type: "wedding",
          event_date: new Date("2026-06-15T00:00:00Z"),
          guest_count: 100,
          title: "June Wedding",
          client_id: "c1",
          venue_id: null,
          venue_name: "Main Hall",
          location_id: null,
        },
      ]);
    }
    if (sql.includes("FROM tenant_events.event_profitability")) {
      return Promise.resolve([
        {
          event_id: "e1",
          actual_revenue: "1000",
          actual_gross_margin: "200",
          actual_gross_margin_pct: "20",
          calculated_at: new Date("2026-06-16T00:00:00Z"),
        },
      ]);
    }
    if (sql.includes("FROM tenant_crm.clients")) {
      return Promise.resolve([
        { id: "c1", company_name: "Acme", first_name: null, last_name: null },
      ]);
    }
    if (sql.includes("FROM tenant_kitchen.dishes")) {
      return Promise.resolve([
        {
          dish_id: "d1",
          dish_name: "Pasta",
          category: "main",
          menu_count: BigInt(2),
          avg_price: "10",
        },
      ]);
    }
    return Promise.resolve([]);
  }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  makeAuthed();
  mockRawByTable();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Tests ---

describe("GET /api/analytics/events/advanced — #16 shared-resolver dedupe", () => {
  it("resolves the tenant via the shared cached resolver, never local account provisioning", async () => {
    const res = await getAdvanced(makeRequest());
    expect(res.status).toBe(200);

    // The shared resolver is used with the authenticated orgId.
    expect(getTenantIdForOrg).toHaveBeenCalledTimes(1);
    expect(getTenantIdForOrg).toHaveBeenCalledWith(ORG_ID);

    // The local firstFirst-then-create provisioning code is GONE — neither the
    // read replica nor the primary account model is touched by this route.
    expect(analyticsDatabase.account.findFirst).not.toHaveBeenCalled();
    expect(analyticsDatabase.account.create).not.toHaveBeenCalled();
  });

  it("threads the resolved tenantId into every OLAP read", async () => {
    const res = await getAdvanced(makeRequest("?period=6m"));
    expect(res.status).toBe(200);

    // Every $queryRawUnsafe call binds the tenantId as its first parameter.
    for (const call of vi.mocked(analyticsDatabase.$queryRawUnsafe).mock
      .calls) {
      expect(call[1]).toBe(TENANT_ID);
    }
    // 3 distinct reads fire for a client-bearing event: events, profitability,
    // clients; plus the always-on top-dishes read = 4.
    expect(
      vi.mocked(analyticsDatabase.$queryRawUnsafe).mock.calls
    ).toHaveLength(4);
  });

  it("returns the mapped advanced-analytics response shape", async () => {
    const res = await getAdvanced(makeRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.summary.totalEvents).toBe(1);
    expect(body.summary.totalRevenue).toBe(1000);
    expect(body.eventTypeAnalysis[0].eventType).toBe("wedding");
    expect(body.topMenuItems[0].dishName).toBe("Pasta");
    expect(body.clientPreferences[0].clientName).toBe("Acme");
  });

  it("returns 401 before any DB read when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({} as never);
    const res = await getAdvanced(makeRequest());
    expect(res.status).toBe(401);
    expect(getTenantIdForOrg).not.toHaveBeenCalled();
    expect(analyticsDatabase.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});
