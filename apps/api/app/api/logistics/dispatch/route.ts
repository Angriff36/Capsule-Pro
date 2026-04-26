// Dispatch board data

import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    // Get today's date range (start and end of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch routes for today (or unassigned routes without a date)
    const routes = await database.deliveryRoute.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          // Routes scheduled for today
          {
            scheduledDate: {
              gte: today,
              lt: tomorrow,
            },
          },
          // Routes without a date that are not completed/cancelled and unassigned
          {
            scheduledDate: null,
            driverId: null,
            status: { notIn: ["completed", "cancelled"] },
          },
        ],
      },
      include: {
        stops: {
          orderBy: { stopNumber: "asc" },
          take: 5, // Just show first 5 stops for preview
        },
      },
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
    });

    // Fetch available drivers
    const driverRecords = await database.driver.findMany({
      where: { tenantId, deletedAt: null, status: "available" },
      include: { vehicle: { select: { make: true, model: true } } },
      orderBy: { name: "asc" },
    });
    const availableDrivers = driverRecords.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      vehicle_id: d.vehicleId,
      vehicle_name: d.vehicle
        ? `${d.vehicle.make} ${d.vehicle.model}`
        : null,
    }));

    // Build driver map for route lookups
    const driverIds = routes.map((r) => r.driverId).filter(Boolean) as string[];

    let driverMap: Record<string, { name: string; phone: string | null }> = {};

    if (driverIds.length > 0) {
      const drivers = await database.driver.findMany({
        where: { tenantId, id: { in: driverIds } },
        select: { id: true, name: true, phone: true },
      });
      driverMap = Object.fromEntries(drivers.map((d) => [d.id, d]));
    }

    // Build vehicle map for route lookups
    const vehicleIds = routes
      .map((r) => r.vehicleId)
      .filter(Boolean) as string[];

    let vehicleMap: Record<string, { make: string; model: string }> = {};

    if (vehicleIds.length > 0) {
      const vehicles = await database.vehicle.findMany({
        where: { tenantId, id: { in: vehicleIds } },
        select: { id: true, make: true, model: true },
      });
      vehicleMap = Object.fromEntries(vehicles.map((v) => [v.id, v]));
    }

    // Compute dispatch status for each route
    const routesWithDispatch = routes.map((route) => {
      let dispatchStatus: string;

      if (route.status === "completed") {
        dispatchStatus = "complete";
      } else if (route.status === "in_progress") {
        dispatchStatus = "in_progress";
      } else if (route.driverId) {
        dispatchStatus = "assigned";
      } else {
        dispatchStatus = "unassigned";
      }

      const driver = route.driverId ? driverMap[route.driverId] : null;
      const vehicle = route.vehicleId ? vehicleMap[route.vehicleId] : null;

      return {
        id: route.id,
        routeNumber: route.routeNumber,
        name: route.name,
        status: route.status,
        dispatchStatus,
        scheduledDate: route.scheduledDate,
        totalDistance: route.totalDistance?.toString() || null,
        totalDuration: route.totalDuration,
        driverId: route.driverId,
        driverName: driver?.name || null,
        driverPhone: driver?.phone || null,
        vehicleId: route.vehicleId,
        vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : null,
        stops: route.stops.map((s) => ({
          id: s.id,
          stopNumber: s.stopNumber,
          name: s.name,
          status: s.status,
        })),
        stopCount: route.stops.length,
      };
    });

    // Compute stats
    const stats = {
      unassigned: routesWithDispatch.filter(
        (r) => r.dispatchStatus === "unassigned"
      ).length,
      assigned: routesWithDispatch.filter(
        (r) => r.dispatchStatus === "assigned"
      ).length,
      inProgress: routesWithDispatch.filter(
        (r) => r.dispatchStatus === "in_progress"
      ).length,
      completed: routesWithDispatch.filter(
        (r) => r.dispatchStatus === "complete"
      ).length,
    };

    return manifestSuccessResponse({
      routes: routesWithDispatch,
      availableDrivers,
      stats,
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
