/**
 * procurement/purchase-orders/[id] GET — concurrency regression guard (DB-perf
 * plan: the #23 read-parallelization sweep extended to detail routes).
 *
 * After the PO existence guard the handler fetched the vendor (needs
 * order.vendorId) and the line items (needs only the route id) SERIALLY. They
 * are independent of each other → collapse into one Promise.all (inventoryItems
 * stays serial since it depends on items). Removes 1 serial round-trip.
 *
 * This test pins the parallelization: both reads must FIRE before the first one
 * RESOLVES. A regression back to `await vendor; ...; await items` makes items
 * block on vendor — the held-pending gate then never sees it and vi.waitFor
 * times out.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/database", () => {
  const database = {
    purchaseOrder: { findFirst: vi.fn() },
    inventorySupplier: { findFirst: vi.fn() },
    purchaseOrderItem: { findMany: vi.fn() },
    inventoryItem: { findMany: vi.fn() },
  };
  return { database };
});
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { database } = await import("@/lib/database");

import { GET } from "@/app/api/procurement/purchase-orders/[id]/route";

const TENANT_ID = "00000000-0000-0000-0000-000000000090";
const ORG_ID = "org_procurement_po";
const PO_ID = "00000000-0000-0000-0000-000000000091";
const VENDOR_ID = "00000000-0000-0000-0000-000000000092";

const orderFixture = {
  tenantId: TENANT_ID,
  id: PO_ID,
  poNumber: "PO-1",
  vendorId: VENDOR_ID,
  status: "submitted",
  total: 100,
};

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({
    orgId: ORG_ID,
    userId: "user-1",
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID);
}

function makeRequest() {
  return new NextRequest(
    new URL(`/api/procurement/purchase-orders/${PO_ID}`, "http://localhost:3000")
  );
}

describe("GET /api/procurement/purchase-orders/[id] — read parallelization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthed();
    vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(
      orderFixture as never
    );
    vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue({
      name: "Acme",
    } as never);
    vi.mocked(database.purchaseOrderItem.findMany).mockResolvedValue(
      [] as never
    );
    vi.mocked(database.inventoryItem.findMany).mockResolvedValue([] as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("fires vendor + items together after the PO guard (not serial)", async () => {
    // Hold the vendor read pending; the items findMany must still fire.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(database.inventorySupplier.findFirst).mockImplementation(
      (() => gate.then(() => ({ name: "Acme" }))) as never
    );
    const itemsSpy = vi.mocked(database.purchaseOrderItem.findMany);

    const responsePromise = GET(makeRequest(), {
      params: Promise.resolve({ id: PO_ID }),
    });

    await vi.waitFor(
      () => {
        expect(itemsSpy).toHaveBeenCalledTimes(1);
      },
      { timeout: 500 }
    );
    release();
    const res = await responsePromise;
    expect(res.status).toBe(200);
  });

  it("returns 404 before vendor/items reads when the PO is missing", async () => {
    vi.mocked(database.purchaseOrder.findFirst).mockResolvedValue(null as never);

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ id: PO_ID }),
    });
    expect(res.status).toBe(404);
    expect(database.inventorySupplier.findFirst).not.toHaveBeenCalled();
    expect(database.purchaseOrderItem.findMany).not.toHaveBeenCalled();
  });
});
