// List procurement budgets with calculated spend and alerts
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const fiscalYear = searchParams.get("fiscalYear");
    const status = searchParams.get("status") || "active";

    const budgets = await database.$queryRawUnsafe(`
      SELECT
        b.*,
        COALESCE(a.unacknowledged_alerts, 0)::int as unacknowledged_alert_count
      FROM tenant_inventory.procurement_budgets b
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as unacknowledged_alerts
        FROM tenant_inventory.procurement_budget_alerts ba
        WHERE ba.budget_id = b.id AND ba.tenant_id = b.tenant_id
          AND ba.is_acknowledged = false AND ba.deleted_at IS NULL
      ) a ON true
      WHERE b.tenant_id = $1::uuid AND b.deleted_at IS NULL
        ${status !== "all" ? "AND b.status = $2" : ""}
        ${fiscalYear ? (status !== "all" ? "AND b.fiscal_year = $3" : "AND b.fiscal_year = $2") : ""}
      ORDER BY b.category NULLS LAST, b.name
    `, fiscalYear
      ? (status !== "all" ? [tenantId, status, parseInt(fiscalYear)] : [tenantId, parseInt(fiscalYear)])
      : (status !== "all" ? [tenantId, status] : [tenantId])
    );

    return manifestSuccessResponse({ budgets });
  } catch (error) {
    console.error("Error listing budgets:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
