/**
 * Labor budget utilization — regression guard for the redundant-fetch
 * elimination (DB-perf #17 detail-route cluster, queued item 1).
 *
 * getLaborBudgetById fetched the budget row, then called
 * calculateBudgetUtilization which re-fetched the SAME row. The row is now
 * passed through as an optional arg, eliminating one round-trip per
 * budget-detail load. The inner query filters status='active'; the passed-row
 * path must mirror that gate (a non-active budget → utilization null, with no
 * extra query and no scheduled-hours/cost read).
 *
 * These tests pin: (1) one labor_budgets SELECT, not two; (2) utilization
 * computed from the reused row; (3) non-active short-circuits to null without
 * the scheduled read; (4) the no-arg path still fetches (checkBudgetForShift).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @repo/database: $queryRaw is routed by the (mocked) Prisma.sql text.
// Prisma.sql/join are stubbed the same way the conflicts detect-route tests do.
vi.mock("@repo/database", () => ({
  database: { $queryRaw: vi.fn() },
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join("?"),
      values,
    }),
    join: (items: unknown[]) => items.map((i) => String(i)).join(","),
    empty: { sql: "", values: [] },
  },
}));

const { database } = await import("@repo/database");

import {
  calculateBudgetUtilization,
  getLaborBudgetById,
} from "@/lib/staff/labor-budget";

const TENANT_ID = "00000000-0000-0000-0000-000000000091";
const BUDGET_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function fullRow(overrides: Record<string, unknown> = {}) {
  return {
    tenant_id: TENANT_ID,
    id: BUDGET_ID,
    location_id: null,
    event_id: null,
    name: "Q3 Labor",
    description: null,
    budget_type: "month",
    period_start: new Date("2026-07-01"),
    period_end: new Date("2026-07-31"),
    budget_target: 100,
    budget_unit: "hours",
    actual_spend: null,
    threshold_80_pct: false,
    threshold_90_pct: false,
    threshold_100_pct: false,
    status: "active",
    override_reason: null,
    created_at: new Date("2026-07-01"),
    updated_at: new Date("2026-07-01"),
    ...overrides,
  };
}

/** Route $queryRaw by the (mocked) Prisma.sql text: schedule_shifts vs row. */
function routeQueries(opts: { row: Record<string, unknown>; hours?: number }) {
  vi.mocked(database.$queryRaw).mockImplementation(
    (async (fragment: { sql: string }) => {
      const sql = fragment.sql;
      if (sql.includes("schedule_shifts")) {
        return [{ total_hours: opts.hours ?? 25 }] as never;
      }
      return [opts.row] as never;
    }) as never,
  );
}

/** Count $queryRaw calls whose SQL hits labor_budgets (the redundant target). */
function budgetRowQueries() {
  return vi.mocked(database.$queryRaw).mock.calls.filter((c) => {
    const frag = c[0] as { sql?: string };
    return typeof frag?.sql === "string" && frag.sql.includes("labor_budgets");
  });
}

describe("getLaborBudgetById redundant-fetch elimination", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("fetches the budget row ONCE (not twice) and computes utilization from it", async () => {
    routeQueries({ row: fullRow(), hours: 25 });

    const budget = await getLaborBudgetById(TENANT_ID, BUDGET_ID);

    // Exactly one labor_budgets SELECT — the redundant re-fetch is gone.
    expect(budgetRowQueries()).toHaveLength(1);
    // Plus one schedule_shifts read for the actual hours → 2 total (was 3).
    expect(database.$queryRaw).toHaveBeenCalledTimes(2);

    expect(budget).not.toBeNull();
    // 25 hours of 100 target → 25% utilization.
    expect(budget?.utilization).toMatchObject({
      budgetId: BUDGET_ID,
      budgetTarget: 100,
      actualSpend: 25,
      utilizationPct: 25,
      status: "active",
    });
  });

  it("returns utilization null for a non-active budget without a scheduled-query", async () => {
    routeQueries({ row: fullRow({ status: "paused" }) });

    const budget = await getLaborBudgetById(TENANT_ID, BUDGET_ID);

    // Still only the one budget-row fetch; calculateBudgetUtilization mirrors
    // the status='active' gate on the passed row and short-circuits to null.
    expect(budgetRowQueries()).toHaveLength(1);
    expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    expect(budget?.utilization).toBeNull();
    // The budget row itself is returned (getLaborBudgetById has no status filter).
    expect(budget?.status).toBe("paused");
  });

  it("returns null when the budget does not exist", async () => {
    vi.mocked(database.$queryRaw).mockResolvedValue([] as never);

    const budget = await getLaborBudgetById(TENANT_ID, BUDGET_ID);
    expect(budget).toBeNull();
    expect(budgetRowQueries()).toHaveLength(1);
  });
});

describe("calculateBudgetUtilization optional prefetched row", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("skips the budget SELECT when a prefetched active row is supplied", async () => {
    vi.mocked(database.$queryRaw).mockImplementation(
      (async (fragment: { sql: string }) => {
        const sql = fragment.sql;
        if (sql.includes("schedule_shifts")) {
          return [{ total_hours: 40 }] as never;
        }
        return [fullRow()] as never;
      }) as never,
    );

    const util = await calculateBudgetUtilization(
      TENANT_ID,
      BUDGET_ID,
      fullRow()
    );

    expect(util).toMatchObject({ actualSpend: 40, utilizationPct: 40 });
    expect(budgetRowQueries()).toHaveLength(0); // no budget-row fetch
    expect(database.$queryRaw).toHaveBeenCalledTimes(1); // only the hours read
  });

  it("returns null for a prefetched non-active row without any query", async () => {
    const util = await calculateBudgetUtilization(
      TENANT_ID,
      BUDGET_ID,
      fullRow({ status: "archived" })
    );
    expect(util).toBeNull();
    expect(database.$queryRaw).not.toHaveBeenCalled();
  });

  it("still fetches the budget row when no prefetched row is supplied (checkBudgetForShift path)", async () => {
    vi.mocked(database.$queryRaw).mockImplementation(
      (async (fragment: { sql: string }) => {
        const sql = fragment.sql;
        if (sql.includes("schedule_shifts")) {
          return [{ total_hours: 5 }] as never;
        }
        return [fullRow()] as never;
      }) as never,
    );

    const util = await calculateBudgetUtilization(TENANT_ID, BUDGET_ID);

    expect(util).toMatchObject({ actualSpend: 5, utilizationPct: 5 });
    expect(budgetRowQueries()).toHaveLength(1);
  });
});
