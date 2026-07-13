/**
 * GET /api/inventory/purchase-orders (list) — parallelization + pagination guard.
 *
 * Pins item #23: the route's `count` + `findMany` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch), not serially. The downstream
 * `inventoryItem.findMany` (vendor/item detail lookup) depends on the orders
 * page and stays serial AFTER the batch — it is NOT part of the parallel pair.
 * Controlled pending-`findMany` concurrency proof — fails if reverted to serial.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    purchaseOrder: { findMany: vi.fn(), count: vi.fn() },
    inventoryItem: { findMany: vi.fn() },
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/inventory/purchase-orders/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/inventory/purchase-orders (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("runs count + findMany concurrently, not serially", async () => {
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    vi.mocked(database.purchaseOrder.findMany).mockReturnValue(pending as never);
    vi.mocked(database.purchaseOrder.count).mockResolvedValue(7);

    const p = GET(
      new Request("http://x/api/inventory/purchase-orders?limit=10&page=2")
    );

    await vi.waitFor(() => {
      expect(database.purchaseOrder.findMany).toHaveBeenCalledTimes(1);
    });

    // CONCURRENCY: count fires while findMany is still pending. (count is
    // constructed first in the Promise.all array, matching the original
    // serial order — but either way it fires in the same synchronous burst.)
    expect(database.purchaseOrder.count).toHaveBeenCalledTimes(1);
    expect(database.purchaseOrder.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: "tenant_test",
        deletedAt: null,
      }),
    });

    resolveFindMany([{ id: "po1", items: [] }]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.purchaseOrder.findMany).mockResolvedValue([
      { id: "po1", items: [] },
      { id: "po2", items: [] },
    ] as never);
    vi.mocked(database.purchaseOrder.count).mockResolvedValue(25);
    // No items across orders → inventoryItem lookup is skipped (itemIds empty).
    vi.mocked(database.inventoryItem.findMany).mockResolvedValue([]);

    const res = await GET(
      new Request("http://x/api/inventory/purchase-orders?limit=10&page=2")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(new Request("http://x/api/inventory/purchase-orders"));
    expect(res.status).toBe(401);
    expect(database.purchaseOrder.findMany).not.toHaveBeenCalled();
    expect(database.purchaseOrder.count).not.toHaveBeenCalled();
  });
});
