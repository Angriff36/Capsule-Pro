/**
 * GET /api/shipments/[id] (detail) — over-fetch regression guard.
 *
 * Pins the column-narrowing on the shipment detail read: the handler maps a
 * fixed allowlist of Shipment fields to the snake_case response and exposes
 * `signature` from `signatureText` (the typed name) — `signatureData` (a
 * base64 signature blob that can run tens-of-KB→MB/row) is never mapped to
 * the response. The findFirst now uses a top-level `select` that drops
 * `signatureData`, and narrows `items.item` from the full InventoryItem row
 * to the 3 fields the mapper consumes (`id`/`name`/`item_number`). `select`
 * is a column projection (never removes rows), so the response shape is
 * unchanged — the blob was pure read-side waste (the response never exposed it).
 *
 * The guard asserts the findFirst is called WITH a select that omits
 * signatureData, that items.item is narrowed (not `true`), and that the mapped
 * fields the UI needs survive.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    shipment: { findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/shipments/[id]/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/shipments/[id] (detail)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("narrows the findFirst to a select that drops the signatureData blob", async () => {
    vi.mocked(database.shipment.findFirst).mockResolvedValue({
      id: "shp1",
      tenantId: "tenant_test",
      shipmentNumber: "SHP-1",
      status: "delivered",
      eventId: null,
      supplierId: null,
      locationId: null,
      scheduledDate: null,
      shippedDate: null,
      estimatedDeliveryDate: null,
      actualDeliveryDate: null,
      totalItems: 2,
      shippingCost: null,
      totalValue: null,
      trackingNumber: "T1",
      carrier: "UPS",
      shippingMethod: "ground",
      deliveredBy: null,
      receivedBy: "r1",
      signatureText: "Jane Doe",
      notes: "n",
      internalNotes: "in",
      reference: "REF-9",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
      deletedAt: null,
      items: [
        {
          id: "si1",
          tenantId: "tenant_test",
          deletedAt: null,
          shipmentId: "shp1",
          itemId: "itm1",
          quantityShipped: 5,
          quantityReceived: 5,
          quantityDamaged: 0,
          unitId: 1,
          unitCost: 2.5,
          totalCost: 12.5,
          condition: "good",
          conditionNotes: "",
          lotNumber: "L1",
          expirationDate: null,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          item: { id: "itm1", name: "Flour", item_number: "FLR-001" },
        },
      ],
    } as never);

    const res = await GET(new NextRequest("http://x/api/shipments/shp1"), {
      params: Promise.resolve({ id: "shp1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(database.shipment.findFirst).toHaveBeenCalledTimes(1);

    // select is present (regression guard: fails if reverted to `include`)
    // and omits the heavy signatureData blob.
    const select = vi.mocked(database.shipment.findFirst).mock.calls[0]?.[0]
      ?.select as Record<string, unknown> | undefined;
    expect(select).toBeDefined();
    expect(select).not.toHaveProperty("signatureData");
    // the columns the mapping consumes are still projected (detail keeps
    // `reference` — unlike the list route which drops it).
    expect(select?.signatureText).toBe(true);
    expect(select?.shipmentNumber).toBe(true);
    expect(select?.reference).toBe(true);

    // items sub-relation folded into the select with its nested item narrowed
    // to the 3 consumed fields (not `true`).
    const itemsSelect = (select?.items as Record<string, unknown> | undefined)
      ?.select as Record<string, unknown> | undefined;
    expect(itemsSelect).toBeDefined();
    const itemRelation = itemsSelect?.item as Record<string, unknown> | undefined;
    expect(itemRelation).toBeDefined();
    // `item` is a nested select (not `true`), narrowed to the 3 consumed fields.
    expect(itemRelation).not.toBe(true);
    expect(itemRelation?.select).toEqual({
      id: true,
      name: true,
      item_number: true,
    });

    // mapped response shape is unchanged — UI fields survive. signature comes
    // from signatureText; signatureData is (and always was) absent.
    expect(body).toMatchObject({
      id: "shp1",
      shipment_number: "SHP-1",
      status: "delivered",
      signature: "Jane Doe",
      tracking_number: "T1",
      reference: "REF-9",
      total_items: 2,
    });
    expect(body).not.toHaveProperty("signatureData");
    expect(body.items[0]).toMatchObject({
      item_id: "itm1",
      quantity_shipped: 5,
      item: { id: "itm1", name: "Flour", item_number: "FLR-001" },
    });
  });

  it("returns 404 when the shipment does not exist", async () => {
    vi.mocked(database.shipment.findFirst).mockResolvedValue(null as never);

    const res = await GET(new NextRequest("http://x/api/shipments/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(res.status).toBe(404);
    // The select narrowing is still applied on the miss path (projection cost
    // is paid even when the row is absent).
    const select = vi.mocked(database.shipment.findFirst).mock.calls[0]?.[0]
      ?.select as Record<string, unknown> | undefined;
    expect(select).toBeDefined();
    expect(select).not.toHaveProperty("signatureData");
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(new NextRequest("http://x/api/shipments/shp1"), {
      params: Promise.resolve({ id: "shp1" }),
    });
    expect(res.status).toBe(401);
    expect(database.shipment.findFirst).not.toHaveBeenCalled();
  });
});
