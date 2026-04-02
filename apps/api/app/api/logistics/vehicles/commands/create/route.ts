// Create vehicle
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const body = await request.json();
    const { make, model, year, plateNumber, vin, capacityWeight, capacityVolume, fuelType, notes } = body;

    if (!make || !model) return manifestErrorResponse("make and model are required", 400);

    const result = await database.$queryRaw`
      INSERT INTO tenant_logistics.vehicles (
        tenant_id, make, model, year, plate_number, vin,
        capacity_weight, capacity_volume, fuel_type, status, notes
      ) VALUES (
        ${tenantId}::uuid, ${make}, ${model}, ${year || null},
        ${plateNumber || null}, ${vin || null},
        ${capacityWeight || null}, ${capacityVolume || null},
        ${fuelType || null}, 'available', ${notes || null}
      )
      RETURNING id, make, model, status, created_at
    `;

    return manifestSuccessResponse({ vehicle: (result as any[])[0] });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
