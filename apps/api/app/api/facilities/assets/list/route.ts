// List facility assets. Pagination policy is centralized in `@/lib/pagination`
// so a hostile or buggy client cannot request the entire facility-assets
// table for a tenant in one round trip. This route is the canonical read
// path verified by the New Asset E2E backpressure test.

import { auth } from "@repo/auth/server";
import { Prisma } from "@repo/database";
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
    const status = searchParams.get("status") || "active";
    const assetType = searchParams.get("assetType");
    const areaId = searchParams.get("areaId");
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

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
      LIMIT ${limit} OFFSET ${offset}
    `;

    return manifestSuccessResponse({ assets, limit, offset });
  } catch (error) {
    captureException(error);
    log.error("Error listing facility assets:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
