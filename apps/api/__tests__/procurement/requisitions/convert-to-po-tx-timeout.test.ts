/**
 * POST /api/procurement/requisitions/[id]/convert-to-po — $transaction
 * pool-hold bound regression guard (db-perf #18, same shape as #29).
 *
 * WHY THIS TEST EXISTS: this route runs N governed writes (PurchaseOrder.create
 * → N×PurchaseOrderItem.create → PurchaseOrder.updateTotals →
 * PurchaseRequisition.convertToPo = N+3 governed ops) inside ONE interactive
 * `$transaction`, which checks out a single pool connection (max:20) for the
 * whole duration. The original timeout scaled with item count up to a 120s
 * ceiling (`Math.min(items.length*2000+10_000, 120_000)`), so a few concurrent
 * large conversions could each pin a connection for up to two minutes,
 * exhaust the pool, and starve every other request (Prisma P2024). The ceiling
 * is now the app-wide transaction timeout (30s) via `batchTransactionTimeout`.
 *
 * This test pins that the route passes the BOUND timeout to `$transaction` — a
 * 100-line conversion (which the old formula would have held for the full 120s)
 * must now hold ≤30s. It fails if the inline 120_000 ceiling is restored.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/database", () => ({
  database: {
    purchaseRequisition: { findFirst: vi.fn() },
    purchaseRequisitionItem: { findMany: vi.fn() },
    inventorySupplier: { findFirst: vi.fn() },
    vendor: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn().mockResolvedValue({}),
}));

vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi
    .fn()
    .mockResolvedValue({ ok: true, result: { id: "po-new" }, events: [] }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { database } from "@repo/database";
import { requireCurrentUser } from "@/app/lib/tenant";
import { batchTransactionTimeout } from "@/lib/manifest/batch-timeout";

// Lazy import so the module-level mocks above are registered first.
const { POST } = await import(
  "@/app/api/procurement/requisitions/[id]/convert-to-po/route"
);

const TENANT_ID = "a0000000-0000-4000-a000-000000000002";
const USER_ID = "u0000000-0000-4000-a000-000000000003";

function req(itemId = "req-1") {
  return new NextRequest(
    new URL(
      `http://localhost:3000/api/procurement/requisitions/${itemId}/convert-to-po`
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }
  ) as unknown as NextRequest;
}

const context = (id = "req-1") => ({ params: Promise.resolve({ id }) });

function makeItems(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    itemId: `item-${i}`,
    quantityRequested: 5,
    estimatedUnitCost: 2,
    unitId: 1,
    notes: null,
    sourcePrepListIds: [],
  }));
}

/** Capture the `$transaction` options (2nd arg) while still invoking the
 * callback so the route reaches its success path. */
function captureTxOptions() {
  vi.mocked(database.$transaction).mockImplementation(async (cb, options) => {
    // Stash options on the mock for assertion, then run the callback.
    (database.$transaction as { __opts?: unknown }).__opts = options;
    return (cb as (tx: unknown) => Promise<unknown>)({});
  });
  return () =>
    (database.$transaction as { __opts?: { timeout: number } }).__opts;
}

describe("POST convert-to-po — $transaction pool-hold bound (#18)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
      email: "",
      firstName: "",
      lastName: "",
    });
    vi.mocked(database.purchaseRequisition.findFirst).mockResolvedValue({
      id: "req-1",
      tenantId: TENANT_ID,
      status: "approved",
      supplierId: "sup-1",
      requisitionNumber: "R-001",
      requiredBy: null,
      locationId: null,
      sourceType: "manual",
    } as never);
    vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue({
      id: "sup-1",
      vendorId: "vend-1",
      name: "Acme Supply",
    } as never);
    vi.mocked(database.vendor.findFirst).mockResolvedValue({
      id: "vend-1",
      name: "Acme Vendor",
    } as never);
  });

  it("bounds a 100-line conversion to the 30s app-wide tx ceiling (was 120s)", async () => {
    const getOpts = captureTxOptions();
    vi.mocked(database.purchaseRequisitionItem.findMany).mockResolvedValue(
      makeItems(100) as never
    );

    const res = await POST(req(), context());
    expect(res.status).toBe(200);

    const opts = getOpts();
    expect(opts).toBeDefined();
    // The discriminating guard: the old `Math.min(100*2000+10_000, 120_000)`
    // yielded 120_000; the helper yields the 30s ceiling. opCount = 100 items
    // + 3 fixed writes (PO.create + updateTotals + convertToPo).
    expect(opts?.timeout).toBe(batchTransactionTimeout(100 + 3));
    expect(opts?.timeout).toBeLessThanOrEqual(30_000);
  });

  it("gives a small conversion proportional headroom below the ceiling (opCount = items + 3)", async () => {
    const getOpts = captureTxOptions();
    vi.mocked(database.purchaseRequisitionItem.findMany).mockResolvedValue(
      makeItems(2) as never
    );

    const res = await POST(req(), context());
    expect(res.status).toBe(200);

    const opts = getOpts();
    // 2 items + 3 fixed writes = 5 ops → 5*2000+5000 = 15s, well under 30s.
    // Pinning opCount = items + 3 guards against dropping the fixed-write
    // accounting (the old `+10_000` base covered updateTotals + convertToPo).
    expect(opts?.timeout).toBe(batchTransactionTimeout(2 + 3));
    expect(opts?.timeout).toBeLessThan(30_000);
  });

  it("requires an authenticated user before any DB read", async () => {
    // requireCurrentUser throws an InvariantError on missing auth; the route
    // maps that to 401. A plain Error would hit the 500 branch.
    vi.mocked(requireCurrentUser).mockRejectedValue(
      Object.assign(new Error("No current user"), { name: "InvariantError" })
    );
    const res = await POST(req(), context());
    expect(res.status).toBe(401);
    expect(database.$transaction).not.toHaveBeenCalled();
  });
});
