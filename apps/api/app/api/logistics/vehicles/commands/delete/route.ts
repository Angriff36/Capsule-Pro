// Soft-delete vehicle
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { log } from "@repo/observability/log";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { vehicleId } = await request.json();
    if (!vehicleId) {
      return manifestErrorResponse("vehicleId is required", 400);
    }

    await database.$queryRaw`
      UPDATE tenant_logistics.vehicles
      SET deleted_at = NOW(), status = 'decommissioned'
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${vehicleId}::uuid
        AND deleted_at IS NULL
    `;

    return manifestSuccessResponse({ success: true });
  } catch (error) {
    captureException(error);
    log.error("Error deleting vehicle:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
