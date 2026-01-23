/**
 * Individual Event Budget API Endpoints
 *
 * GET    /api/events/budgets/[id]      - Get a single budget by ID
 * PUT    /api/events/budgets/[id]      - Update a budget
 * DELETE /api/events/budgets/[id]      - Soft delete a budget
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { EventBudgetStatus, UpdateBudgetRequest } from "../types";
import {
  validateBudgetStatus,
  validateBudgetStatusTransition,
  verifyEditableBudget,
} from "../validation";

type Params = Promise<{ id: string }>;

/**
 * GET /api/events/budgets/[id]
 * Get a single budget by ID with line items and event details
 */
export async function GET(request: Request, { params }: { params: Params }) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;
    invariant(id, "Budget ID is required");

    // Get budget with line items
    const budget = await database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        event_id: string;
        version: number;
        status: string;
        total_budget_amount: string;
        total_actual_amount: string;
        variance_amount: string;
        variance_percentage: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT
          id,
          tenant_id,
          event_id,
          version,
          status,
          total_budget_amount::text,
          total_actual_amount::text,
          variance_amount::text,
          variance_percentage::text,
          notes,
          created_at,
          updated_at
        FROM tenant_events.event_budgets
        WHERE id = ${id}
          AND tenant_id = ${tenantId}
          AND deleted_at IS NULL
      `
    );

    if (!budget[0]) {
      return NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      );
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
        WHERE budget_id = ${id}
          AND tenant_id = ${tenantId}
          AND deleted_at IS NULL
        ORDER BY sort_order ASC, name ASC
      `
    );

    // Get event details
    const event = await database.$queryRaw<
      Array<{
        id: string;
        title: string;
        event_date: Date;
        client_name: string | null;
      }>
    >(
      Prisma.sql`
        SELECT
          e.id,
          e.title,
          e.event_date,
          COALESCE(c.company_name, c.first_name || ' ' || c.last_name) as client_name
        FROM tenant_events.events e
        LEFT JOIN tenant_crm.clients c ON c.tenant_id = e.tenant_id AND c.id = e.client_id AND c.deleted_at IS NULL
        WHERE e.id = ${budget[0].event_id}
          AND e.tenant_id = ${tenantId}
          AND e.deleted_at IS NULL
      `
    );

    return NextResponse.json({
      data: {
        ...budget[0],
        line_items: lineItems,
        event: event[0] || null,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/budgets/[id]
 * Update a budget with validation
 */
export async function PUT(request: Request, { params }: { params: Params }) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;
    const body = await request.json();

    // Validate ID
    invariant(id, "Budget ID is required");

    // Validate request body
    invariant(body, "Request body is required");

    const updateData = body as Partial<UpdateBudgetRequest>;

    // Verify budget exists and is editable
    const { budget, error: budgetError } = await verifyEditableBudget(
      tenantId,
      id
    );
    if (budgetError) {
      return budgetError;
    }

    // Handle status transition if provided
    if (updateData.status !== undefined) {
      const currentStatus = budget!.status as EventBudgetStatus;
      const newStatus = validateBudgetStatus(updateData.status);

      const transitionError = validateBudgetStatusTransition(
        currentStatus,
        newStatus
      );
      if (transitionError) {
        return transitionError;
      }
    }

    // Prepare update data
    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (updateData.version !== undefined) {
      updatePayload.version = updateData.version;
    }

    if (updateData.status !== undefined) {
      updatePayload.status = validateBudgetStatus(updateData.status);
    }

    if (updateData.notes !== undefined) {
      updatePayload.notes = updateData.notes
        ? String(updateData.notes).trim()
        : null;
    }

    // Update budget using raw SQL for composite key
    await database.$queryRaw(
      Prisma.sql`
        UPDATE tenant_events.event_budgets
        SET
          version = COALESCE(${updatePayload.version}, version),
          status = COALESCE(${updatePayload.status}, status),
          notes = COALESCE(${updatePayload.notes}, notes),
          updated_at = NOW()
        WHERE id = ${id}
          AND tenant_id = ${tenantId}
      `
    );

    // Fetch updated budget with line items
    const updatedBudget = await database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        event_id: string;
        version: number;
        status: string;
        total_budget_amount: string;
        total_actual_amount: string;
        variance_amount: string;
        variance_percentage: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
        SELECT
          id,
          tenant_id,
          event_id,
          version,
          status,
          total_budget_amount::text,
          total_actual_amount::text,
          variance_amount::text,
          variance_percentage::text,
          notes,
          created_at,
          updated_at
        FROM tenant_events.event_budgets
        WHERE id = ${id}
          AND tenant_id = ${tenantId}
      `
    );

    // Get line items and event details
    const lineItems = await database.budgetLineItem.findMany({
      where: {
        AND: [{ tenantId }, { budgetId: id }, { deletedAt: null }],
      },
      orderBy: [{ sortOrder: "asc" }],
    });

    const eventData = await database.event.findFirst({
      where: {
        AND: [{ tenantId }, { id: budget!.event_id }, { deletedAt: null }],
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    });

    return NextResponse.json({
      data: {
        ...updatedBudget[0],
        line_items: lineItems,
        event: eventData,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/budgets/[id]
 * Soft delete a budget
 */
export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;

    // Validate ID
    invariant(id, "Budget ID is required");

    // Verify budget exists
    const { budget, error: budgetError } = await verifyEditableBudget(
      tenantId,
      id
    );
    if (budgetError) {
      return budgetError;
    }

    // Additional validation: cannot delete approved budgets
    if (budget!.status === "approved") {
      return NextResponse.json(
        { message: "Cannot delete an approved budget" },
        { status: 400 }
      );
    }

    // Soft delete using raw SQL for composite key
    await database.$queryRaw(
      Prisma.sql`
        UPDATE tenant_events.event_budgets
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
          AND tenant_id = ${tenantId}
      `
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
