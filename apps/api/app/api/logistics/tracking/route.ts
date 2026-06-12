// Real-time tracking data for active deliveries
// Returns shipments with route/driver/vehicle info and simulated positions

import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(_request: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Also include yesterday's in-progress shipments
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Fetch active shipments (scheduled, preparing, in_transit) from today/yesterday
    const activeShipments = await database.shipment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ["scheduled", "preparing", "in_transit"] },
        OR: [
          { scheduledDate: { gte: yesterday, lt: tomorrow } },
          { shippedDate: { gte: yesterday } },
        ],
      },
      orderBy: { scheduledDate: "desc" },
      take: 50,
    });

    // Fetch today's completed shipments
    const completedShipments = await database.shipment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: "delivered",
        actualDeliveryDate: { gte: today, lt: tomorrow },
      },
      orderBy: { actualDeliveryDate: "desc" },
      take: 20,
    });

    const allShipments = [...activeShipments, ...completedShipments];

    if (allShipments.length === 0) {
      return manifestSuccessResponse({
        deliveries: [],
        stats: { active: 0, dispatched: 0, delivered: 0 },
      });
    }

    // Get location info for origins/destinations
    const locationIds = [
      ...new Set(
        allShipments.map((s) => s.locationId).filter(Boolean) as string[]
      ),
    ];

    let locationMap: Record<string, { name: string; address?: string }> = {};
    if (locationIds.length > 0) {
      const locations = await database.$queryRaw<
        Array<{ id: string; name: string; address?: string }>
      >`
        SELECT id, name, address
        FROM tenant_inventory.locations
        WHERE tenant_id = ${tenantId}::uuid
          AND id = ANY(${locationIds}::uuid[])
      `;
      locationMap = Object.fromEntries(locations.map((l) => [l.id, l]));
    }

    // Get supplier info
    const supplierIds = [
      ...new Set(
        allShipments.map((s) => s.supplierId).filter(Boolean) as string[]
      ),
    ];

    let supplierMap: Record<string, string> = {};
    if (supplierIds.length > 0) {
      const suppliers = await database.$queryRaw<
        Array<{ id: string; name: string }>
      >`
        SELECT id, name
        FROM tenant_inventory.inventory_suppliers
        WHERE tenant_id = ${tenantId}::uuid
          AND id = ANY(${supplierIds}::uuid[])
      `;
      supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
    }

    // Fetch active delivery routes with driver/vehicle info
    const routes = await database.deliveryRoute.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ["optimized", "in_progress"] },
      },
      include: {
        stops: {
          orderBy: { stopNumber: "asc" },
        },
      },
      take: 20,
    });

    // Get driver and vehicle info for routes
    const driverIds = [
      ...new Set(routes.map((r) => r.driverId).filter(Boolean) as string[]),
    ];
    const vehicleIds = [
      ...new Set(routes.map((r) => r.vehicleId).filter(Boolean) as string[]),
    ];

    let driverMap: Record<string, { name: string; phone: string | null }> = {};
    let vehicleMap: Record<
      string,
      { make: string; model: string; plateNumber?: string }
    > = {};

    if (driverIds.length > 0) {
      const drivers = await database.$queryRaw<
        Array<{ id: string; name: string; phone: string | null }>
      >`
        SELECT id, name, phone
        FROM tenant_logistics.drivers
        WHERE tenant_id = ${tenantId}::uuid
          AND id = ANY(${driverIds}::uuid[])
      `;
      driverMap = Object.fromEntries(drivers.map((d) => [d.id, d]));
    }

    if (vehicleIds.length > 0) {
      const vehicles = await database.$queryRaw<
        Array<{
          id: string;
          make: string;
          model: string;
          plate_number?: string;
        }>
      >`
        SELECT id, make, model, plate_number
        FROM tenant_logistics.vehicles
        WHERE tenant_id = ${tenantId}::uuid
          AND id = ANY(${vehicleIds}::uuid[])
      `;
      vehicleMap = Object.fromEntries(
        vehicles.map((v) => [
          v.id,
          {
            make: v.make,
            model: v.model,
            plateNumber: v.plate_number,
          },
        ])
      );
    }

    // Build delivery objects
    const deliveries = allShipments.map((shipment) => {
      // Find a matching route (by event or shipment association)
      const route = routes.find(
        (r) =>
          r.eventId === shipment.eventId ||
          r.stops.some((s) => s.locationId === shipment.locationId)
      );

      const driver = route?.driverId ? driverMap[route.driverId] : null;
      const vehicle = route?.vehicleId ? vehicleMap[route.vehicleId] : null;

      const location = shipment.locationId
        ? locationMap[shipment.locationId]
        : null;
      const supplier = shipment.supplierId
        ? supplierMap[shipment.supplierId]
        : null;

      // Map shipment status to tracking status
      let trackingStatus: string;
      if (shipment.status === "delivered") {
        trackingStatus = "delivered";
      } else if (shipment.status === "in_transit") {
        trackingStatus = "in_transit";
      } else if (shipment.status === "preparing") {
        trackingStatus = "arriving"; // Close enough - preparing means nearly ready
      } else {
        trackingStatus = "dispatched";
      }

      // Build timeline from shipment dates
      const timeline = [
        {
          status: "dispatched",
          timestamp:
            shipment.scheduledDate?.toISOString() ||
            shipment.createdAt.toISOString(),
          description: "Dispatched from warehouse",
          completed: true,
        },
        {
          status: "picked_up",
          timestamp: shipment.shippedDate?.toISOString() || "",
          description: "All items loaded",
          completed: !!shipment.shippedDate,
        },
        {
          status: "in_transit",
          timestamp:
            shipment.status === "in_transit" || shipment.status === "delivered"
              ? new Date().toISOString()
              : "",
          description: "En route to destination",
          completed:
            shipment.status === "in_transit" || shipment.status === "delivered",
        },
        {
          status: "arriving",
          timestamp: "",
          description: "Approaching destination",
          completed: shipment.status === "delivered",
        },
        {
          status: "delivered",
          timestamp: shipment.actualDeliveryDate?.toISOString() || "",
          description: "Delivered and confirmed",
          completed: shipment.status === "delivered",
        },
      ];

      // Simulated position based on status and timestamps
      // In production, this would come from GPS tracking hardware/SDK
      const baseLat = 34.052; // LA default
      const baseLng = -118.243;
      const jitter = (Math.random() - 0.5) * 0.01;

      const position = {
        lat:
          shipment.status === "delivered"
            ? baseLat + 0.05
            : shipment.status === "in_transit"
              ? baseLat + jitter
              : baseLat - 0.02,
        lng:
          shipment.status === "delivered"
            ? baseLng + 0.03
            : shipment.status === "in_transit"
              ? baseLng + jitter
              : baseLng - 0.01,
        heading:
          shipment.status === "in_transit"
            ? Math.floor(Math.random() * 360)
            : 0,
        speed:
          shipment.status === "in_transit"
            ? 20 + Math.floor(Math.random() * 20)
            : 0,
        updatedAt: new Date().toISOString(),
      };

      return {
        id: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        driverName: driver?.name || "Unassigned",
        driverPhone: driver?.phone || null,
        vehicle: vehicle
          ? `${vehicle.make} ${vehicle.model}${vehicle.plateNumber ? ` (${vehicle.plateNumber})` : ""}`
          : "No vehicle assigned",
        status: trackingStatus,
        origin: supplier || "Main Warehouse",
        destination: location?.name || shipment.notes || "Venue",
        estimatedArrival:
          shipment.estimatedDeliveryDate?.toISOString() ||
          shipment.scheduledDate?.toISOString() ||
          "",
        position,
        timeline,
        items: shipment.totalItems,
        carrier: shipment.carrier || null,
        trackingNumber: shipment.trackingNumber || null,
        shippingMethod: shipment.shippingMethod || null,
      };
    });

    const stats = {
      active: deliveries.filter(
        (d) => d.status === "in_transit" || d.status === "arriving"
      ).length,
      dispatched: deliveries.filter((d) => d.status === "dispatched").length,
      delivered: deliveries.filter((d) => d.status === "delivered").length,
    };

    return manifestSuccessResponse({ deliveries, stats });
  } catch (error) {
    captureException(error);
    log.error("Error loading tracking data:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
