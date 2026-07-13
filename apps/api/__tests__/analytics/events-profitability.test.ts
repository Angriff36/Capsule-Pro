/**
 * GET /api/analytics/events/profitability — #16 dedupe guard.
 *
 * The route previously defined a LOCAL getTenantIdForOrg (findFirst +
 * conditional account.create, NO cache, write-on-read on every GET). It now
 * imports the shared cached resolver from @/app/lib/tenant (the 30s-TTL cache
 * shipped in #2). These tests pin that the local account-provisioning code is
 * gone (no account.findFirst/create) and the shared resolver is used with the
 * authenticated orgId, the tenantId is threaded into the OLAP read, and the
 * error path returns a structured 500.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/database", () => {
  const account = {
    findFirst: vi.fn(),
    create: vi.fn(),
  };
  // `account` is exposed only so the dedupe guard can assert the local
  // provisioning code path is gone (the route no longer references it).
  const analyticsDatabase = {
    $queryRaw: vi.fn(),
    account,
  };
  return { database: analyticsDatabase, analyticsDatabase };
});

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { analyticsDatabase } = await import("@repo/database");
const { captureException } = await import("@sentry/nextjs");
const { log } = await import("@repo/observability/log");

// --- Route import (after mocks are registered) ---

import { GET as getProfitability } from "@/app/api/analytics/events/profitability/route";

// --- Constants ---

const TENANT_ID = "00000000-0000-0000-0000-0000000000p1";
const ORG_ID = "org_profitability_test";

// --- Helpers ---

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: ORG_ID, userId: "u1" } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID);
}

function makeRequest(query = ""): Request {
  return new Request(
    new URL(
      `/api/analytics/events/profitability${query}`,
      "http://localhost:3000"
    )
  );
}

function mockMonthlyRows() {
  vi.mocked(analyticsDatabase.$queryRaw).mockResolvedValue([
    {
      month: "2026-06",
      total_events: BigInt(2),
      avg_gross_margin_pct: "25",
      total_revenue: "3000",
      total_cost: "2250",
      avg_food_cost_pct: "30",
      avg_labor_cost_pct: "20",
      avg_overhead_pct: "10",
    },
  ] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  makeAuthed();
  mockMonthlyRows();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Tests ---

describe("GET /api/analytics/events/profitability — #16 shared-resolver dedupe", () => {
  it("resolves the tenant via the shared cached resolver, never local account provisioning", async () => {
    const res = await getProfitability(makeRequest());
    expect(res.status).toBe(200);

    expect(getTenantIdForOrg).toHaveBeenCalledTimes(1);
    expect(getTenantIdForOrg).toHaveBeenCalledWith(ORG_ID);

    // The local firstFirst-then-create provisioning code is GONE.
    expect(analyticsDatabase.account.findFirst).not.toHaveBeenCalled();
    expect(analyticsDatabase.account.create).not.toHaveBeenCalled();
  });

  it("threads the resolved tenantId into the OLAP read and maps the response", async () => {
    const res = await getProfitability(makeRequest("?period=3m"));
    expect(res.status).toBe(200);

    // Tagged-template $queryRaw call: (strings, tenantId, startDate).
    const rawCall = vi.mocked(analyticsDatabase.$queryRaw).mock.calls[0];
    expect(rawCall?.[1]).toBe(TENANT_ID);

    const body = await res.json();
    expect(body).toEqual([
      {
        period: "2026-06",
        totalEvents: 2,
        averageGrossMarginPct: 25,
        totalRevenue: 3000,
        totalCost: 2250,
        averageFoodCostPct: 30,
        averageLaborCostPct: 20,
        averageOverheadPct: 10,
      },
    ]);
  });

  it("returns 401 before any DB read when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({} as never);
    const res = await getProfitability(makeRequest());
    expect(res.status).toBe(401);
    expect(getTenantIdForOrg).not.toHaveBeenCalled();
    expect(analyticsDatabase.$queryRaw).not.toHaveBeenCalled();
  });

  it("returns a structured 500 and captures the error when the OLAP read fails", async () => {
    vi.mocked(analyticsDatabase.$queryRaw).mockRejectedValue(new Error("boom"));
    const res = await getProfitability(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch profitability data");
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(log.error).toHaveBeenCalledTimes(1);
  });
});
