/**
 * Budget Line Items API Endpoints
 *
 * GET    /api/events/budgets/[id]/line-items      - List line items for a budget
 * POST   /api/events/budgets/[id]/line-items      - Create a new line item
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/budgets/[id]/line-items
 * List line items for a budget
 */
export async function GET(_request: Request, context: RouteContext) {
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
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  console.log("[BudgetLineItem/POST] Delegating to manifest create command", {
    budgetId: id,
  });
  return executeManifestCommand(request, {
    entityName: "BudgetLineItem",
    commandName: "create",
    params: { id },
    transformBody: (body) => ({ ...body, budgetId: id }),
  });
}
