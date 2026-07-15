/**
 * POST /api/events/profitability/commands/recalculate — over-fetch select guards (#17).
 *
 * The recalculate path reads three models wide (no `select`) before dispatching
 * the governed write. These tests pin the narrowed projections so a revert or a
 * re-added column fails loudly, and pin the computed budget/actual math so the
 * narrowing can't silently break consumption:
 *  - cateringOrder.findMany      → select { subtotalAmount, orderStatus }   (was ~35 cols)
 *  - eventBudget.findFirst        → include→select fold; lineItems → { budgetedAmount, category }
 *  - eventProfitability.findFirst → select { eventId }                      (existence + eventId)
 */
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/database", () => ({
  database: {
    eventProfitability: { findFirst: vi.fn() },
    eventBudget: { findFirst: vi.fn() },
    event: { findUnique: vi.fn() },
    cateringOrder: { findMany: vi.fn() },
  },
}));
vi.mock("@/app/lib/tenant", () => ({ resolveCurrentUser: vi.fn() }));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));

import { database } from "@repo/database";
import { POST } from "@/app/api/events/profitability/commands/recalculate/route";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

const TENANT_ID = "tenant_test";
const EVENT_ID = "evt_1";
const PROFITABILITY_ID = "prof_1";

function makeRequest(instanceId = PROFITABILITY_ID) {
  return new NextRequest(
    "http://x/api/events/profitability/commands/recalculate",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ instanceId }),
    }
  );
}

/** Seed the four reads with controlled values for the happy-path assertions. */
function seedReads() {
  vi.mocked(database.eventProfitability.findFirst).mockResolvedValue({
    eventId: EVENT_ID,
  } as never);
  vi.mocked(database.event.findUnique).mockResolvedValue({
    budget: 2000,
  } as never);
  // Food (1000) → budgetedFoodCost; Labor (500) → budgetedLaborCost.
  vi.mocked(database.eventBudget.findFirst).mockResolvedValue({
    lineItems: [
      { budgetedAmount: 1000, category: "Food" },
      { budgetedAmount: 500, category: "Labor" },
    ],
  } as never);
  // confirmed (500) contributes revenue + cost splits; draft (300) revenue only.
  vi.mocked(database.cateringOrder.findMany).mockResolvedValue([
    { subtotalAmount: 500, orderStatus: "confirmed" },
    { subtotalAmount: 300, orderStatus: "draft" },
  ] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveCurrentUser).mockResolvedValue({
    id: "u1",
    tenantId: TENANT_ID,
    role: "tenant_admin",
  } as never);
  vi.mocked(runManifestCommand).mockResolvedValue(
    new NextResponse(JSON.stringify({ ok: true }), { status: 200 })
  );
});

describe("POST /api/events/profitability/commands/recalculate — #17 select guards", () => {
  it("narrows cateringOrder + eventBudget + eventProfitability reads", async () => {
    seedReads();

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // cateringOrder: exactly the 2 consumed fields (drops ~33 incl. Decimal money).
    const coArg = vi.mocked(database.cateringOrder.findMany).mock.calls[0]?.[0];
    expect(coArg?.select).toEqual({
      subtotalAmount: true,
      orderStatus: true,
    });
    expect(coArg?.select).not.toHaveProperty("totalAmount");
    expect(coArg?.select).not.toHaveProperty("specialInstructions");

    // eventBudget: include→select fold — no parent col, lineItems narrowed to 2.
    const ebArg = vi.mocked(database.eventBudget.findFirst).mock.calls[0]?.[0];
    expect(ebArg).not.toHaveProperty("include");
    expect(ebArg?.select).toEqual({
      lineItems: {
        where: { deletedAt: null },
        select: { budgetedAmount: true, category: true },
      },
    });

    // eventProfitability: existence + eventId only (drops ~20 cost/variance cols).
    const epArg = vi.mocked(database.eventProfitability.findFirst).mock
      .calls[0]?.[0];
    expect(epArg?.select).toEqual({ eventId: true });
    expect(epArg?.select).not.toHaveProperty("actualRevenue");
  });

  it("threads correctly-computed budget + actual totals into the governed recalculate", async () => {
    seedReads();

    await POST(makeRequest());

    expect(runManifestCommand).toHaveBeenCalledTimes(1);
    const params = vi.mocked(runManifestCommand).mock.calls[0]?.[0];
    expect(params?.entity).toBe("EventProfitability");
    expect(params?.command).toBe("recalculate");
    expect(params?.body).toEqual({
      id: PROFITABILITY_ID,
      tenantId: TENANT_ID,
      calculationMethod: "manual",
      // budgeted: revenue = event.budget; Food→foodCost 1000, Labor→laborCost 500.
      budgetedRevenue: 2000,
      budgetedFoodCost: 1000,
      budgetedLaborCost: 500,
      budgetedOverhead: 0,
      // actual: revenue 500+300=800; confirmed 500 → 0.35/0.15/0.05 splits.
      actualRevenue: 800,
      actualFoodCost: 175,
      actualLaborCost: 75,
      actualOverhead: 25,
    });
  });

  it("returns 401 before any DB read when unauthenticated", async () => {
    vi.mocked(resolveCurrentUser).mockResolvedValue(null as never);

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(database.eventProfitability.findFirst).not.toHaveBeenCalled();
    expect(database.eventBudget.findFirst).not.toHaveBeenCalled();
    expect(database.cateringOrder.findMany).not.toHaveBeenCalled();
    expect(runManifestCommand).not.toHaveBeenCalled();
  });

  it("returns 404 when the profitability record is missing (skips downstream reads)", async () => {
    vi.mocked(database.eventProfitability.findFirst).mockResolvedValue(null);

    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
    expect(database.eventBudget.findFirst).not.toHaveBeenCalled();
    expect(database.cateringOrder.findMany).not.toHaveBeenCalled();
    expect(runManifestCommand).not.toHaveBeenCalled();
  });

  it("runs the budget + actual reads concurrently after the gate (waterfall collapse)", async () => {
    vi.mocked(database.eventProfitability.findFirst).mockResolvedValue({
      eventId: EVENT_ID,
    } as never);
    vi.mocked(database.event.findUnique).mockResolvedValue({
      budget: 0,
    } as never);
    vi.mocked(database.cateringOrder.findMany).mockResolvedValue([] as never);

    // Hold eventBudget pending. In a serial layout event.findUnique and
    // cateringOrder.findMany cannot fire until eventBudget resolves; under the
    // Promise.all they dispatch in the same wave while it is still pending.
    let releaseEventBudget: (() => void) | undefined;
    vi.mocked(database.eventBudget.findFirst).mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseEventBudget = () => resolve({ lineItems: [] } as never);
        }) as never
    );

    const postPromise = POST(makeRequest());

    // Both independent reads fire WHILE eventBudget is still pending.
    await vi.waitFor(() => {
      expect(database.event.findUnique).toHaveBeenCalled();
      expect(database.cateringOrder.findMany).toHaveBeenCalled();
    });

    releaseEventBudget?.();
    const res = await postPromise;
    expect(res.status).toBe(200);
  });
});
