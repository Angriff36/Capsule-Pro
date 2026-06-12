import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { getLaborBudgets } from "@/lib/staff/labor-budget";

/**
 * GET /api/staff/budgets
 * List all labor budgets for the tenant
 *
 * Query params:
 * - locationId: Filter by location
 * - eventId: Filter by event
 * - budgetType: Filter by budget type (event, week, month)
 * - status: Filter by status (active, paused, archived)
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const locationId = searchParams.get("locationId") || undefined;
  const eventId = searchParams.get("eventId") || undefined;
  const budgetType = searchParams.get("budgetType") || undefined;
  const status = searchParams.get("status") || undefined;

  try {
    const budgets = await getLaborBudgets(tenantId, {
      locationId,
      eventId,
      budgetType,
      status,
    });

    return NextResponse.json({ budgets });
  } catch (error) {
    log.error("Error fetching labor budgets:", error);
    return NextResponse.json(
      { message: "Failed to fetch labor budgets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;
  return runManifestCommand({
    entity: "LaborBudget",
    command: "create",
    body: {
      locationId: rawBody.locationId || "",
      periodStart: rawBody.periodStart || "",
      periodEnd: rawBody.periodEnd || "",
      budgetTarget: rawBody.budgetTarget ?? rawBody.budgetAmount ?? rawBody.amount ?? 0,
      budgetType: rawBody.budgetType || rawBody.type || "weekly",
      description: rawBody.description ?? rawBody.notes ?? "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
