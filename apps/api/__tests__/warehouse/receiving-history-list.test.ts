/**
 * GET /api/warehouse/receiving/history (list) — parallelization + pagination guard.
 *
 * Pins item #23: the route's `findMany` + `count` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch). The vendor-name lookup depends
 * on findMany results and stays serial after.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    purchaseOrder: { findMany: vi.fn(), count: vi.fn() },
    inventorySupplier: { findMany: vi.fn() },
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn() },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/warehouse/receiving/history/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/warehouse/receiving/history (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([]);
  });

  it("runs findMany + count concurrently, not serially", async () => {
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    vi.mocked(database.purchaseOrder.findMany).mockReturnValue(
      pending as never
    );
    vi.mocked(database.purchaseOrder.count).mockResolvedValue(18);

    const p = GET(
      new Request("http://x/api/warehouse/receiving/history?page=1&limit=10")
    );

    await vi.waitFor(() => {
      expect(database.purchaseOrder.findMany).toHaveBeenCalledTimes(1);
    });

    expect(database.purchaseOrder.count).toHaveBeenCalledTimes(1);
    expect(database.purchaseOrder.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenantId: "tenant_test" }),
    });

    resolveFindMany([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct totalPages math", async () => {
    vi.mocked(database.purchaseOrder.findMany).mockResolvedValue([
      {
        id: "po1",
        tenantId: "tenant_test",
        vendorId: "vendor_1",
        poNumber: "PO-001",
        status: "received",
        receivedAt: new Date(),
        receivedBy: "user_1",
        items: [{ quantityOrdered: "10", quantityReceived: "10" }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);
    vi.mocked(database.purchaseOrder.count).mockResolvedValue(35);

    const res = await GET(
      new Request("http://x/api/warehouse/receiving/history?page=2&limit=10")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.records).toHaveLength(1);
    expect(body).toMatchObject({
      page: 2,
      total: 35,
      totalPages: 4,
    });

    // Column-projection guard (#17 over-fetch): findMany MUST select exactly the
    // 6 consumed scalars + the items relation (folded out of `include`). Re-adding
    // a dropped column OR reverting to `include` (no parent select) fails loudly.
    expect(database.purchaseOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          poNumber: true,
          vendorId: true,
          status: true,
          receivedAt: true,
          receivedBy: true,
          items: {
            where: { deletedAt: null },
            select: { quantityOrdered: true, quantityReceived: true },
          },
        },
      })
    );
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(
      new Request("http://x/api/warehouse/receiving/history")
    );
    expect(res.status).toBe(401);
    expect(database.purchaseOrder.findMany).not.toHaveBeenCalled();
    expect(database.purchaseOrder.count).not.toHaveBeenCalled();
  });
});
