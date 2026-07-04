/**
 * Inventory audit discrepancy resolve — stock-adjustment contract.
 *
 * WHY THIS MATTERS: resolving a discrepancy previously approved the variance
 * report (status → approved/adjusted) but performed NO `InventoryItem.adjust`
 * and NO `InventoryTransaction.create` — so the books were marked reconciled
 * while physical on-hand never moved (a confirmed inventory-integrity bug,
 * IMPLEMENTATION_PLAN item 171). These tests lock the fix:
 *  - `full_adjustment` MUST move stock: a governed `InventoryItem.adjust`
 *    (delta = counted − live on-hand) + an `InventoryTransaction.create`
 *    ledger row, mirroring the cycle-count finalize route.
 *  - `no_adjustment` MUST NOT move stock.
 *  - `partial_adjustment` / `write_off` are DEFERRED (signed-delta semantics is
 *    a domain decision) — they MUST NOT move stock and MUST log the skip.
 * They also lock the command ordering: `updateDiscrepancy` (guards
 * pending/reviewed) MUST run before `approve` (flips to approved), or the route
 * can never complete.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as resolveRoute } from "@/app/api/inventory/audit/discrepancies/[id]/resolve/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

vi.mock("@repo/database", () => ({
  database: {
    user: { findFirst: vi.fn() },
    varianceReport: { findFirst: vi.fn() },
    inventoryItem: { findFirst: vi.fn() },
  },
}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn(
    (data, status = 200) =>
      new Response(JSON.stringify({ success: true, ...data }), { status })
  ),
  manifestErrorResponse: vi.fn(
    (data, status = 400) =>
      new Response(
        JSON.stringify({
          success: false,
          ...(typeof data === "string" ? { message: data } : data),
        }),
        { status }
      )
  ),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const TEST_CLERK_ID = "clerk-001";
const TEST_ORG_ID = "org-001";
const TEST_TENANT_ID = "tenant-001";
const TEST_USER_ID = "user-001";
const REPORT_ID = "vr-001";
const ITEM_ID = "item-001";

/** Decimal-like field (Prisma Decimal exposes `.toNumber()`). */
const dec = (n: number) => ({ toNumber: () => n });

const COUNTED = 10;
const EXPECTED = 8;
const ON_HAND = 8;
// variance = counted − expected; stock delta = counted − live on-hand.
const VARIANCE = COUNTED - EXPECTED; // 2
const DELTA = COUNTED - ON_HAND; // 2

function makeReport(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-06-21T00:00:00.000Z");
  return {
    id: REPORT_ID,
    tenantId: TEST_TENANT_ID,
    sessionId: "sess-001",
    reportType: "item_variance",
    itemId: ITEM_ID,
    itemNumber: "SKU-1",
    itemName: "Test Item",
    expectedQuantity: dec(EXPECTED),
    countedQuantity: dec(COUNTED),
    variance: dec(VARIANCE),
    variancePct: dec(25),
    accuracyScore: dec(75),
    status: "reviewed",
    adjustmentType: null,
    adjustmentAmount: null,
    adjustmentDate: null,
    notes: null,
    rootCause: null,
    resolutionNotes: null,
    resolvedById: null,
    resolvedAt: null,
    generatedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const runCommandMock = vi.fn();

function callResolve(body: Record<string, unknown>) {
  const request = {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Parameters<typeof resolveRoute>[0];
  return resolveRoute(request, {
    params: Promise.resolve({ id: REPORT_ID }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_CLERK_ID,
  });
  (getTenantIdForOrg as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
    TEST_TENANT_ID
  );
  (database.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "manager",
  });
  (
    database.varianceReport.findFirst as ReturnType<typeof vi.fn>
  ).mockResolvedValue(makeReport());
  (
    database.inventoryItem.findFirst as ReturnType<typeof vi.fn>
  ).mockResolvedValue({
    id: ITEM_ID,
    unitCost: dec(5),
    quantityOnHand: dec(ON_HAND),
  });
  runCommandMock.mockResolvedValue({ success: true });
  (createManifestRuntime as ReturnType<typeof vi.fn>).mockResolvedValue({
    runCommand: runCommandMock,
  });
  (runManifestCommandCore as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("discrepancy resolve — stock adjustment", () => {
  it("full_adjustment writes a ledger row AND corrects on-hand to the counted quantity", async () => {
    const res = await callResolve({ adjustmentType: "full_adjustment" });
    expect(res.status).toBe(200);

    expect(runManifestCommandCore).toHaveBeenCalledTimes(2);

    const calls = (runManifestCommandCore as ReturnType<typeof vi.fn>).mock
      .calls;
    const tx = calls.find((c) => c[1].entity === "InventoryTransaction");
    const adjust = calls.find((c) => c[1].entity === "InventoryItem");

    expect(tx?.[1].command).toBe("create");
    expect(tx?.[1].body.transactionType).toBe("adjustment");
    expect(tx?.[1].body.quantity).toBe(VARIANCE);

    expect(adjust?.[1].command).toBe("adjust");
    expect(adjust?.[1].body.quantity).toBe(DELTA);
    expect(adjust?.[1].instanceId).toBe(ITEM_ID);
  });

  it("no_adjustment does NOT move stock", async () => {
    await callResolve({ adjustmentType: "no_adjustment" });
    expect(runManifestCommandCore).not.toHaveBeenCalled();
  });

  it("write_off is deferred — no stock movement, logs the skip", async () => {
    // adjustmentAmount required by the route for write_off.
    await callResolve({ adjustmentType: "write_off", adjustmentAmount: 1 });
    expect(runManifestCommandCore).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining("deferred stock semantics"),
      expect.objectContaining({ adjustmentType: "write_off" })
    );
  });

  it("dispatches updateDiscrepancy BEFORE approve (guard ordering)", async () => {
    await callResolve({ adjustmentType: "full_adjustment" });
    const commandOrder = runCommandMock.mock.calls.map((c) => c[0]);
    expect(commandOrder).toContain("updateDiscrepancy");
    expect(commandOrder).toContain("approve");
    expect(commandOrder.indexOf("updateDiscrepancy")).toBeLessThan(
      commandOrder.indexOf("approve")
    );
  });
});
