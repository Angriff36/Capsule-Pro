// Delete driver (soft delete)
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
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { driverId } = await request.json();
    if (!driverId) return manifestErrorResponse("driverId is required", 400);

    await database.driver.update({
      where: { tenantId_id: { tenantId, id: driverId } },
      data: { deletedAt: new Date() },
    });

    return manifestSuccessResponse({ deleted: true });
  } catch (error) {
    captureException(error);
    log.error("Error deleting driver:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
