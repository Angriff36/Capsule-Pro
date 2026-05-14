/**
 * GET /api/crm/deals/list
 * List all proposals as deals for the CRM pipeline view.
 * Alias for GET /api/crm/deals (reuses same implementation).
 */

import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import {
  type NextRequest,
  NextResponse as NextResponseAlias,
} from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { clampLimit, clampOffset } from "@/lib/pagination";
import { listDeals } from "../route";

// Re-export for convenience
export { listDeals, proposalStatusToStage } from "../route";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponseAlias.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponseAlias.json(
        { message: "Tenant not found" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const deals = await listDeals(tenantId, limit, offset);
    return NextResponseAlias.json({ data: deals, limit, offset });
  } catch (error) {
    captureException(error);
    log.error("Error listing deals:", error);
    return NextResponseAlias.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
