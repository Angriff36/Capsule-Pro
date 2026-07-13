/**
 * GET /api/analytics/consolidated — per-location waste + staffing N+1 guard.
 *
 * Regression guard for the GROUP BY collapse: the route previously fired one
 * `wasteEntry.aggregate` and one `employeeLocation.count` PER location. It now
 * issues a single `GROUP BY location_id` $queryRaw per metric. These tests pin
 * that the per-row calls are gone and the per-location results (incl. zero-fill
 * for locations with no data) are preserved.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/database", () => {
  const analyticsDatabase = {
    $queryRaw: vi.fn(),
    location: { findMany: vi.fn() },
    inventoryItem: { aggregate: vi.fn() },
    inventoryTransfer: { groupBy: vi.fn() },
    recipe: { count: vi.fn() },
    // Present only so the regression guard can assert these are NEVER called
    // (the prior per-location N+1 path). After the GROUP BY collapse the GET
    // handler no longer touches them.
    wasteEntry: { aggregate: vi.fn() },
    employeeLocation: { count: vi.fn() },
  };
  return { database: analyticsDatabase, analyticsDatabase };
});

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { analyticsDatabase } = await import("@repo/database");

// --- Route import (after mocks are registered) ---

import { GET as getConsolidated } from "@/app/api/analytics/consolidated/route";

// --- Constants ---

const TENANT_ID = "00000000-0000-0000-0000-000000000050";
const ORG_ID = "org_consolidated_test";

// --- Helpers ---

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: ORG_ID, userId: "u1" } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID);
}

function makeRequest(query = ""): Request {
  return new Request(
    new URL(`/api/analytics/consolidated${query}`, "http://localhost:3000")
  );
}

/** Discriminating $queryRaw mock: routes the call by the table in the SQL. */
function mockQueryRawByTable() {
  vi.mocked(analyticsDatabase.$queryRaw).mockImplementation(((
    strings: readonly string[]
  ) => {
    const sql = strings.join("?");
    if (sql.includes("tenant_kitchen.waste_entries")) {
      return Promise.resolve([
        { location_id: "loc-1", entry_count: BigInt(3), total_cost: "150.50" },
      ]);
    }
    if (sql.includes("tenant_staff.employee_locations")) {
      return Promise.resolve([
        { location_id: "loc-2", employee_count: BigInt(5) },
      ]);
    }
    // tenant_inventory.inventory_items per-location loop (out of scope; NEEDS-DESIGN).
    return Promise.resolve([
      {
        total_items: BigInt(10),
        total_value: "200.00",
        low_stock_count: BigInt(1),
      },
    ]);
  }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  makeAuthed();
  mockQueryRawByTable();

  vi.mocked(analyticsDatabase.location.findMany).mockResolvedValue([
    { id: "loc-1", name: "HQ", isPrimary: true },
    { id: "loc-2", name: "Branch", isPrimary: false },
    { id: "loc-3", name: "Empty", isPrimary: false },
  ] as never);
  vi.mocked(analyticsDatabase.inventoryItem.aggregate).mockResolvedValue({
    _count: { id: 10 },
    _sum: { quantityOnHand: 100, unitCost: 50 },
  } as never);
  vi.mocked(analyticsDatabase.inventoryTransfer.groupBy).mockResolvedValue([
    { status: "completed", _count: { id: 2 } },
  ] as never);
  vi.mocked(analyticsDatabase.recipe.count).mockResolvedValue(4 as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Tests ---

describe("GET /api/analytics/consolidated — waste + staffing GROUP BY collapse", () => {
  it("issues one GROUP BY per metric and never the per-location N+1 calls", async () => {
    const res = await getConsolidated(makeRequest());
    expect(res.status).toBe(200);

    // The per-location N+1 calls are gone entirely.
    expect(analyticsDatabase.wasteEntry.aggregate).not.toHaveBeenCalled();
    expect(analyticsDatabase.employeeLocation.count).not.toHaveBeenCalled();

    // Exactly one waste GROUP BY and one staff GROUP BY, regardless of 3 locations.
    const calls = vi.mocked(analyticsDatabase.$queryRaw).mock.calls;
    const wasteGroupCalls = calls.filter((c) =>
      (c[0] as readonly string[])
        .join("?")
        .includes("tenant_kitchen.waste_entries")
    );
    const staffGroupCalls = calls.filter((c) =>
      (c[0] as readonly string[])
        .join("?")
        .includes("tenant_staff.employee_locations")
    );
    expect(wasteGroupCalls).toHaveLength(1);
    expect(staffGroupCalls).toHaveLength(1);
    expect((wasteGroupCalls[0]![0] as readonly string[]).join("?")).toContain(
      "GROUP BY"
    );
    expect((staffGroupCalls[0]![0] as readonly string[]).join("?")).toContain(
      "GROUP BY"
    );
  });

  it("maps per-location waste + staffing values and zero-fills locations with no data", async () => {
    const res = await getConsolidated(makeRequest());
    const body = await res.json();

    // waste row only for loc-1 (3 entries, 150.50); loc-2 + loc-3 zero-filled.
    const waste = body.data.waste.byLocation as Array<{
      locationId: string;
      totalWasteEntries: number;
      totalWasteCost: number;
    }>;
    expect(waste).toEqual([
      {
        locationId: "loc-1",
        locationName: "HQ",
        totalWasteEntries: 3,
        totalWasteCost: 150.5,
      },
      {
        locationId: "loc-2",
        locationName: "Branch",
        totalWasteEntries: 0,
        totalWasteCost: 0,
      },
      {
        locationId: "loc-3",
        locationName: "Empty",
        totalWasteEntries: 0,
        totalWasteCost: 0,
      },
    ]);
    expect(body.data.waste.total).toBe(3);
    expect(body.data.waste.totalCost).toBe(150.5);

    // staff row only for loc-2 (5); loc-1 + loc-3 zero-filled.
    const staffing = body.data.staffing.byLocation as Array<{
      locationId: string;
      activeEmployees: number;
    }>;
    expect(staffing).toEqual([
      { locationId: "loc-1", locationName: "HQ", activeEmployees: 0 },
      { locationId: "loc-2", locationName: "Branch", activeEmployees: 5 },
      { locationId: "loc-3", locationName: "Empty", activeEmployees: 0 },
    ]);
    expect(body.data.staffing.total).toBe(5);
  });

  it("skips the GROUP BY queries when there are no locations", async () => {
    vi.mocked(analyticsDatabase.location.findMany).mockResolvedValue(
      [] as never
    );
    const res = await getConsolidated(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    const calls = vi.mocked(analyticsDatabase.$queryRaw).mock.calls;
    expect(
      calls.filter((c) =>
        (c[0] as readonly string[])
          .join("?")
          .includes("tenant_kitchen.waste_entries")
      )
    ).toHaveLength(0);
    expect(
      calls.filter((c) =>
        (c[0] as readonly string[])
          .join("?")
          .includes("tenant_staff.employee_locations")
      )
    ).toHaveLength(0);
    expect(body.data.waste.byLocation).toEqual([]);
    expect(body.data.staffing.byLocation).toEqual([]);
  });

  it("returns 401 before any DB read when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({} as never);
    const res = await getConsolidated(makeRequest());
    expect(res.status).toBe(401);
    expect(analyticsDatabase.location.findMany).not.toHaveBeenCalled();
    expect(analyticsDatabase.$queryRaw).not.toHaveBeenCalled();
  });

  it("returns 404 when the tenant cannot be resolved", async () => {
    vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
    const res = await getConsolidated(makeRequest());
    expect(res.status).toBe(404);
    expect(analyticsDatabase.location.findMany).not.toHaveBeenCalled();
  });
});
