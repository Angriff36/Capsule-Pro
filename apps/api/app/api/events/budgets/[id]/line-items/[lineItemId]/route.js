/**
 * Individual Budget Line Item API Endpoints
 *
 * GET    /api/events/budgets/[id]/line-items/[lineItemId]      - Get a specific line item
 * PUT    /api/events/budgets/[id]/line-items/[lineItemId]      - Update a line item
 * DELETE /api/events/budgets/[id]/line-items/[lineItemId]      - Delete a line item
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../../../validation");
/**
 * GET /api/events/budgets/[id]/line-items/[lineItemId]
 * Get a specific line item
 */
async function GET(request, context) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { id: budgetId, lineItemId } = await context.params;
    const lineItem = await database_1.database.budgetLineItem.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: lineItemId,
        },
        deletedAt: null,
      },
    });
    if (!lineItem || lineItem.budgetId !== budgetId) {
      return server_2.NextResponse.json(
        { message: "Line item not found" },
        { status: 404 }
      );
    }
    return server_2.NextResponse.json(lineItem);
  } catch (error) {
    console.error("Error fetching budget line item:", error);
    return server_2.NextResponse.json(
      { message: "Failed to fetch budget line item" },
      { status: 500 }
    );
  }
}
/**
 * PUT /api/events/budgets/[id]/line-items/[lineItemId]
 * Update a line item
 */
async function PUT(request, context) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { id: budgetId, lineItemId } = await context.params;
    const body = await request.json();
    // Validate request body
    const validatedData = (0, validation_1.validateUpdateBudgetLineItem)(body);
    // Check if line item exists and belongs to the budget
    const existingLineItem =
      await database_1.database.budgetLineItem.findUnique({
        where: {
          tenantId_id: {
            tenantId,
            id: lineItemId,
          },
          deletedAt: null,
        },
      });
    if (!existingLineItem || existingLineItem.budgetId !== budgetId) {
      return server_2.NextResponse.json(
        { message: "Line item not found" },
        { status: 404 }
      );
    }
    // Prepare update data
    const updateData = {};
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
    const updatedLineItem = await database_1.database.budgetLineItem.update({
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
    return server_2.NextResponse.json(updatedLineItem);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "ZodError") {
        return server_2.NextResponse.json(
          { message: "Validation error", errors: error },
          { status: 400 }
        );
      }
      if (error instanceof invariant_1.InvariantError) {
        return server_2.NextResponse.json(
          { message: error.message },
          { status: 400 }
        );
      }
    }
    console.error("Error updating budget line item:", error);
    return server_2.NextResponse.json(
      { message: "Failed to update budget line item" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/events/budgets/[id]/line-items/[lineItemId]
 * Delete a line item
 */
async function DELETE(request, context) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { id: budgetId, lineItemId } = await context.params;
    // Check if line item exists and belongs to the budget
    const existingLineItem =
      await database_1.database.budgetLineItem.findUnique({
        where: {
          tenantId_id: {
            tenantId,
            id: lineItemId,
          },
          deletedAt: null,
        },
      });
    if (!existingLineItem || existingLineItem.budgetId !== budgetId) {
      return server_2.NextResponse.json(
        { message: "Line item not found" },
        { status: 404 }
      );
    }
    // Soft delete line item
    const deletedAt = new Date();
    await database_1.database.budgetLineItem.update({
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
    return server_2.NextResponse.json({
      message: "Line item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting budget line item:", error);
    return server_2.NextResponse.json(
      { message: "Failed to delete budget line item" },
      { status: 500 }
    );
  }
}
/**
 * Helper function to update budget totals after line item changes
 */
async function updateBudgetTotals(tenantId, budgetId) {
  // Fetch all line items
  const lineItems = await database_1.database.budgetLineItem.findMany({
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
  await database_1.database.eventBudget.update({
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
