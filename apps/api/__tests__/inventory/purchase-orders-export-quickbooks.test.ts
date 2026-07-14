/**
 * Tests for POST /api/inventory/purchase-orders/export/quickbooks
 * Pins the #20 select narrowing on the export (take:1000): the route selects
 * only the consumed PurchaseOrder scalars + the items relation, and the nested
 * items select narrows to the 5 consumed fields — while producing an unchanged
 * QuickBooks bill export.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    purchaseOrder: {
      findMany: vi.fn(),
    },
    inventorySupplier: {
      findMany: vi.fn(),
    },
    inventoryItem: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

vi.mock("@repo/storage", () => ({
  uploadFile: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { uploadFile } from "@repo/storage";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { POST } from "../../app/api/inventory/purchase-orders/export/quickbooks/route";

const mockAuth = vi.mocked(auth);
const mockGetTenantId = vi.mocked(getTenantIdForOrg);
const mockPurchaseOrderFindMany = vi.mocked(database.purchaseOrder.findMany);
const mockSupplierFindMany = vi.mocked(database.inventorySupplier.findMany);
const mockItemFindMany = vi.mocked(database.inventoryItem.findMany);
const mockUploadFile = vi.mocked(uploadFile);

const selectOf = (call: unknown): Record<string, unknown> =>
  (call as { select?: Record<string, unknown> })?.select ?? {};

describe("POST /api/inventory/purchase-orders/export/quickbooks", () => {
  const tenantId = "tenant-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
    } as unknown as Awaited<ReturnType<typeof auth>>);
    mockGetTenantId.mockResolvedValue(tenantId);
    mockUploadFile.mockResolvedValue({
      url: "https://example.com/export.iif",
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const poRow = () => ({
    id: "po-1",
    poNumber: "PO-001",
    orderDate: new Date("2026-07-13T00:00:00Z"),
    expectedDeliveryDate: new Date("2026-07-15T00:00:00Z"),
    subtotal: 100,
    taxAmount: 10,
    shippingAmount: 5,
    total: 115,
    notes: "rush order",
    status: "received",
    vendorId: "ven-1",
    items: [
      {
        itemId: "itm-1",
        quantityOrdered: 2,
        unitCost: 50,
        totalCost: 100,
        notes: null,
      },
    ],
  });

  const post = () =>
    POST(
      new Request(
        "http://localhost/api/inventory/purchase-orders/export/quickbooks",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      ) as never
    );

  it("should return 401 before any DB read when unauthenticated", async () => {
    mockAuth.mockResolvedValue({
      orgId: null,
      userId: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const res = await post();

    expect(res.status).toBe(401);
    expect(mockPurchaseOrderFindMany).not.toHaveBeenCalled();
  });

  it("should select only the consumed PO fields (no full-row over-fetch)", async () => {
    mockPurchaseOrderFindMany.mockResolvedValue([poRow()] as unknown as Awaited<
      ReturnType<typeof database.purchaseOrder.findMany>
    >);
    mockSupplierFindMany.mockResolvedValue([
      {
        id: "ven-1",
        name: "Acme Vendor",
        email: "v@example.com",
        payment_terms: "Net 30",
      },
    ] as unknown as Awaited<
      ReturnType<typeof database.inventorySupplier.findMany>
    >);
    mockItemFindMany.mockResolvedValue([
      { id: "itm-1", name: "Flour" },
    ] as unknown as Awaited<
      ReturnType<typeof database.inventoryItem.findMany>
    >);

    const res = await post();
    const data = await res.json();

    expect(res.status).toBe(200);

    const select = selectOf(mockPurchaseOrderFindMany.mock.calls[0]?.[0]);
    // Exactly the consumed PO scalars + the items relation.
    expect(Object.keys(select).sort()).toEqual(
      [
        "expectedDeliveryDate",
        "id",
        "items",
        "notes",
        "orderDate",
        "poNumber",
        "shippingAmount",
        "status",
        "subtotal",
        "taxAmount",
        "total",
        "vendorId",
      ].sort()
    );
    // Unused columns dropped (amplified by take:1000).
    expect(select).not.toHaveProperty("submittedBy");
    expect(select).not.toHaveProperty("receivedAt");
    expect(select).not.toHaveProperty("locationId");
    expect(select).not.toHaveProperty("itemCount");

    // items narrows to the 5 consumed fields.
    const itemsSelect =
      (select.items as { select?: Record<string, unknown> })?.select ?? {};
    expect(Object.keys(itemsSelect).sort()).toEqual(
      ["itemId", "notes", "quantityOrdered", "totalCost", "unitCost"].sort()
    );

    // Export ran end-to-end over the narrowed rows.
    expect(data.purchaseOrdersExported).toBe(1);
    expect(mockUploadFile).toHaveBeenCalledOnce();
  });

  it("should return 404 when no purchase orders match", async () => {
    mockPurchaseOrderFindMany.mockResolvedValue(
      [] as unknown as Awaited<
        ReturnType<typeof database.purchaseOrder.findMany>
      >
    );

    const res = await post();

    expect(res.status).toBe(404);
    expect(mockUploadFile).not.toHaveBeenCalled();
  });
});
