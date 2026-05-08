// Soft-delete top-level facility
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

    const { facilityId } = await request.json();
    if (!facilityId) {
      return manifestErrorResponse("facilityId is required", 400);
    }

    await database.$queryRaw`
      UPDATE tenant_facilities.facilities
      SET deleted_at = NOW(), status = 'inactive'
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${facilityId}::uuid
        AND deleted_at IS NULL
    `;

    return manifestSuccessResponse({ success: true });
  } catch (error) {
    captureException(error);
    log.error("Error deleting facility:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
