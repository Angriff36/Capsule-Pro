/**
 * GET /api/analytics/multi-location — per-location metric N+1 guard.
 *
 * Regression guard for the GROUP BY collapse: the route previously fired one
 * `$queryRaw` (and one `employeeLocation.count`) PER location across 12 metric
 * buckets = 1 + 12×N round-trips per dashboard load. It now issues ONE
 * `GROUP BY location_id` query per metric (11 total; the dead `_previousLabor`
 * bucket was dropped), independent of the location count. These tests pin that
 * the per-location fan-out is gone and the per-location results (incl.
 * zero-fill for locations with no data) are preserved.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

// `Prisma.sql` (tagged template) + `Prisma.join` are stubbed so the route's raw
// SQL builds an inspectable `{ sql, values }` object — the `$queryRaw` mock
// discriminates by the table/column text in `.sql`.
vi.mock("@repo/database", () => {
  const sql = (strings: readonly string[], ...values: unknown[]) => ({
    sql: strings.join("?"),
    values,
  });
  const join = (arr: unknown[]) => ({ join: arr });
  const analyticsDatabase = {
    $queryRaw: vi.fn(),
    location: { findMany: vi.fn() },
    // Present only so the guard can assert it is NEVER called after the fix
    // (the prior per-location staffing path).
    employeeLocation: { count: vi.fn() },
  };
  return {
    database: analyticsDatabase,
    analyticsDatabase,
    Prisma: { sql, join },
  };
});

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { analyticsDatabase } = await import("@repo/database");

// --- Route import (after mocks are registered) ---

import { GET as getMultiLocation } from "@/app/api/analytics/multi-location/route";

// --- Constants ---

const TENANT_ID = "00000000-0000-0000-0000-000000000060";
const ORG_ID = "org_multi_location_test";

// --- Helpers ---

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: ORG_ID, userId: "u1" } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID);
}

function makeRequest(query = ""): Request {
  return new Request(
    new URL(`/api/analytics/multi-location${query}`, "http://localhost:3000")
  );
}

/** Discriminating $queryRaw mock: routes the call by table/column in the SQL. */
function mockQueryRawByMetric() {
  vi.mocked(analyticsDatabase.$queryRaw).mockImplementation(((arg: {
    sql: string;
  }) => {
    const s = arg.sql;
    // Revenue (current + previous) — catering_orders.
    if (s.includes("catering_orders")) {
      return Promise.resolve([{ location_id: "loc-1", total_revenue: "1000" }]);
    }
    // Labor (current) — event_profitability, budgeted_labor column.
    if (s.includes("budgeted_labor")) {
      return Promise.resolve([
        {
          location_id: "loc-1",
          budgeted_labor: "500",
          actual_labor: "400",
        },
      ]);
    }
    // Current margin — avg_margin AND total_revenue.
    if (s.includes("avg_margin") && s.includes("total_revenue")) {
      return Promise.resolve([
        { location_id: "loc-2", avg_margin: "25", total_revenue: "2000" },
      ]);
    }
    // Previous margin — avg_margin only.
    if (s.includes("avg_margin")) {
      return Promise.resolve([{ location_id: "loc-2", avg_margin: "20" }]);
    }
    // Waste (current + previous) — waste_entries.
    if (s.includes("waste_entries")) {
      return Promise.resolve([{ location_id: "loc-1", waste_cost: "100" }]);
    }
    // Current events — has completed_count.
    if (s.includes("completed_count")) {
      return Promise.resolve([
        {
          location_id: "loc-1",
          event_count: BigInt(5),
          completed_count: BigInt(4),
        },
      ]);
    }
    // Previous events — event_count only.
    if (s.includes("event_count")) {
      return Promise.resolve([
        { location_id: "loc-1", event_count: BigInt(3) },
      ]);
    }
    // Inventory value — inventory_items.
    if (s.includes("inventory_items")) {
      return Promise.resolve([
        {
          location_id: "loc-2",
          inventory_value: "5000",
          item_count: BigInt(10),
        },
      ]);
    }
    // Staffing — employee_locations.
    if (s.includes("employee_locations")) {
      return Promise.resolve([
        { location_id: "loc-1", staff_count: BigInt(7) },
      ]);
    }
    return Promise.resolve([]);
  }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  makeAuthed();
  mockQueryRawByMetric();

  vi.mocked(analyticsDatabase.location.findMany).mockResolvedValue([
    { id: "loc-1", name: "HQ", isPrimary: true, timezone: "UTC" },
    { id: "loc-2", name: "Branch", isPrimary: false, timezone: "UTC" },
    { id: "loc-3", name: "Empty", isPrimary: false, timezone: "UTC" },
  ] as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function kpiValue(
  body: { data: { kpis: Array<{ id: string; value: number }> } },
  id: string
) {
  return body.data.kpis.find((k) => k.id === id)?.value;
}

function comparison(
  body: {
    data: {
      locationComparison: Array<{
        locationId: string;
        metrics: Record<string, number>;
      }>;
    };
  },
  locationId: string
) {
  return body.data.locationComparison.find((l) => l.locationId === locationId)
    ?.metrics;
}

// --- Tests ---

describe("GET /api/analytics/multi-location — GROUP BY collapse", () => {
  it("issues one GROUP BY per metric and never the per-location N+1 calls", async () => {
    const res = await getMultiLocation(makeRequest());
    expect(res.status).toBe(200);

    // The per-location staffing path is gone entirely.
    expect(analyticsDatabase.employeeLocation.count).not.toHaveBeenCalled();

    // Exactly 11 $queryRaw calls (one per metric) regardless of 3 locations —
    // the prior code fired 11×3 = 33 $queryRaw + 3 employeeLocation.count.
    expect(analyticsDatabase.$queryRaw).toHaveBeenCalledTimes(11);

    // Every call is a GROUP BY location_id with a bounded location_id IN list.
    for (const call of vi.mocked(analyticsDatabase.$queryRaw).mock.calls) {
      const sql = (call[0] as { sql: string }).sql;
      expect(sql).toContain("GROUP BY");
      expect(sql).toContain("location_id IN");
    }
  });

  it("maps per-location metrics and zero-fills locations with no data", async () => {
    const res = await getMultiLocation(makeRequest());
    const body = await res.json();

    // Summary totals.
    expect(body.data.summary.totalLocations).toBe(3);
    expect(body.data.summary.totalRevenue).toBe(1000); // only loc-1
    expect(body.data.summary.totalStaff).toBe(7); // only loc-1

    // KPIs derived from the grouped data.
    expect(kpiValue(body, "total-revenue")).toBe(1000);
    expect(kpiValue(body, "labor-utilization")).toBe(80); // 400 / 500 * 100
    expect(kpiValue(body, "waste-cost")).toBe(100); // only loc-1
    expect(kpiValue(body, "profit-margin")).toBe(25); // revenue-weighted: loc-2 only
    expect(kpiValue(body, "inventory-value")).toBe(5000); // only loc-2
    expect(kpiValue(body, "event-completion")).toBeCloseTo(0.8, 5); // 4 / 5

    // loc-1: revenue/labor/waste/events/staffing populated; margin/inventory 0.
    const loc1 = comparison(body, "loc-1")!;
    expect(loc1.revenue).toBe(1000);
    expect(loc1.staffCount).toBe(7);
    expect(loc1.eventCount).toBe(5);
    expect(loc1.completionRate).toBeCloseTo(0.8, 5);
    expect(loc1.margin).toBe(0);
    expect(loc1.inventoryValue).toBe(0);

    // loc-2: margin + inventory populated; revenue/events/staffing 0.
    const loc2 = comparison(body, "loc-2")!;
    expect(loc2.margin).toBe(25);
    expect(loc2.inventoryValue).toBe(5000);
    expect(loc2.revenue).toBe(0);
    expect(loc2.staffCount).toBe(0);

    // loc-3: absent from every result set → all zero.
    const loc3 = comparison(body, "loc-3")!;
    expect(loc3.revenue).toBe(0);
    expect(loc3.staffCount).toBe(0);
    expect(loc3.margin).toBe(0);
  });

  it("skips the metric queries when there are no locations", async () => {
    vi.mocked(analyticsDatabase.location.findMany).mockResolvedValue(
      [] as never
    );
    const res = await getMultiLocation(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(analyticsDatabase.$queryRaw).not.toHaveBeenCalled();
    expect(body.data.locations).toEqual([]);
    expect(body.data.summary.totalLocations).toBe(0);
  });

  it("returns 401 before any DB read when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({} as never);
    const res = await getMultiLocation(makeRequest());
    expect(res.status).toBe(401);
    expect(analyticsDatabase.location.findMany).not.toHaveBeenCalled();
    expect(analyticsDatabase.$queryRaw).not.toHaveBeenCalled();
  });

  it("returns 404 when the tenant cannot be resolved", async () => {
    vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
    const res = await getMultiLocation(makeRequest());
    expect(res.status).toBe(404);
    expect(analyticsDatabase.location.findMany).not.toHaveBeenCalled();
  });
});
