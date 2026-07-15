/**
 * GET /api/shipments (list) — over-fetch regression guard.
 *
 * Pins the column-narrowing on the shipments list: the handler maps only 25
 * scalar Shipment columns to the snake_case response, so the findMany now uses
 * a top-level `select` that drops `signatureData` (a base64 signature blob that
 * can run to kilobytes/row) and `reference` from every page. `select` is a
 * column projection (never removes rows), so the response shape is unchanged.
 *
 * The guard asserts the findMany is called WITH a select that omits
 * signatureData/reference and that the mapped fields the UI needs survive.
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
    shipment: { count: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/shipments/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/shipments (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("narrows the findMany to a select that drops the signatureData blob", async () => {
    vi.mocked(database.shipment.count).mockResolvedValue(1);
    vi.mocked(database.shipment.findMany).mockResolvedValue([
      {
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
        totalItems: 3,
        shippingCost: null,
        totalValue: null,
        trackingNumber: "T1",
        carrier: "UPS",
        shippingMethod: "ground",
        deliveredBy: null,
        receivedBy: "r1",
        signatureText: "sig",
        notes: "n",
        internalNotes: "in",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        deletedAt: null,
      } as never,
    ]);

    const res = await GET(
      new NextRequest("http://x/api/shipments?page=1&limit=20")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(database.shipment.findMany).toHaveBeenCalledTimes(1);

    // select is present (regression guard: fails if the narrowing is reverted)
    // and omits the heavy signatureData blob + reference.
    const select = vi.mocked(database.shipment.findMany).mock.calls[0]?.[0]
      ?.select as Record<string, boolean> | undefined;
    expect(select).toBeDefined();
    expect(select).not.toHaveProperty("signatureData");
    expect(select).not.toHaveProperty("reference");
    // the columns the mapping consumes are still projected.
    expect(select?.signatureText).toBe(true);
    expect(select?.shipmentNumber).toBe(true);

    // mapped response shape is unchanged — UI fields survive.
    expect(body.data[0]).toMatchObject({
      id: "shp1",
      shipment_number: "SHP-1",
      status: "delivered",
      signature: "sig",
      tracking_number: "T1",
      total_items: 3,
    });
    expect(body.pagination.total).toBe(1);
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(new NextRequest("http://x/api/shipments"));
    expect(res.status).toBe(401);
    expect(database.shipment.findMany).not.toHaveBeenCalled();
    expect(database.shipment.count).not.toHaveBeenCalled();
  });
});
