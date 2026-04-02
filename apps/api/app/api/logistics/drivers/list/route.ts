// List drivers
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    let statusFilter = "";
    const params: any[] = [tenantId];
    if (status && status !== "all") {
      statusFilter = " AND d.status = $2";
      params.push(status);
    }

    const drivers = await database.$queryRawUnsafe(`
      SELECT
        d.id, d.name, d.phone, d.email, d.license_number, d.license_expiry,
        d.status, d.vehicle_id, d.notes, d.created_at,
        v.make || ' ' || v.model as vehicle_name, v.plate_number
      FROM tenant_logistics.drivers d
      LEFT JOIN tenant_logistics.vehicles v ON v.id = d.vehicle_id
      WHERE d.tenant_id = $1::uuid AND d.deleted_at IS NULL
        ${statusFilter}
      ORDER BY d.name
    `, ...params);

    return manifestSuccessResponse({ drivers });
  } catch (error) {
    console.error("Error listing drivers:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
