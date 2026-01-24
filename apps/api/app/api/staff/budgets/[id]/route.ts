import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  deleteLaborBudget,
  getLaborBudgetById,
  updateLaborBudget,
} from "@/lib/staff/labor-budget";

/**
 * GET /api/staff/budgets/[id]
 * Get a single labor budget by ID with current utilization
 */
export async function GET(
  request: Request,
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

/**
 * PUT /api/staff/budgets/[id]
 * Update a labor budget
 *
 * Optional fields:
 * - name
 * - description
 * - budgetTarget
 * - status
 * - overrideReason
 * - threshold80Pct
 * - threshold90Pct
 * - threshold100Pct
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;
  const body = await request.json();

  // Validate budget target if provided
  if (body.budgetTarget !== undefined && body.budgetTarget <= 0) {
    return NextResponse.json(
      { message: "Budget target must be greater than 0" },
      { status: 400 }
    );
  }

  // Validate status if provided
  if (body.status && !["active", "paused", "archived"].includes(body.status)) {
    return NextResponse.json(
      { message: "Status must be one of: active, paused, archived" },
      { status: 400 }
    );
  }

  try {
    const budget = await updateLaborBudget(tenantId, id, {
      name: body.name,
      description: body.description,
      budgetTarget: body.budgetTarget,
      status: body.status,
      overrideReason: body.overrideReason,
      threshold80Pct: body.threshold80Pct,
      threshold90Pct: body.threshold90Pct,
      threshold100Pct: body.threshold100Pct,
    });

    if (!budget) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ budget });
  } catch (error) {
    console.error("Error updating labor budget:", error);
    return NextResponse.json(
      { message: "Failed to update labor budget" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/staff/budgets/[id]
 * Delete (soft delete) a labor budget
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  try {
    await deleteLaborBudget(tenantId, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting labor budget:", error);
    return NextResponse.json(
      { message: "Failed to delete labor budget" },
      { status: 500 }
    );
  }
}
