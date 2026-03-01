import { auth } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
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
    console.error("Error fetching labor budget:", error);
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
  return executeManifestCommand(request, {
    entityName: "LaborBudget",
    commandName: "update",
    params: { id },
    transformBody: (body) => ({
      id,
      locationId: body.locationId || "",
      periodStart: body.periodStart || "",
      periodEnd: body.periodEnd || "",
      budgetAmount: body.budgetAmount ?? body.amount ?? 0,
      budgetType: body.budgetType || body.type || "weekly",
      notes: body.notes || "",
    }),
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return executeManifestCommand(request, {
    entityName: "LaborBudget",
    commandName: "softDelete",
    params: { id },
    transformBody: () => ({ id }),
  });
}
