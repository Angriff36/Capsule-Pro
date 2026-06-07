// API route for listing facility areas. Pagination policy is centralized in
// `@/lib/pagination` so a hostile or buggy client cannot request the entire
// facility-areas table for a tenant in one round trip.

import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
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
    const venueId = searchParams.get("venueId");
    const areaType = searchParams.get("areaType");
    const status = searchParams.get("status") || "active";
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const areaWhere: Prisma.FacilityAreaWhereInput = {
      tenantId,
      deletedAt: null,
      ...(venueId ? { venueId } : {}),
      ...(areaType ? { areaType } : {}),
      ...(status !== "all" ? { status } : {}),
    };
    const areaRecords = await database.facilityArea.findMany({
      where: areaWhere,
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
    });
    const areas = areaRecords.map((area) => ({
      id: area.id,
      venue_id: area.venueId,
      name: area.name,
      code: area.code,
      area_type: area.areaType,
      floor: area.floor,
      description: area.description,
      square_feet: area.squareFeet,
      status: area.status,
      created_at: area.createdAt,
      updated_at: area.updatedAt,
    }));

    return manifestSuccessResponse({ areas, limit, offset });
  } catch (error) {
    captureException(error);
    log.error("Error listing facility areas:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
