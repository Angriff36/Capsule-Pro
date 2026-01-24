/**
 * Budget Line Items API Endpoints
 *
 * GET    /api/events/budgets/[id]/line-items      - List line items for a budget
 * POST   /api/events/budgets/[id]/line-items      - Create a new line item
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../../validation");
/**
 * GET /api/events/budgets/[id]/line-items
 * List line items for a budget
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
    const { id: budgetId } = await context.params;
    // Verify budget exists
    const budget = await database_1.database.eventBudget.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: budgetId,
        },
        deletedAt: null,
      },
    });
    if (!budget) {
      return server_2.NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }
    // Fetch line items
    const lineItems = await database_1.database.budgetLineItem.findMany({
      where: {
        tenantId,
        budgetId,
        deletedAt: null,
      },
      orderBy: { sortOrder: "asc" },
    });
    return server_2.NextResponse.json({ lineItems });
  } catch (error) {
    console.error("Error fetching budget line items:", error);
    return server_2.NextResponse.json(
      { message: "Failed to fetch budget line items" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/events/budgets/[id]/line-items
 * Create a new line item
 */
async function POST(request, context) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { id: budgetId } = await context.params;
    const body = await request.json();
    // Validate request body
    const validatedData = (0, validation_1.validateCreateBudgetLineItem)(body);
    // Verify budget exists
    const budget = await database_1.database.eventBudget.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: budgetId,
        },
        deletedAt: null,
      },
    });
    if (!budget) {
      return server_2.NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }
    // Create line item
    const lineItem = await database_1.database.budgetLineItem.create({
      data: {
        tenantId,
        budgetId,
        category: validatedData.category,
        name: validatedData.name,
        description: validatedData.description || null,
        budgetedAmount: validatedData.budgetedAmount,
        actualAmount: 0,
        varianceAmount: validatedData.budgetedAmount,
        sortOrder: validatedData.sortOrder || 0,
        notes: validatedData.notes || null,
      },
    });
    // Update budget totals
    await updateBudgetTotals(tenantId, budgetId);
    return server_2.NextResponse.json(lineItem, { status: 201 });
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
    console.error("Error creating budget line item:", error);
    return server_2.NextResponse.json(
      { message: "Failed to create budget line item" },
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
