// Assign driver to route

import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { log } from "@repo/observability/log";

export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();

    const body = await request.json();
    const { routeId, driverId, vehicleId } = body;

    if (!routeId) {
      return manifestErrorResponse("routeId is required", 400);
    }

    // Verify route exists and belongs to tenant
    const existingRoute = await database.deliveryRoute.findFirst({
      where: { tenantId, id: routeId, deletedAt: null },
    });

    if (!existingRoute) {
      return manifestErrorResponse("Route not found", 404);
    }

    if (
      existingRoute.status === "completed" ||
      existingRoute.status === "cancelled"
    ) {
      return manifestErrorResponse(
        "Cannot assign driver to completed or cancelled route",
        400
      );
    }

    // Verify driver exists and is available (if driverId provided)
    if (driverId) {
      const driver = await database.$queryRaw<
        Array<{ id: string; status: string; vehicle_id: string | null }>
      >`
        SELECT id, status, vehicle_id
        FROM tenant_logistics.drivers
        WHERE tenant_id = ${tenantId}::uuid
          AND id = ${driverId}::uuid
          AND deleted_at IS NULL
      `;

      if (!driver.length) {
        return manifestErrorResponse("Driver not found", 404);
      }

      // If driver has a default vehicle and no vehicle specified, use driver's vehicle
      const effectiveVehicleId = vehicleId || driver[0].vehicle_id;

      // Update route with driver and vehicle
      const updatedRoute = await database.deliveryRoute.update({
        where: { tenantId_id: { tenantId, id: routeId } },
        data: {
          driverId,
          vehicleId: effectiveVehicleId,
        },
      });

      // If route is in_progress, update driver status to on_route. The
      // tenant_id filter prevents a cross-tenant write if a UUID happens to
      // collide across tenants.
      if (existingRoute.status === "in_progress") {
        await database.$executeRaw`
          UPDATE tenant_logistics.drivers
          SET status = 'on_route', updated_at = NOW()
          WHERE tenant_id = ${tenantId}::uuid
            AND id = ${driverId}::uuid
        `;
      }

      return manifestSuccessResponse({ route: updatedRoute });
    }

    // If driverId is null/empty, unassign driver
    const updatedRoute = await database.deliveryRoute.update({
      where: { tenantId_id: { tenantId, id: routeId } },
      data: {
        driverId: null,
        vehicleId: vehicleId || null,
      },
    });

    return manifestSuccessResponse({ route: updatedRoute });
  } catch (error) {
    captureException(error);
    log.error("Error assigning driver:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
