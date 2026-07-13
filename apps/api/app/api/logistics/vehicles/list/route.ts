// List vehicles. Pagination policy is centralized in `@/lib/pagination` so a
// hostile or buggy client cannot request the entire vehicles table for a
// tenant in one round trip.
import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { clampLimit, clampOffset } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const vehicleRecords = await database.vehicle.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ make: "asc" }, { model: "asc" }],
      take: limit,
      skip: offset,
    });
    // One grouped count for the whole page instead of one `count` per vehicle
    // (the prior `Promise.all` of N `driver.count` calls was an N+1 that scaled
    // with page size). `Driver.vehicleId` is nullable, so null keys (unassigned
    // drivers) are already excluded by the `in` filter and skipped defensively.
    const driverCountByVehicle = new Map<string, number>();
    if (vehicleRecords.length > 0) {
      const driverCountRows = await database.driver.groupBy({
        by: ["vehicleId"],
        where: {
          tenantId,
          deletedAt: null,
          status: { not: "inactive" },
          vehicleId: { in: vehicleRecords.map((vehicle) => vehicle.id) },
        },
        _count: { vehicleId: true },
      });
      for (const row of driverCountRows) {
        if (row.vehicleId !== null) {
          driverCountByVehicle.set(row.vehicleId, row._count.vehicleId);
        }
      }
    }
    const vehicles = vehicleRecords.map((vehicle) => ({
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      plate_number: vehicle.plateNumber,
      vin: vehicle.vin,
      capacity_weight: vehicle.capacityWeight,
      capacity_volume: vehicle.capacityVolume,
      fuel_type: vehicle.fuelType,
      mileage: vehicle.mileage,
      status: vehicle.status,
      notes: vehicle.notes,
      created_at: vehicle.createdAt,
      assigned_drivers: driverCountByVehicle.get(vehicle.id) ?? 0,
    }));

    return manifestSuccessResponse({ vehicles, limit, offset });
  } catch (error) {
    captureException(error);
    log.error("Error listing vehicles:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
