/**
 * Individual Budget Line Item API Endpoints
 *
 * GET    /api/events/budgets/[id]/line-items/[lineItemId]      - Get a specific line item
 * PUT    /api/events/budgets/[id]/line-items/[lineItemId]      - Update a line item
 * DELETE /api/events/budgets/[id]/line-items/[lineItemId]      - Delete a line item
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { validateUpdateBudgetLineItem } from "../../../validation";

interface RouteContext {
  params: Promise<{ id: string; lineItemId: string }>;
}

/**
 * GET /api/events/budgets/[id]/line-items/[lineItemId]
 * Get a specific line item
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: budgetId, lineItemId } = await context.params;

    const lineItem = await database.budgetLineItem.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: lineItemId,
        },
        deletedAt: null,
      },
    });

    if (!lineItem || lineItem.budgetId !== budgetId) {
      return NextResponse.json(
        { message: "Line item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(lineItem);
  } catch (error) {
    console.error("Error fetching budget line item:", error);
    return NextResponse.json(
      { message: "Failed to fetch budget line item" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/budgets/[id]/line-items/[lineItemId]
 * Update a line item
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: budgetId, lineItemId } = await context.params;
    const body = await request.json();

    // Validate request body
    const validatedData = validateUpdateBudgetLineItem(body);

    // Check if line item exists and belongs to the budget
    const existingLineItem = await database.budgetLineItem.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: lineItemId,
        },
        deletedAt: null,
      },
    });

    if (!existingLineItem || existingLineItem.budgetId !== budgetId) {
      return NextResponse.json(
        { message: "Line item not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (validatedData.category !== undefined) {
      updateData.category = validatedData.category;
    }
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }
    if (validatedData.budgetedAmount !== undefined) {
      updateData.budgetedAmount = validatedData.budgetedAmount;
      // Recalculate variance if actual amount exists
      const actualAmount = Number(existingLineItem.actualAmount);
      const newVarianceAmount = validatedData.budgetedAmount - actualAmount;
      updateData.varianceAmount = newVarianceAmount;
    }
    if (validatedData.actualAmount !== undefined) {
      updateData.actualAmount = validatedData.actualAmount;
      // Recalculate variance
      const budgetedAmount =
        validatedData.budgetedAmount ?? Number(existingLineItem.budgetedAmount);
      const newVarianceAmount = budgetedAmount - validatedData.actualAmount;
      updateData.varianceAmount = newVarianceAmount;
    }
    if (validatedData.sortOrder !== undefined) {
      updateData.sortOrder = validatedData.sortOrder;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    // Update line item
    const updatedLineItem = await database.budgetLineItem.update({
      where: {
        tenantId_id: {
          tenantId,
          id: lineItemId,
        },
      },
      data: updateData,
    });

    // Update budget totals
    await updateBudgetTotals(tenantId, budgetId);

    return NextResponse.json(updatedLineItem);
  } catch (error) {
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
    console.error("Error updating budget line item:", error);
    return NextResponse.json(
      { message: "Failed to update budget line item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/budgets/[id]/line-items/[lineItemId]
 * Delete a line item
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: budgetId, lineItemId } = await context.params;

    // Check if line item exists and belongs to the budget
    const existingLineItem = await database.budgetLineItem.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: lineItemId,
        },
        deletedAt: null,
      },
    });

    if (!existingLineItem || existingLineItem.budgetId !== budgetId) {
      return NextResponse.json(
        { message: "Line item not found" },
        { status: 404 }
      );
    }

    // Soft delete line item
    const deletedAt = new Date();
    await database.budgetLineItem.update({
      where: {
        tenantId_id: {
          tenantId,
          id: lineItemId,
        },
      },
      data: { deletedAt },
    });

    // Update budget totals
    await updateBudgetTotals(tenantId, budgetId);

    return NextResponse.json({ message: "Line item deleted successfully" });
  } catch (error) {
    console.error("Error deleting budget line item:", error);
    return NextResponse.json(
      { message: "Failed to delete budget line item" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to update budget totals after line item changes
 */
async function updateBudgetTotals(tenantId: string, budgetId: string) {
  // Fetch all line items
  const lineItems = await database.budgetLineItem.findMany({
    where: {
      tenantId,
      budgetId,
      deletedAt: null,
    },
  });

  // Calculate totals
  const totalBudgeted = lineItems.reduce(
    (sum, item) => sum + Number(item.budgetedAmount),
    0
  );
  const totalActual = lineItems.reduce(
    (sum, item) => sum + Number(item.actualAmount),
    0
  );
  const varianceAmount = totalBudgeted - totalActual;
  const variancePercentage =
    totalBudgeted > 0 ? (varianceAmount / totalBudgeted) * 100 : 0;

  // Update budget
  await database.eventBudget.update({
    where: {
      tenantId_id: {
        tenantId,
        id: budgetId,
      },
    },
    data: {
      totalBudgetAmount: totalBudgeted,
      totalActualAmount: totalActual,
      varianceAmount,
      variancePercentage,
    },
  });
}
