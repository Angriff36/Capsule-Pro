/**
 * Individual Event Budget API Endpoints
 *
 * GET    /api/events/budgets/[id]      - Get a specific budget
 * PUT    /api/events/budgets/[id]      - Update a budget
 * DELETE /api/events/budgets/[id]      - Soft delete a budget
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { validateUpdateEventBudget } from "../validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/budgets/[id]
 * Get a specific budget with line items
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await context.params;

    const budget = await database.eventBudget.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
        deletedAt: null,
      },
      include: {
        lineItems: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!budget) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(budget);
  } catch (error) {
    console.error("Error fetching event budget:", error);
    return NextResponse.json(
      { message: "Failed to fetch event budget" },
      { status: 500 }
    );
  }
}

/**
 * Handle validation and known errors
 */
function handleUpdateErrors(error: unknown): NextResponse | null {
  if (error instanceof Error) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { message: "Validation error", errors: error },
        { status: 400 }
      );
    }
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
  }
  return null;
}

/**
 * Prepare update data from validated budget data
 */
function prepareUpdateData(
  validatedData: unknown,
  existingBudget: any
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  const data = validatedData as {
    status?: string;
    totalBudgetAmount?: number;
    notes?: string;
  };

  if (data.status !== undefined) {
    updateData.status = data.status;
  }
  if (data.totalBudgetAmount !== undefined) {
    updateData.totalBudgetAmount = data.totalBudgetAmount;
    // Recalculate variance
    const newVarianceAmount =
      data.totalBudgetAmount - Number(existingBudget.totalActualAmount);
    updateData.varianceAmount = newVarianceAmount;
    if (data.totalBudgetAmount > 0) {
      updateData.variancePercentage =
        (newVarianceAmount / data.totalBudgetAmount) * 100;
    }
  }
  if (data.notes !== undefined) {
    updateData.notes = data.notes;
  }

  return updateData;
}

/**
 * PUT /api/events/budgets/[id]
 * Update a budget
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await context.params;
    const body = await request.json();

    // Validate request body
    const validatedData = validateUpdateEventBudget(body);

    // Check if budget exists
    const existingBudget = await database.eventBudget.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
        deletedAt: null,
      },
    });

    if (!existingBudget) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }

    // Prepare and apply update
    const updateData = prepareUpdateData(validatedData, existingBudget);

    // Update budget
    const _updatedBudget = await database.eventBudget.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
    });

    // Fetch updated budget with line items
    const budgetWithLineItems = await database.eventBudget.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      include: {
        lineItems: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(budgetWithLineItems);
  } catch (error) {
    const handledError = handleUpdateErrors(error);
    if (handledError) {
      return handledError;
    }
    console.error("Error updating event budget:", error);
    return NextResponse.json(
      { message: "Failed to update event budget" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/budgets/[id]
 * Soft delete a budget
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await context.params;

    // Check if budget exists
    const existingBudget = await database.eventBudget.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
        deletedAt: null,
      },
    });

    if (!existingBudget) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }

    // Soft delete budget (cascade delete should handle line items via schema)
    const deletedAt = new Date();
    await database.eventBudget.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: { deletedAt },
    });

    // Also soft delete line items
    await database.budgetLineItem.updateMany({
      where: {
        tenantId,
        budgetId: id,
      },
      data: { deletedAt },
    });

    return NextResponse.json({ message: "Budget deleted successfully" });
  } catch (error) {
    console.error("Error deleting event budget:", error);
    return NextResponse.json(
      { message: "Failed to delete event budget" },
      { status: 500 }
    );
  }
}
