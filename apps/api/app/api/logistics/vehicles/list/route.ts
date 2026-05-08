// List vehicles. Pagination policy is centralized in `@/lib/pagination` so a
// hostile or buggy client cannot request the entire vehicles table for a
// tenant in one round trip.
import { auth } from "@repo/auth/server";
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
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

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
      LIMIT ${limit} OFFSET ${offset}
    `;

    return manifestSuccessResponse({ vehicles, limit, offset });
  } catch (error) {
    captureException(error);
    log.error("Error listing vehicles:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
