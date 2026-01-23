/**
 * Individual Budget Line Item API Endpoints
 *
 * GET    /api/events/budgets/[id]/line-items/[lineItemId]      - Get a single line item
 * PUT    /api/events/budgets/[id]/line-items/[lineItemId]      - Update a line item
 * DELETE /api/events/budgets/[id]/line-items/[lineItemId]      - Delete a line item
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { UpdateLineItemRequest } from "../../types";
import {
  validateBudgetCategory,
  validateLineItemAmount,
  verifyEditableBudget,
  verifyLineItem,
} from "../../validation";

type Params = Promise<{ id: string; lineItemId: string }>;

/**
 * GET /api/events/budgets/[id]/line-items/[lineItemId]
 * Get a single line item
 */
export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: budgetId, lineItemId } = await params;

    invariant(budgetId, "Budget ID is required");
    invariant(lineItemId, "Line item ID is required");

    // Verify budget exists and is editable
    const { budget, error: budgetError } = await verifyEditableBudget(
      tenantId,
      budgetId
    );
    if (budgetError) {
      return budgetError;
    }

    // Verify line item exists and belongs to budget
    const { lineItem, error: lineItemError } = await verifyLineItem(
      tenantId,
      lineItemId,
      budgetId
    );
    if (lineItemError) {
      return lineItemError;
    }

    // Get line item details
    const lineItemDetails = await database.$queryRaw<
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
        WHERE id = ${lineItemId}
          AND tenant_id = ${tenantId}
          AND deleted_at IS NULL
      `
    );

    return NextResponse.json({ data: lineItemDetails[0] });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error fetching line item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/budgets/[id]/line-items/[lineItemId]
 * Update a line item
 */
export async function PUT(request: Request, { params }: { params: Params }) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: budgetId, lineItemId } = await params;
    const body = await request.json();

    invariant(budgetId, "Budget ID is required");
    invariant(lineItemId, "Line item ID is required");
    invariant(body, "Request body is required");

    // Verify budget exists and is editable
    const { budget, error: budgetError } = await verifyEditableBudget(
      tenantId,
      budgetId
    );
    if (budgetError) {
      return budgetError;
    }

    // Verify line item exists and belongs to budget
    const { lineItem, error: lineItemError } = await verifyLineItem(
      tenantId,
      lineItemId,
      budgetId
    );
    if (lineItemError) {
      return lineItemError;
    }

    const updateData = body as Partial<UpdateLineItemRequest>;

    // Validate category if provided
    if (updateData.category !== undefined) {
      validateBudgetCategory(updateData.category);
    }

    // Validate amounts if provided
    if (updateData.budgetedAmount !== undefined) {
      const budgetedError = validateLineItemAmount(
        updateData.budgetedAmount,
        "budgetedAmount"
      );
      if (budgetedError) return budgetedError;
    }

    if (updateData.actualAmount !== undefined) {
      const actualError = validateLineItemAmount(
        updateData.actualAmount,
        "actualAmount"
      );
      if (actualError) return actualError;
    }

    // Build update fields dynamically
    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    if (updateData.category !== undefined) {
      updateFields.push(`category = $${updateValues.length + 1}`);
      updateValues.push(updateData.category);
    }

    if (updateData.name !== undefined) {
      updateFields.push(`name = $${updateValues.length + 1}`);
      updateValues.push(updateData.name);
    }

    if (updateData.description !== undefined) {
      updateFields.push(`description = $${updateValues.length + 1}`);
      updateValues.push(updateData.description || null);
    }

    if (updateData.budgetedAmount !== undefined) {
      updateFields.push(`budgeted_amount = $${updateValues.length + 1}`);
      updateValues.push(updateData.budgetedAmount);
    }

    if (updateData.actualAmount !== undefined) {
      updateFields.push(`actual_amount = $${updateValues.length + 1}`);
      updateValues.push(updateData.actualAmount);
    }

    if (updateData.sortOrder !== undefined) {
      updateFields.push(`sort_order = $${updateValues.length + 1}`);
      updateValues.push(updateData.sortOrder);
    }

    if (updateData.notes !== undefined) {
      updateFields.push(`notes = $${updateValues.length + 1}`);
      updateValues.push(
        updateData.notes ? String(updateData.notes).trim() : null
      );
    }

    // Always update updated_at
    updateFields.push("updated_at = NOW()");

    // Add tenant_id, budget_id, and lineItemId for WHERE clause
    updateValues.push(tenantId);
    updateValues.push(budgetId);
    updateValues.push(lineItemId);

    // Update line item
    await database.$queryRaw(
      Prisma.sql`
        UPDATE tenant_events.budget_line_items
        SET ${Prisma.raw(updateFields.join(", "))}
        WHERE tenant_id = ${tenantId}
          AND budget_id = ${budgetId}
          AND id = ${lineItemId}
          AND deleted_at IS NULL
      `
    );

    // Fetch updated line item
    const updatedLineItem = await database.$queryRaw<
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
        WHERE id = ${lineItemId}
          AND tenant_id = ${tenantId}
      `
    );

    return NextResponse.json({ data: updatedLineItem[0] });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error updating line item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/budgets/[id]/line-items/[lineItemId]
 * Delete a line item
 */
export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: budgetId, lineItemId } = await params;

    invariant(budgetId, "Budget ID is required");
    invariant(lineItemId, "Line item ID is required");

    // Verify budget exists and is editable
    const { budget, error: budgetError } = await verifyEditableBudget(
      tenantId,
      budgetId
    );
    if (budgetError) {
      return budgetError;
    }

    // Verify line item exists and belongs to budget
    const { lineItem, error: lineItemError } = await verifyLineItem(
      tenantId,
      lineItemId,
      budgetId
    );
    if (lineItemError) {
      return lineItemError;
    }

    // Soft delete line item
    await database.$queryRaw(
      Prisma.sql`
        UPDATE tenant_events.budget_line_items
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${lineItemId}
          AND tenant_id = ${tenantId}
      `
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error deleting line item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
