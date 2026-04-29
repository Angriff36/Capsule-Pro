// Soft-delete facility area
import { auth } from "@repo/auth/server";
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

    const { areaId } = await request.json();
    if (!areaId) {
      return manifestErrorResponse("areaId is required", 400);
    }

    await database.$queryRaw`
      UPDATE tenant_facilities.facility_areas
      SET deleted_at = NOW(), status = 'inactive'
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${areaId}::uuid
        AND deleted_at IS NULL
    `;

    return manifestSuccessResponse({ success: true });
  } catch (error) {
    captureException(error);
    console.error("Error deleting facility area:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
