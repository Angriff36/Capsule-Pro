// List vehicles
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const vehicles = await database.$queryRaw`
      SELECT
        v.id, v.make, v.model, v.year, v.plate_number, v.vin,
        v.capacity_weight, v.capacity_volume, v.fuel_type, v.mileage,
        v.status, v.notes, v.created_at,
        (SELECT COUNT(*)::int FROM tenant_logistics.drivers d
         WHERE d.vehicle_id = v.id AND d.deleted_at IS NULL AND d.status != 'inactive') as assigned_drivers
      FROM tenant_logistics.vehicles v
      WHERE v.tenant_id = ${tenantId}::uuid AND v.deleted_at IS NULL
      ORDER BY v.make, v.model
    `;

    return manifestSuccessResponse({ vehicles });
  } catch (error) {
    console.error("Error listing vehicles:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
