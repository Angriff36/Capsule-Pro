// List top-level facilities for the authenticated tenant.
// Mirrors apps/api/app/api/facilities/assets/list/route.ts: raw SELECT against
// tenant_facilities.facilities, status filter (defaults to "active"; pass
// "all" to bypass), facility-type filter, soft-delete aware. Used by the
// /facilities hub UI to render the post-create list and is the canonical
// read path verified by the New Facility E2E test.
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
    const status = searchParams.get("status") || "active";
    const facilityType = searchParams.get("facilityType");
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const facilityWhere: Prisma.FacilityWhereInput = {
      tenantId,
      deletedAt: null,
      ...(status !== "all" ? { status } : {}),
      ...(facilityType ? { facilityType } : {}),
    };
    const facilityRecords = await database.facility.findMany({
      where: facilityWhere,
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
    });
    const facilities = facilityRecords.map((facility) => ({
      id: facility.id,
      name: facility.name,
      code: facility.code,
      facility_type: facility.facilityType,
      address_line1: facility.addressLine1,
      address_line2: facility.addressLine2,
      city: facility.city,
      state: facility.state,
      postal_code: facility.postalCode,
      country: facility.country,
      phone: facility.phone,
      status: facility.status,
      notes: facility.notes,
      created_at: facility.createdAt,
      updated_at: facility.updatedAt,
    }));

    return manifestSuccessResponse({ facilities, limit, offset });
  } catch (error) {
    captureException(error);
    log.error("Error listing facilities:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
