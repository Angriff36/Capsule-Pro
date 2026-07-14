/**
 * GET /api/procurement/weekly-ordering — column-projection regression guard
 * (db-perf #17).
 *
 * WHY THIS TEST EXISTS: the route's two prep-demand reads
 * (`purchaseRequisition.findMany` + `purchaseRequisitionItem.findMany`) returned
 * ALL ~30 / ~15 scalar columns per row even though the response mapping consumes
 * only 9 / 10 of them. A `select` was added narrowing to exactly the consumed
 * fields. `select` is a column projection — it never removes rows, so the
 * per-draft / per-item counts and the in-memory joins are byte-identical.
 *
 * This test pins the projection: `purchaseRequisition.findMany` MUST select
 * exactly the 9 consumed fields, `purchaseRequisitionItem.findMany` exactly the
 * 10 consumed (incl. `requisitionId`, read by the in-memory `requisitionId ===
 * draft.id` join). Re-adding a dropped column OR dropping the select fails
 * loudly. Also pins the response shape (supplier resolution, Decimal→toFixed
 * coercion, empty-drafts short-circuit, and the 401-before-read guard).
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    event: { findMany: vi.fn() },
    prepList: { findMany: vi.fn() },
    purchaseRequisition: { findMany: vi.fn() },
    purchaseRequisitionItem: { findMany: vi.fn() },
    inventorySupplier: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/procurement/weekly-ordering/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const URL =
  "http://x/api/procurement/weekly-ordering?start=2026-07-13&end=2026-07-20";

describe("GET /api/procurement/weekly-ordering — column projection (#17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      orgId: "org_test",
      userId: "u1",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("selects exactly the consumed fields on requisition + items", async () => {
    vi.mocked(database.event.findMany).mockResolvedValue([
      {
        id: "evt-1",
        title: "Gala",
        eventDate: new Date("2026-07-15"),
        status: "confirmed",
        guestCount: 100,
      },
    ] as never);
    vi.mocked(database.prepList.findMany).mockResolvedValue([
      {
        id: "prep-1",
        eventId: "evt-1",
        name: "Hot Line",
        status: "draft",
        totalItems: 4,
        generatedAt: null,
      },
    ] as never);
    vi.mocked(database.purchaseRequisition.findMany).mockResolvedValue([
      {
        id: "req-1",
        requisitionNumber: "R-001",
        sourceType: "prep-list-demand",
        supplierId: "sup-1",
        status: "draft",
        itemCount: 2,
        subtotal: 100.5,
        estimatedTotal: 110.25,
        notes: "rush",
      },
      // UNRESOLVED draft (no supplier)
      {
        id: "req-2",
        requisitionNumber: "R-002",
        sourceType: null,
        supplierId: null,
        status: "draft",
        itemCount: 1,
        subtotal: 0,
        estimatedTotal: 0,
        notes: null,
      },
    ] as never);
    vi.mocked(database.purchaseRequisitionItem.findMany).mockResolvedValue([
      {
        id: "it-1",
        requisitionId: "req-1",
        itemId: "inv-1",
        itemName: "Tomatoes",
        quantityRequested: 5,
        estimatedUnitCost: 2.5,
        estimatedTotalCost: 12.5,
        specifications: "diced",
        notes: null,
        sourcePrepListIds: ["prep-1"],
      },
    ] as never);
    vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([
      { id: "sup-1", name: "Acme Supply", vendorId: "vend-1" },
    ] as never);

    const res = await GET(new NextRequest(URL));
    const body = await res.json();

    expect(res.status).toBe(200);

    // The core regression guard: exactly the consumed fields, no more, no less.
    expect(database.purchaseRequisition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          requisitionNumber: true,
          sourceType: true,
          supplierId: true,
          status: true,
          itemCount: true,
          subtotal: true,
          estimatedTotal: true,
          notes: true,
        },
      })
    );
    expect(database.purchaseRequisitionItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          requisitionId: true, // read by the in-memory join, must be selected
          itemId: true,
          itemName: true,
          quantityRequested: true,
          estimatedUnitCost: true,
          estimatedTotalCost: true,
          specifications: true,
          notes: true,
          sourcePrepListIds: true,
        },
      })
    );

    // Response shape: supplier resolution + Decimal→toFixed + null coalescing.
    expect(body.success).toBe(true);
    expect(body.drafts).toEqual([
      {
        id: "req-1",
        requisitionNumber: "R-001",
        sourceType: "prep-list-demand",
        supplierId: "sup-1",
        supplierName: "Acme Supply",
        supplierVendorLinked: true,
        status: "draft",
        itemCount: 2,
        subtotal: "100.50",
        estimatedTotal: "110.25",
        notes: "rush",
        items: [
          {
            id: "it-1",
            itemId: "inv-1",
            itemName: "Tomatoes",
            quantityRequested: 5,
            estimatedUnitCost: "2.50",
            estimatedTotalCost: "12.50",
            specifications: "diced",
            notes: "",
            sourcePrepListIds: ["prep-1"],
          },
        ],
      },
      {
        id: "req-2",
        requisitionNumber: "R-002",
        sourceType: "",
        supplierId: "",
        supplierName: "",
        supplierVendorLinked: false,
        status: "draft",
        itemCount: 1,
        subtotal: "0.00",
        estimatedTotal: "0.00",
        notes: "",
        items: [],
      },
    ]);
    // The supplier query is keyed by the distinct draft supplierIds.
    expect(database.inventorySupplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant_test", id: { in: ["sup-1"] } },
      })
    );
  });

  it("skips the items + supplier queries when there are no drafts", async () => {
    vi.mocked(database.event.findMany).mockResolvedValue([] as never);
    vi.mocked(database.purchaseRequisition.findMany).mockResolvedValue(
      [] as never
    );

    const res = await GET(new NextRequest(URL));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.drafts).toEqual([]);
    // No drafts → no draftIds → items query never runs; no supplierIds → no supplier query.
    expect(database.purchaseRequisitionItem.findMany).not.toHaveBeenCalled();
    expect(database.inventorySupplier.findMany).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);
    const res = await GET(new NextRequest(URL));
    expect(res.status).toBe(401);
    expect(database.event.findMany).not.toHaveBeenCalled();
    expect(database.purchaseRequisition.findMany).not.toHaveBeenCalled();
  });
});
