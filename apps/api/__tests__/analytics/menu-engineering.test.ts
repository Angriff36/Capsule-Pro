/**
 * Menu-engineering GET — regression guard for the raw-SQL parameterization
 * refactor (DB-perf #26).
 *
 * Before the refactor, `fetchMenuItemAnalysis` built a SQL *fragment*
 * (`"AND e.location_id = $3::uuid"` or `""`) and string-interpolated it into a
 * `$queryRawUnsafe` call with manually-numbered `$1/$2/$3` placeholders. Now it
 * uses a tagged-template `$queryRaw` where every value is a self-binding
 * parameter and the optional location filter is a static `(${locationId}::uuid
 * IS NULL OR e.location_id = ${locationId}::uuid)` clause — no SQL fragment is
 * ever interpolated into the query text. These tests pin the response shape and
 * guard the parameterization (the literal `locationId` must be a bound value,
 * never SQL text; the mock exposes `$queryRaw` only, so a revert to
 * `$queryRawUnsafe` throws).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock exposes $queryRaw ONLY — a regression to $queryRawUnsafe would throw
// `analyticsDatabase.$queryRawUnsafe is not a function`.
vi.mock("@repo/database", () => {
  const analyticsDatabase = { $queryRaw: vi.fn() };
  return { analyticsDatabase, database: analyticsDatabase };
});

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { analyticsDatabase } = await import("@repo/database");

import { GET as getMenuEngineering } from "@/app/api/analytics/menu-engineering/route";

const ME_TENANT_ID = "00000000-0000-0000-0000-000000000060";
const ME_ORG_ID = "org_menu_engineering";
const ME_LOCATION_ID = "11111111-2222-3333-4444-555555555555";

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: ME_ORG_ID } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(ME_TENANT_ID);
}

function makeRequest(query = ""): Request {
  return new Request(
    new URL(`/api/analytics/menu-engineering${query}`, "http://localhost:3000")
  );
}

function menuItemRow(overrides: Partial<Record<string, string>> = {}) {
  return {
    dish_id: "d-1",
    dish_name: "Margherita Pizza",
    category: "Mains",
    price_per_person: "10.00",
    cost_per_person: "4.00",
    total_orders: "5",
    total_guests_served: "50",
    total_revenue: "500.00",
    total_cost: "200.00",
    contribution_margin: "300.00",
    margin_percent: "60.0000000000000000",
    ...overrides,
  };
}

describe("GET /api/analytics/menu-engineering", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthed();
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 before any DB read when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

    const res = await getMenuEngineering(makeRequest());
    expect(res.status).toBe(401);
    expect(analyticsDatabase.$queryRaw).not.toHaveBeenCalled();
  });

  it("binds locationId as a parameter, never as interpolated SQL text (#26)", async () => {
    vi.mocked(analyticsDatabase.$queryRaw).mockResolvedValueOnce([
      menuItemRow(),
    ]);

    const res = await getMenuEngineering(
      makeRequest(`?period=30d&locationId=${ME_LOCATION_ID}`)
    );
    expect(res.status).toBe(200);

    // Exactly one $queryRaw (tagged template) call; $queryRawUnsafe is not on
    // the mock, so a revert cannot silently succeed.
    expect(analyticsDatabase.$queryRaw).toHaveBeenCalledTimes(1);

    const call = vi.mocked(analyticsDatabase.$queryRaw).mock.calls[0]!;
    const strings = call[0] as readonly string[];
    const sql = strings.join("?");
    const values = call.slice(1);

    // The optional-location clause is static SQL text (the parameterized form).
    expect(sql).toContain("IS NULL");
    expect(sql).toContain("e.location_id =");
    // The literal uuid value is NOT in the SQL text…
    expect(sql).not.toContain(ME_LOCATION_ID);
    // …it is a bound value (appears twice: the IS NULL check + the equality).
    expect(values).toContain(ME_LOCATION_ID);
    expect(values[0]).toBe(ME_TENANT_ID); // tenantId is the first bound value
  });

  it("still applies the static IS NULL OR clause when no locationId is given", async () => {
    vi.mocked(analyticsDatabase.$queryRaw).mockResolvedValueOnce([
      menuItemRow(),
    ]);

    const res = await getMenuEngineering(makeRequest("?period=7d"));
    expect(res.status).toBe(200);

    const call = vi.mocked(analyticsDatabase.$queryRaw).mock.calls[0]!;
    const sql = (call[0] as readonly string[]).join("?");
    const values = call.slice(1);
    // Static clause present; locationId bound as null (no filter applied).
    expect(sql).toContain("IS NULL");
    expect(values).toContain(null);
  });

  it("maps the analysis row into summary + menuItems + quadrant distribution", async () => {
    vi.mocked(analyticsDatabase.$queryRaw).mockResolvedValueOnce([
      menuItemRow(),
    ]);

    const res = await getMenuEngineering(makeRequest());
    const body = await res.json();

    // Summary math: revenue 500, cost 200, contribution margin 300 → 60% avg.
    expect(body.summary.totalRevenue).toBe(500);
    expect(body.summary.totalCost).toBe(200);
    expect(body.summary.totalContributionMargin).toBe(300);
    expect(body.summary.averageMarginPercent).toBe(60);
    expect(body.summary.totalDishes).toBe(1);
    expect(body.summary.topPerformingDish).toMatchObject({
      id: "d-1",
      name: "Margherita Pizza",
      contribution_margin: 300,
    });

    // One menu item; popularity 100 (max orders + max guests) + margin 60 >=
    // avg 60 → "star" quadrant.
    expect(body.menuItems).toHaveLength(1);
    expect(body.menuItems[0]).toMatchObject({
      dishId: "d-1",
      quadrant: "star",
      popularityScore: 100,
      marginPercent: 60,
    });
    expect(body.quadrantDistribution).toEqual({
      star: 1,
      plowhorse: 0,
      puzzle: 0,
      dog: 0,
    });
    expect(body.categoryAnalysis).toHaveLength(1);
  });
});
