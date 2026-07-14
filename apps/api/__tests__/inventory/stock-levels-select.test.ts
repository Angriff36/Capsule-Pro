/**
 * Focused test for GET /api/inventory/stock-levels — pins the `select`
 * narrowings on the two list reads (InventoryItem + InventoryStock) so a
 * future edit that drops a consumed field OR removes the select fails loudly.
 * The main route previously had NO test pinning its query shapes.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    inventoryItem: { findMany: vi.fn(() => Promise.resolve([])) },
    inventoryStock: { findMany: vi.fn(() => Promise.resolve([])) },
    // fetchStorageLocations uses database.$queryRaw`...`
    $queryRaw: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock("@repo/database", () => ({ database: db }));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { GET } = await import("@/app/api/inventory/stock-levels/route");

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

describe("GET /api/inventory/stock-levels — select narrowing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org-1" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID as never);
  });

  it("selects exactly the consumed InventoryItem columns (drops tags/description/parLevel/etc.)", async () => {
    db.inventoryItem.findMany.mockResolvedValue([
      {
        id: "it-1",
        tenantId: TENANT_ID,
        item_number: "SKU-1",
        name: "Flour",
        category: "Dry",
        quantityOnHand: 10,
        reorder_level: 5,
        unitCost: 2.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "it-2",
        tenantId: TENANT_ID,
        item_number: "SKU-2",
        name: "Sugar",
        category: null,
        quantityOnHand: 0,
        reorder_level: 3,
        unitCost: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);

    const response = await GET(
      new Request("http://localhost/api/inventory/stock-levels")
    );

    expect(response.status).toBe(200);

    // The select is a strict projection — exactly the 10 fields consumed by
    // createStockLevel + processStockLevels + the itemIds map.
    expect(db.inventoryItem.findMany).toHaveBeenCalledTimes(1);
    expect(db.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          tenantId: true,
          item_number: true,
          name: true,
          category: true,
          quantityOnHand: true,
          reorder_level: true,
          unitCost: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    );

    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.summary.totalItems).toBe(2);
  });

  it("selects exactly the 4 consumed InventoryStock columns", async () => {
    db.inventoryItem.findMany.mockResolvedValue([
      {
        id: "it-1",
        tenantId: TENANT_ID,
        item_number: "SKU-1",
        name: "Flour",
        category: "Dry",
        quantityOnHand: 10,
        reorder_level: 5,
        unitCost: 2.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);

    await GET(new Request("http://localhost/api/inventory/stock-levels"));

    expect(db.inventoryStock.findMany).toHaveBeenCalledTimes(1);
    expect(db.inventoryStock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          itemId: true,
          storageLocationId: true,
          quantityOnHand: true,
          lastCountedAt: true,
        },
      })
    );
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

    const response = await GET(
      new Request("http://localhost/api/inventory/stock-levels")
    );

    expect(response.status).toBe(401);
    expect(db.inventoryItem.findMany).not.toHaveBeenCalled();
  });
});
