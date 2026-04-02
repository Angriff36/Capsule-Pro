// List facility assets
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
    const status = searchParams.get("status") || "active";
    const assetType = searchParams.get("assetType");
    const areaId = searchParams.get("areaId");

    const assets = await database.$queryRaw`
      SELECT
        a.id, a.name, a.asset_type, a.serial_number, a.manufacturer,
        a.model, a.purchase_date, a.purchase_cost, a.warranty_expiry,
        a.status, a.area_id, a.notes, a.created_at, a.updated_at,
        fa.name AS area_name, fa.code AS area_code
      FROM tenant_facilities.facility_assets a
      LEFT JOIN tenant_facilities.facility_areas fa
        ON fa.id = a.area_id AND fa.tenant_id = a.tenant_id AND fa.deleted_at IS NULL
      WHERE a.tenant_id = ${tenantId}::uuid
        AND a.deleted_at IS NULL
        ${status !== "all" ? Prisma.sql`AND a.status = ${status}` : Prisma.empty}
        ${assetType ? Prisma.sql`AND a.asset_type = ${assetType}` : Prisma.empty}
        ${areaId ? Prisma.sql`AND a.area_id = ${areaId}::uuid` : Prisma.empty}
      ORDER BY a.name
    `;

    return manifestSuccessResponse({ assets });
  } catch (error) {
    console.error("Error listing facility assets:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
