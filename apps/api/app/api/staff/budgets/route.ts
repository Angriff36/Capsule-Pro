import { auth } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
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
    console.error("Error fetching labor budgets:", error);
    return NextResponse.json(
      { message: "Failed to fetch labor budgets" },
      { status: 500 }
    );
  }
}

export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "LaborBudget",
    commandName: "create",
    transformBody: (body, ctx) => ({
      locationId: body.locationId || "",
      periodStart: body.periodStart || "",
      periodEnd: body.periodEnd || "",
      budgetAmount: body.budgetAmount ?? body.amount ?? 0,
      budgetType: body.budgetType || body.type || "weekly",
      notes: body.notes || "",
      createdBy: ctx.userId,
    }),
  });
}
