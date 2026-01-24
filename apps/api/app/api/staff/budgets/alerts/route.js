Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const labor_budget_1 = require("@/lib/staff/labor-budget");
/**
 * GET /api/staff/budgets/alerts
 * Get budget alerts for the tenant
 *
 * Query params:
 * - budgetId: Filter by budget
 * - isAcknowledged: Filter by acknowledgment status
 * - alertType: Filter by alert type (threshold_80, threshold_90, threshold_100, exceeded)
 */
async function GET(request) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { searchParams } = new URL(request.url);
  const budgetId = searchParams.get("budgetId") || undefined;
  const isAcknowledged = searchParams.get("isAcknowledged");
  const alertType = searchParams.get("alertType") || undefined;
  try {
    const alerts = await (0, labor_budget_1.getBudgetAlerts)(tenantId, {
      budgetId,
      isAcknowledged:
        isAcknowledged === "true"
          ? true
          : isAcknowledged === "false"
            ? false
            : undefined,
      alertType,
    });
    return server_2.NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching budget alerts:", error);
    return server_2.NextResponse.json(
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
async function POST(request) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const body = await request.json();
  const { alertId, action } = body;
  if (!alertId) {
    return server_2.NextResponse.json(
      { message: "Alert ID is required" },
      { status: 400 }
    );
  }
  if (!(action && ["acknowledge", "resolve"].includes(action))) {
    return server_2.NextResponse.json(
      { message: "Action must be either 'acknowledge' or 'resolve'" },
      { status: 400 }
    );
  }
  try {
    if (action === "acknowledge") {
      await (0, labor_budget_1.acknowledgeBudgetAlert)(
        tenantId,
        alertId,
        orgId
      );
    } else {
      await (0, labor_budget_1.resolveBudgetAlert)(tenantId, alertId);
    }
    return server_2.NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating budget alert:", error);
    return server_2.NextResponse.json(
      { message: "Failed to update budget alert" },
      { status: 500 }
    );
  }
}
