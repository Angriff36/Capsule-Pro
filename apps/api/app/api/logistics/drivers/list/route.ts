// List drivers with optional status filter and pagination clamps.
// Pagination policy is centralized in `@/lib/pagination` so a hostile or
// buggy client cannot request the entire drivers table in one round trip.
import { auth } from "@repo/auth/server";
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
    const status = searchParams.get("status");
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    // Build the parameter list dynamically. We always bind tenantId, limit,
    // and offset; the optional status filter adds one extra parameter
    // between tenantId and limit.
    const params: (string | number)[] = [tenantId];
    let statusFilter = "";
    if (status && status !== "all") {
      statusFilter = " AND d.status = $2";
      params.push(status);
    }
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    params.push(limit, offset);

    const drivers = await database.$queryRawUnsafe(
      `
      SELECT
        d.id, d.name, d.phone, d.email, d.license_number, d.license_expiry,
        d.status, d.vehicle_id, d.notes, d.created_at,
        v.make || ' ' || v.model as vehicle_name, v.plate_number
      FROM tenant_logistics.drivers d
      LEFT JOIN tenant_logistics.vehicles v ON v.id = d.vehicle_id
      WHERE d.tenant_id = $1::uuid AND d.deleted_at IS NULL
        ${statusFilter}
      ORDER BY d.name
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
      ...params
    );

    return manifestSuccessResponse({ drivers, limit, offset });
  } catch (error) {
    captureException(error);
    console.error("Error listing drivers:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
