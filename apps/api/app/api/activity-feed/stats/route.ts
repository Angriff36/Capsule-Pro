// Activity Feed Stats API Route
// Provides statistics about activities for a tenant

import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { getActivityStats } from "@/app/lib/activity-feed-service";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(_request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const stats = await getActivityStats(tenantId);

    return manifestSuccessResponse({ stats });
  } catch (error) {
    captureException(error);
    log.error("Error fetching activity stats:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
