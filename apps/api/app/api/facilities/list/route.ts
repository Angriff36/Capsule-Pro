// List top-level facilities for the authenticated tenant.
// Mirrors apps/api/app/api/facilities/assets/list/route.ts: raw SELECT against
// tenant_facilities.facilities, status filter (defaults to "active"; pass
// "all" to bypass), facility-type filter, soft-delete aware. Used by the
// /facilities hub UI to render the post-create list and is the canonical
// read path verified by the New Facility E2E test.
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
    const status = searchParams.get("status") || "active";
    const facilityType = searchParams.get("facilityType");
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const facilities = await database.$queryRaw`
      SELECT
        id, name, code, facility_type, address_line1, address_line2,
        city, state, postal_code, country, phone, status, notes,
        created_at, updated_at
      FROM tenant_facilities.facilities
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        ${status !== "all" ? Prisma.sql`AND status = ${status}` : Prisma.empty}
        ${facilityType ? Prisma.sql`AND facility_type = ${facilityType}` : Prisma.empty}
      ORDER BY name
      LIMIT ${limit} OFFSET ${offset}
    `;

    return manifestSuccessResponse({ facilities, limit, offset });
  } catch (error) {
    captureException(error);
    log.error("Error listing facilities:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
