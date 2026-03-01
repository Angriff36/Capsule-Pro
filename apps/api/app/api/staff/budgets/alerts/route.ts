import { auth } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import { getBudgetAlerts } from "@/lib/staff/labor-budget";

/**
 * GET /api/staff/budgets/alerts
 * Get budget alerts for the tenant
 *
 * Query params:
 * - budgetId: Filter by budget
 * - isAcknowledged: Filter by acknowledgment status
 * - alertType: Filter by alert type (threshold_80, threshold_90, threshold_100, exceeded)
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const budgetId = searchParams.get("budgetId") || undefined;
  const isAcknowledged = searchParams.get("isAcknowledged");
  const alertType = searchParams.get("alertType") || undefined;

  let acknowledgedFilter: boolean | undefined;
  if (isAcknowledged === "true") {
    acknowledgedFilter = true;
  } else if (isAcknowledged === "false") {
    acknowledgedFilter = false;
  } else {
    acknowledgedFilter = undefined;
  }

  try {
    const alerts = await getBudgetAlerts(tenantId, {
      budgetId,
      isAcknowledged: acknowledgedFilter,
      alertType,
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching budget alerts:", error);
    return NextResponse.json(
      { message: "Failed to fetch budget alerts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.clone().json();
  const action = body.action || "acknowledge";
  const commandName = action === "resolve" ? "resolve" : "acknowledge";

  return executeManifestCommand(request, {
    entityName: "BudgetAlert",
    commandName,
    transformBody: (body, ctx) => ({
      id: body.alertId || body.id || "",
      acknowledgedBy: ctx.userId,
    }),
  });
}
