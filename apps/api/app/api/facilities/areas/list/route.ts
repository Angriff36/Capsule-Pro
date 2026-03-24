// API route for listing facility areas
import { Prisma } from "@repo/database";
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

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
    const venueId = searchParams.get("venueId");
    const areaType = searchParams.get("areaType");
    const status = searchParams.get("status") || "active";

    const areas = await database.$queryRaw`
      SELECT 
        id, venue_id, name, code, area_type, floor, description,
        square_feet, status, created_at, updated_at
      FROM tenant_facilities.facility_areas
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        ${venueId ? Prisma.sql`AND venue_id = ${venueId}::uuid` : Prisma.empty}
        ${areaType ? Prisma.sql`AND area_type = ${areaType}` : Prisma.empty}
        ${status !== "all" ? Prisma.sql`AND status = ${status}` : Prisma.empty}
      ORDER BY name
    `;

    return manifestSuccessResponse({ areas });
  } catch (error) {
    console.error("Error listing facility areas:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}