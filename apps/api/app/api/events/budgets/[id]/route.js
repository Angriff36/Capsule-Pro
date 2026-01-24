/**
 * Individual Event Budget API Endpoints
 *
 * GET    /api/events/budgets/[id]      - Get a specific budget
 * PUT    /api/events/budgets/[id]      - Update a budget
 * DELETE /api/events/budgets/[id]      - Soft delete a budget
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
const validation_1 = require("../validation");
/**
 * GET /api/events/budgets/[id]
 * Get a specific budget with line items
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
    const { id } = await context.params;
    const budget = await database_1.database.eventBudget.findUnique({
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
      return server_2.NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }
    return server_2.NextResponse.json(budget);
  } catch (error) {
    console.error("Error fetching event budget:", error);
    return server_2.NextResponse.json(
      { message: "Failed to fetch event budget" },
      { status: 500 }
    );
  }
}
/**
 * PUT /api/events/budgets/[id]
 * Update a budget
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
    const { id } = await context.params;
    const body = await request.json();
    // Validate request body
    const validatedData = (0, validation_1.validateUpdateEventBudget)(body);
    // Check if budget exists
    const existingBudget = await database_1.database.eventBudget.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
        deletedAt: null,
      },
    });
    if (!existingBudget) {
      return server_2.NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }
    // Prepare update data
    const updateData = {};
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }
    if (validatedData.totalBudgetAmount !== undefined) {
      updateData.totalBudgetAmount = validatedData.totalBudgetAmount;
      // Recalculate variance
      const newVarianceAmount =
        validatedData.totalBudgetAmount -
        Number(existingBudget.totalActualAmount);
      updateData.varianceAmount = newVarianceAmount;
      if (validatedData.totalBudgetAmount > 0) {
        updateData.variancePercentage =
          (newVarianceAmount / validatedData.totalBudgetAmount) * 100;
      }
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }
    // Update budget
    const updatedBudget = await database_1.database.eventBudget.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
    });
    // Fetch updated budget with line items
    const budgetWithLineItems =
      await database_1.database.eventBudget.findUnique({
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
    return server_2.NextResponse.json(budgetWithLineItems);
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
    console.error("Error updating event budget:", error);
    return server_2.NextResponse.json(
      { message: "Failed to update event budget" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/events/budgets/[id]
 * Soft delete a budget
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
    const { id } = await context.params;
    // Check if budget exists
    const existingBudget = await database_1.database.eventBudget.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
        deletedAt: null,
      },
    });
    if (!existingBudget) {
      return server_2.NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }
    // Soft delete budget (cascade delete should handle line items via schema)
    const deletedAt = new Date();
    await database_1.database.eventBudget.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: { deletedAt },
    });
    // Also soft delete line items
    await database_1.database.budgetLineItem.updateMany({
      where: {
        tenantId,
        budgetId: id,
      },
      data: { deletedAt },
    });
    return server_2.NextResponse.json({
      message: "Budget deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event budget:", error);
    return server_2.NextResponse.json(
      { message: "Failed to delete event budget" },
      { status: 500 }
    );
  }
}
