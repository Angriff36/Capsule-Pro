// API route for listing facility areas. Pagination policy is centralized in
// `@/lib/pagination` so a hostile or buggy client cannot request the entire
// facility-areas table for a tenant in one round trip.

import { auth } from "@repo/auth/server";
import { Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { clampLimit, clampOffset } from "@/lib/pagination";
import { log } from "@repo/observability/log";

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
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const areas = await database.$queryRaw`
      SELECT
        id, venue_id, name, code, "areaType" AS area_type, floor, description,
        square_feet, status, created_at, updated_at
      FROM tenant_facilities.facility_areas
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        ${venueId ? Prisma.sql`AND venue_id = ${venueId}::uuid` : Prisma.empty}
        ${areaType ? Prisma.sql`AND "areaType" = ${areaType}` : Prisma.empty}
        ${status !== "all" ? Prisma.sql`AND status = ${status}` : Prisma.empty}
      ORDER BY name
      LIMIT ${limit} OFFSET ${offset}
    `;

    return manifestSuccessResponse({ areas, limit, offset });
  } catch (error) {
    captureException(error);
    log.error("Error listing facility areas:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
