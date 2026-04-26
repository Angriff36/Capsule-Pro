// Update vehicle
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const {
      vehicleId,
      make,
      model,
      year,
      plateNumber,
      vin,
      capacityWeight,
      capacityVolume,
      fuelType,
      mileage,
      status,
      notes,
    } = await request.json();
    if (!vehicleId) return manifestErrorResponse("vehicleId is required", 400);

    const result = await database.$queryRaw`
      UPDATE tenant_logistics.vehicles
      SET
        make = COALESCE(${make ?? null}, make),
        model = COALESCE(${model ?? null}, model),
        year = COALESCE(${year ?? null}, year),
        plate_number = COALESCE(${plateNumber ?? null}, plate_number),
        vin = COALESCE(${vin ?? null}, vin),
        capacity_weight = COALESCE(${capacityWeight ?? null}, capacity_weight),
        capacity_volume = COALESCE(${capacityVolume ?? null}, capacity_volume),
        fuel_type = COALESCE(${fuelType ?? null}, fuel_type),
        mileage = COALESCE(${mileage ?? null}, mileage),
        status = COALESCE(${status ?? null}, status),
        notes = COALESCE(${notes ?? null}, notes),
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${vehicleId}::uuid AND deleted_at IS NULL
      RETURNING id, make, model, status
    `;

    if (!(result as any[]).length)
      return manifestErrorResponse("Vehicle not found", 404);

    return manifestSuccessResponse({ vehicle: (result as any[])[0] });
  } catch (error) {
    captureException(error);
    console.error("Error updating vehicle:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
