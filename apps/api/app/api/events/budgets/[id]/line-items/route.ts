/**
 * Budget Line Items API Endpoints
 *
 * GET    /api/events/budgets/[id]/line-items      - List line items for a budget
 * POST   /api/events/budgets/[id]/line-items      - Create a new line item
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { validateCreateBudgetLineItem } from "../../validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/budgets/[id]/line-items
 * List line items for a budget
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: budgetId } = await context.params;

    // Verify budget exists
    const budget = await database.eventBudget.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: budgetId,
        },
        deletedAt: null,
      },
    });

    if (!budget) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }

    // Fetch line items
    const lineItems = await database.budgetLineItem.findMany({
      where: {
        tenantId,
        budgetId,
        deletedAt: null,
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ lineItems });
  } catch (error) {
    console.error("Error fetching budget line items:", error);
    return NextResponse.json(
      { message: "Failed to fetch budget line items" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/budgets/[id]/line-items
 * Create a new line item
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: budgetId } = await context.params;
    const body = await request.json();

    // Validate request body
    const validatedData = validateCreateBudgetLineItem(body);

    // Verify budget exists
    const budget = await database.eventBudget.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: budgetId,
        },
        deletedAt: null,
      },
    });

    if (!budget) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
    }

    // Create line item
    const lineItem = await database.budgetLineItem.create({
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

    return NextResponse.json(lineItem, { status: 201 });
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
    console.error("Error creating budget line item:", error);
    return NextResponse.json(
      { message: "Failed to create budget line item" },
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
