import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { getLaborBudgetById } from "@/lib/staff/labor-budget";

/**
 * GET /api/staff/budgets/[id]
 * Get a single labor budget by ID with current utilization
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  try {
    const budget = await getLaborBudgetById(tenantId, id);

    if (!budget) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ budget });
  } catch (error) {
    log.error("Error fetching labor budget:", error);
    return NextResponse.json(
      { message: "Failed to fetch labor budget" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;
  return runManifestCommand({
    entity: "LaborBudget",
    command: "update",
    body: {
      id,
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);
  return runManifestCommand({
    entity: "LaborBudget",
    command: "softDelete",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
