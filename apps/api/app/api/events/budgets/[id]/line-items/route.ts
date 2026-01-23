/**
 * Budget Line Items API Endpoints
 *
 * GET    /api/events/budgets/[id]/line-items      - List line items for a budget
 * POST   /api/events/budgets/[id]/line-items      - Add a line item to budget
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateLineItemRequest } from "../../types";
import {
  validateBudgetCategory,
  validateLineItemAmount,
  verifyEditableBudget,
} from "../../validation";

type Params = Promise<{ id: string }>;

/**
 * GET /api/events/budgets/[id]/line-items
 * List line items for a budget
 */
export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: budgetId } = await params;
    invariant(budgetId, "Budget ID is required");

    // Verify budget exists
    const { budget, error: budgetError } = await verifyEditableBudget(
      tenantId,
      budgetId
    );
    if (budgetError) {
      return budgetError;
    }

    // Get line items
    const lineItems = await database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        budget_id: string;
        category: string;
        name: string;
        description: string | null;
        budgeted_amount: string;
        actual_amount: string;
        variance_amount: string;
        sort_order: number;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT
          id,
          tenant_id,
          budget_id,
          category,
          name,
          description,
          budgeted_amount::text,
          actual_amount::text,
          variance_amount::text,
          sort_order,
          notes,
          created_at,
          updated_at
        FROM tenant_events.budget_line_items
        WHERE budget_id = ${budgetId}
          AND tenant_id = ${tenantId}
          AND deleted_at IS NULL
        ORDER BY sort_order ASC, category ASC, name ASC
      `
    );

    return NextResponse.json({ data: lineItems });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing line items:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/budgets/[id]/line-items
 * Add a line item to budget
 */
export async function POST(request: Request, { params }: { params: Params }) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: budgetId } = await params;
    const body = await request.json();

    // Validate budget ID
    invariant(budgetId, "Budget ID is required");

    // Verify budget exists and is editable
    const { budget, error: budgetError } = await verifyEditableBudget(
      tenantId,
      budgetId
    );
    if (budgetError) {
      return budgetError;
    }

    // Validate request body
    invariant(body, "Request body is required");
    invariant(body.name, "Line item name is required");
    invariant(body.category, "Line item category is required");

    const data = body as CreateLineItemRequest;

    // Validate category
    validateBudgetCategory(data.category);

    // Validate amounts
    const budgetedError = validateLineItemAmount(
      data.budgetedAmount,
      "budgetedAmount"
    );
    if (budgetedError) return budgetedError;

    if (data.actualAmount !== undefined) {
      const actualError = validateLineItemAmount(
        data.actualAmount,
        "actualAmount"
      );
      if (actualError) return actualError;
    }

    // Determine sort order
    let sortOrder = data.sortOrder ?? 0;

    // If sort order not provided, append to end
    if (data.sortOrder === undefined) {
      const maxSortOrder = await database.$queryRaw<
        Array<{ max_sort_order: bigint }>
      >(
        Prisma.sql`
          SELECT COALESCE(MAX(sort_order), -1) + 1 as max_sort_order
          FROM tenant_events.budget_line_items
          WHERE budget_id = ${budgetId}
            AND tenant_id = ${tenantId}
            AND deleted_at IS NULL
        `
      );

      sortOrder = Number(maxSortOrder[0].max_sort_order);
    }

    // Create line item
    const lineItem = await database.$queryRaw<
      Array<{
        id: string;
        budget_id: string;
        category: string;
        name: string;
        description: string | null;
        budgeted_amount: string;
        actual_amount: string;
        variance_amount: string;
        sort_order: number;
        notes: string | null;
        created_at: Date;
      }>
    >(
      Prisma.sql`
        INSERT INTO tenant_events.budget_line_items (
          tenant_id,
          budget_id,
          category,
          name,
          description,
          budgeted_amount,
          actual_amount,
          sort_order,
          notes
        )
        VALUES (
          ${tenantId},
          ${budgetId},
          ${data.category},
          ${data.name},
          ${data.description || null},
          ${data.budgetedAmount},
          ${data.actualAmount || 0},
          ${sortOrder},
          ${data.notes || null}
        )
        RETURNING
          id,
          budget_id,
          category,
          name,
          description,
          budgeted_amount::text,
          actual_amount::text,
          variance_amount::text,
          sort_order,
          notes,
          created_at
      `
    );

    // Budget totals are automatically updated by trigger

    return NextResponse.json({ data: lineItem[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating line item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
