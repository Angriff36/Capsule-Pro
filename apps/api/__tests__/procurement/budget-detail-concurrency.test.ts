/**
 * procurement/budget/[id] GET — concurrency regression guard (DB-perf plan: the
 * #23 read-parallelization sweep extended to detail routes).
 *
 * The budget detail handler awaited FOUR independent reads serially after the
 * budget existence gate: actual-spend `$queryRaw`, committed-spend `$queryRaw`,
 * alerts `findMany`, and monthly-breakdown `$queryRaw` — each keyed only off
 * budget.category/period (or the route id for alerts), never another read's
 * result. Collapsing them into one `Promise.all` removes 3 serial round-trips
 * per detail load.
 *
 * This test pins the parallelization: all four reads must FIRE before the first
 * one RESOLVES. A regression back to `const a = await …; const b = await …`
 * makes reads 2-4 block on read 1 — the held-pending gate then never sees them
 * and vi.waitFor times out.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/database", () => {
  const database = {
    procurementBudget: { findFirst: vi.fn() },
    procurementBudgetAlert: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  };
  return { database, analyticsDatabase: database };
});
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { database } = await import("@/lib/database");

import { GET } from "@/app/api/procurement/budget/[id]/route";

const TENANT_ID = "00000000-0000-0000-0000-000000000070";
const ORG_ID = "org_procurement_budget";
const BUDGET_ID = "00000000-0000-0000-0000-000000000071";

const budgetFixture = {
  tenantId: TENANT_ID,
  id: BUDGET_ID,
  name: "Food",
  description: null,
  category: "Food",
  fiscalYear: "2026",
  periodType: "monthly",
  periodStart: null,
  periodEnd: null,
  budgetAmount: 1000,
  spentAmount: 0,
  committedAmount: 0,
  thresholdWarningPct: 80,
  thresholdCriticalPct: 95,
  status: "active",
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  deletedAt: null,
};

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({
    orgId: ORG_ID,
    userId: "user-1",
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID);
}

function makeRequest() {
  return new Request(
    new URL(`/api/procurement/budget/${BUDGET_ID}`, "http://localhost:3000")
  );
}

describe("GET /api/procurement/budget/[id] — read parallelization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthed();
    vi.mocked(database.procurementBudget.findFirst).mockResolvedValue(
      budgetFixture as never
    );
    vi.mocked(database.procurementBudgetAlert.findMany).mockResolvedValue(
      [] as never
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it("fires all four reads before the first resolves (not serial)", async () => {
    // Hold the FIRST $queryRaw (actual spend) pending; the other three reads
    // (committed $queryRaw, alerts findMany, monthly $queryRaw) must still fire.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let rawCalls = 0;
    vi.mocked(database.$queryRaw).mockImplementation((() => {
      rawCalls += 1;
      if (rawCalls === 1) {
        return gate.then(() => [{ total_spent: 0n, po_count: 0n }]);
      }
      return Promise.resolve([]);
    }) as never);

    const responsePromise = GET(makeRequest(), {
      params: Promise.resolve({ id: BUDGET_ID }),
    });

    // Serial: only the first $queryRaw fires while it is pending → timeout.
    await vi.waitFor(
      () => {
        expect(rawCalls).toBe(3); // spend + committed + monthly $queryRaw
        expect(database.procurementBudgetAlert.findMany).toHaveBeenCalledTimes(
          1
        );
      },
      { timeout: 500 }
    );
    release();
    const res = await responsePromise;
    expect(res.status).toBe(200);
  });

  it("returns 404 before any aggregate read when the budget is missing", async () => {
    vi.mocked(database.procurementBudget.findFirst).mockResolvedValue(
      null as never
    );

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ id: BUDGET_ID }),
    });
    expect(res.status).toBe(404);
    expect(database.$queryRaw).not.toHaveBeenCalled();
    expect(database.procurementBudgetAlert.findMany).not.toHaveBeenCalled();
  });
});
