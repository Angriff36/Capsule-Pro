import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  acknowledgeBudgetAlert,
  getBudgetAlerts,
  resolveBudgetAlert,
} from "@/lib/staff/labor-budget";

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

  try {
    const alerts = await getBudgetAlerts(tenantId, {
      budgetId,
      isAcknowledged:
        isAcknowledged === "true"
          ? true
          : isAcknowledged === "false"
            ? false
            : undefined,
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

/**
 * POST /api/staff/budgets/alerts/acknowledge
 * Acknowledge a budget alert
 *
 * Body:
 * - alertId: Alert ID to acknowledge
 */
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = await request.json();
  const { alertId, action } = body;

  if (!alertId) {
    return NextResponse.json(
      { message: "Alert ID is required" },
      { status: 400 }
    );
  }

  if (!(action && ["acknowledge", "resolve"].includes(action))) {
    return NextResponse.json(
      { message: "Action must be either 'acknowledge' or 'resolve'" },
      { status: 400 }
    );
  }

  try {
    if (action === "acknowledge") {
      await acknowledgeBudgetAlert(tenantId, alertId, orgId);
    } else {
      await resolveBudgetAlert(tenantId, alertId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating budget alert:", error);
    return NextResponse.json(
      { message: "Failed to update budget alert" },
      { status: 500 }
    );
  }
}
