/**
 * GET /api/logistics/tracking — over-fetch `select` regression guard.
 *
 * The handler maps shipments (+ delivery routes) into a tracking-board payload.
 * Both `shipment.findMany` reads (active + completed) and the
 * `deliveryRoute.findMany` read previously fetched FULL rows — including
 * `Shipment.signatureData` (a base64 signature blob that can run to
 * kilobytes/row), `internalNotes`, `reference`, two Decimal money fields, and
 * the full 15-column `DeliveryRoute` (only 3 columns read). This pins that each
 * read projects ONLY the columns the map consumes. Reverting to an un-narrowed
 * query, or dropping a consumed field, fails this suite loudly.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/database", () => ({
  database: {
    shipment: { findMany: vi.fn() },
    deliveryRoute: { findMany: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: vi.fn(),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/logistics/tracking/route";
import { requireTenantId } from "@/app/lib/tenant";
import { database } from "@/lib/database";

const SHIPMENT_SELECT_KEYS = [
  "id",
  "shipmentNumber",
  "status",
  "eventId",
  "supplierId",
  "locationId",
  "scheduledDate",
  "shippedDate",
  "estimatedDeliveryDate",
  "actualDeliveryDate",
  "totalItems",
  "trackingNumber",
  "carrier",
  "shippingMethod",
  "notes",
  "createdAt",
];

// Heavy / unused Shipment columns that MUST be absent from the projection.
const DROPPED_SHIPMENT_COLUMNS = [
  "signatureData",
  "signatureText",
  "internalNotes",
  "reference",
  "shippingCost",
  "totalValue",
  "deliveredBy",
  "receivedBy",
  "updatedAt",
];

const baseShipment = {
  id: "s1",
  shipmentNumber: "SHP-1",
  status: "in_transit",
  eventId: null,
  supplierId: null,
  locationId: null,
  scheduledDate: new Date("2026-07-14T10:00:00.000Z"),
  shippedDate: new Date("2026-07-14T09:00:00.000Z"),
  estimatedDeliveryDate: new Date("2026-07-14T12:00:00.000Z"),
  actualDeliveryDate: null,
  totalItems: 5,
  trackingNumber: "TRK123",
  carrier: "FedEx",
  shippingMethod: "Express",
  notes: "Side entrance",
  createdAt: new Date("2026-07-14T08:00:00.000Z"),
};

describe("GET /api/logistics/tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTenantId).mockResolvedValue("tenant_test");
    vi.mocked(database.shipment.findMany).mockResolvedValue([
      baseShipment,
    ] as never);
    vi.mocked(database.deliveryRoute.findMany).mockResolvedValue([] as never);
  });

  it("projects only the consumed shipment columns on BOTH active + completed reads", async () => {
    await GET(new NextRequest("http://x/api/logistics/tracking"));

    // Active + completed reads.
    expect(database.shipment.findMany).toHaveBeenCalledTimes(2);
    for (const call of vi.mocked(database.shipment.findMany).mock.calls) {
      const arg = call?.[0] as {
        select?: Record<string, unknown>;
        include?: Record<string, unknown>;
      };
      expect(arg.include).toBeUndefined();
      expect(arg.select).toBeDefined();
      expect(Object.keys(arg.select!).sort()).toEqual(
        [...SHIPMENT_SELECT_KEYS].sort()
      );
      for (const dropped of DROPPED_SHIPMENT_COLUMNS) {
        expect(arg.select![dropped]).toBeUndefined();
      }
    }
  });

  it("projects only eventId/driverId/vehicleId on the delivery-route read", async () => {
    await GET(new NextRequest("http://x/api/logistics/tracking"));

    expect(database.deliveryRoute.findMany).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(database.deliveryRoute.findMany).mock
      .calls[0]?.[0] as {
      select?: Record<string, unknown>;
      include?: Record<string, unknown>;
    };
    expect(arg.include).toBeUndefined();
    expect(arg.select).toBeDefined();
    expect(Object.keys(arg.select!).sort()).toEqual(
      ["driverId", "eventId", "vehicleId"].sort()
    );
    // The other ~12 DeliveryRoute columns are unused here.
    for (const dropped of [
      "description",
      "name",
      "routeNumber",
      "totalDistance",
      "totalDuration",
      "scheduledDate",
      "updatedAt",
    ]) {
      expect(arg.select![dropped]).toBeUndefined();
    }
  });

  it("maps a shipment into the delivery payload shape", async () => {
    const res = await GET(new NextRequest("http://x/api/logistics/tracking"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // active (returned for both reads) + completed (1 each) = 2 deliveries.
    expect(body.deliveries).toHaveLength(2);
    const d = body.deliveries[0];
    expect(d.id).toBe("s1");
    expect(d.shipmentNumber).toBe("SHP-1");
    expect(d.status).toBe("in_transit"); // mapped from shipment.status
    expect(d.items).toBe(5); // mapped from shipment.totalItems
    expect(d.carrier).toBe("FedEx");
    expect(d.trackingNumber).toBe("TRK123");
    expect(d.shippingMethod).toBe("Express");
    // location null → destination falls back to shipment.notes.
    expect(d.destination).toBe("Side entrance");
    expect(d.estimatedArrival).toBe("2026-07-14T12:00:00.000Z");
    expect(d.timeline).toHaveLength(5);
    expect(body.stats.active).toBe(2); // both in_transit
    expect(body.stats.delivered).toBe(0);
  });

  it("early-returns an empty payload and skips the route read when no shipments", async () => {
    vi.mocked(database.shipment.findMany).mockResolvedValue([] as never);

    const res = await GET(new NextRequest("http://x/api/logistics/tracking"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deliveries).toEqual([]);
    expect(body.stats).toEqual({ active: 0, dispatched: 0, delivered: 0 });
    expect(database.deliveryRoute.findMany).not.toHaveBeenCalled();
    expect(database.$queryRaw).not.toHaveBeenCalled();
  });
});
