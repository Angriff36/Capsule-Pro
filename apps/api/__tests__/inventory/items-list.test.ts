/**
 * GET /api/inventory/items (list, plain branch) — parallelization guard (#23).
 *
 * The plain (non-stock_status) branch runs `count` + `findMany` as one
 * concurrent round. Count-first route: `count` pending + `findMany` still
 * fires => concurrent (a serial `await count` would block and never reach
 * findMany). The separate `$queryRaw` stock_status branch (#19 low-stock fix)
 * is intentionally NOT exercised here — it is a different code path that
 * resolves its own count/IDs in SQL.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    inventoryItem: { count: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/inventory/items/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

function itemFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "i1",
    tenantId: "tenant_test",
    item_number: "SKU-1",
    name: "Flour",
    description: null,
    category: "dry_goods",
    unitOfMeasure: "kg",
    unitCost: 2.5,
    quantityOnHand: 10,
    parLevel: 5,
    reorder_level: 5,
    supplierId: null,
    tags: [],
    fsa_status: null,
    fsa_temp_logged: null,
    fsa_allergen_info: null,
    fsa_traceable: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

describe("GET /api/inventory/items (list, plain branch)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("runs count + findMany concurrently, not serially", async () => {
    let resolveCount!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveCount = r;
    });
    vi.mocked(database.inventoryItem.count).mockReturnValue(pending as never);
    vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
      itemFixture(),
    ] as never);

    const p = GET(new Request("http://x/api/inventory/items"));

    await vi.waitFor(() => {
      expect(database.inventoryItem.count).toHaveBeenCalledTimes(1);
    });
    // findMany fires while count is still pending — impossible in serial.
    expect(database.inventoryItem.findMany).toHaveBeenCalledTimes(1);

    resolveCount(0);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with computed stock_status + total_value", async () => {
    vi.mocked(database.inventoryItem.count).mockResolvedValue(25 as never);
    vi.mocked(database.inventoryItem.findMany).mockResolvedValue([
      itemFixture({ quantityOnHand: 10, reorder_level: 5 }), // in_stock
      itemFixture({
        id: "i2",
        item_number: "SKU-2",
        name: "Sugar",
        quantityOnHand: 3,
        reorder_level: 5,
      }), // low_stock
    ] as never);

    const res = await GET(
      new Request("http://x/api/inventory/items?limit=10&page=2")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toMatchObject({
      id: "i1",
      item_number: "SKU-1",
      stock_status: "in_stock",
      total_value: 25,
    });
    expect(body.data[1]).toMatchObject({
      id: "i2",
      stock_status: "low_stock",
    });
    expect(body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
    // Both reads share the same `where` (tenantId + deletedAt); findMany also
    // carries skip/take.
    expect(database.inventoryItem.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: "tenant_test",
        deletedAt: null,
      }),
    });
    expect(database.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant_test" }),
        skip: 10,
        take: 10,
      })
    );
  });

  it("takes the batched plain branch (not the $queryRaw stock_status path) when no stock_status filter is set", async () => {
    vi.mocked(database.inventoryItem.count).mockResolvedValue(0 as never);
    vi.mocked(database.inventoryItem.findMany).mockResolvedValue([] as never);

    const res = await GET(new Request("http://x/api/inventory/items"));

    // `$queryRaw` is deliberately NOT mocked — if the stock_status path were
    // taken, `database.$queryRaw` would be undefined, the route would throw,
    // and the catch would return 500. A 200 + count/findMany each called once
    // confirms the plain (batched) branch ran.
    expect(res.status).toBe(200);
    expect(database.inventoryItem.count).toHaveBeenCalledTimes(1);
    expect(database.inventoryItem.findMany).toHaveBeenCalledTimes(1);
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(new Request("http://x/api/inventory/items"));
    expect(res.status).toBe(401);
    expect(database.inventoryItem.findMany).not.toHaveBeenCalled();
    expect(database.inventoryItem.count).not.toHaveBeenCalled();
  });
});
