/**
 * Event Budget Validation Helpers
 */

import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { invariant } from "@/app/lib/invariant";
import type { EventBudgetStatus, BudgetCategory } from "./types";
import { EVENT_BUDGET_STATUSES, BUDGET_CATEGORIES } from "./types";

/**
 * Validate budget status
 */
export function validateBudgetStatus(status: string): EventBudgetStatus {
  if (!EVENT_BUDGET_STATUSES.includes(status as EventBudgetStatus)) {
    throw new Error(
      `Invalid budget status: ${status}. Must be one of: ${EVENT_BUDGET_STATUSES.join(", ")}`
    );
  }
  return status as EventBudgetStatus;
}

/**
 * Validate budget category
 */
export function validateBudgetCategory(category: string): BudgetCategory {
  if (!BUDGET_CATEGORIES.includes(category as BudgetCategory)) {
    throw new Error(
      `Invalid budget category: ${category}. Must be one of: ${BUDGET_CATEGORIES.join(", ")}`
    );
  }
  return category as BudgetCategory;
}

/**
 * Verify event exists and belongs to tenant
 */
export async function verifyEvent(
  tenantId: string,
  eventId: string
): Promise<{
  event: { id: string; title: string } | null;
  error: NextResponse | null;
}> {
  const event = await database.$queryRaw<
    Array<{ id: string; title: string }>
  >(
    Prisma.sql`
      SELECT id, title
      FROM tenant_events.events
      WHERE tenant_id = ${tenantId}
        AND id = ${eventId}
        AND deleted_at IS NULL
    `
  );

  if (!event[0]) {
    return {
      event: null,
      error: NextResponse.json(
        { message: "Event not found" },
        { status: 404 }
      ),
    };
  }

  return { event: event[0], error: null };
}

/**
 * Verify budget exists and belongs to tenant
 */
export async function verifyBudget(
  tenantId: string,
  budgetId: string
): Promise<{
  budget: {
    id: string;
    event_id: string;
    status: string;
    deleted_at: Date | null;
  } | null;
  error: NextResponse | null;
}> {
  const budget = await database.$queryRaw<
    Array<{
      id: string;
      event_id: string;
      status: string;
      deleted_at: Date | null;
    }>
  >(
    Prisma.sql`
      SELECT id, event_id, status, deleted_at
      FROM tenant_events.event_budgets
      WHERE tenant_id = ${tenantId}
        AND id = ${budgetId}
    `
  );

  if (!budget[0]) {
    return {
      budget: null,
      error: NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      ),
    };
  }

  if (budget[0].deleted_at) {
    return {
      budget: null,
      error: NextResponse.json(
        { message: "Budget has been deleted" },
        { status: 404 }
      ),
    };
  }

  return { budget: budget[0], error: null };
}

/**
 * Verify budget exists and is editable
 */
export async function verifyEditableBudget(
  tenantId: string,
  budgetId: string
): Promise<{
  budget: {
    id: string;
    event_id: string;
    status: string;
  } | null;
  error: NextResponse | null;
}> {
  const result = await verifyBudget(tenantId, budgetId);

  if (result.error) {
    return result;
  }

  if (!result.budget) {
    return {
      budget: null,
      error: NextResponse.json(
        { message: "Budget not found" },
        { status: 404 }
      ),
    };
  }

  // Check if budget is locked
  if (result.budget.status === "locked") {
    return {
      budget: null,
      error: NextResponse.json(
        { message: "Cannot edit locked budget" },
        { status: 400 }
      ),
    };
  }

  return { budget: result.budget, error: null };
}

/**
 * Validate line item amount is non-negative
 */
export function validateLineItemAmount(
  amount: number,
  fieldName: string = "amount"
): NextResponse | null {
  if (amount < 0) {
    return NextResponse.json(
      { message: `${fieldName} must be non-negative` },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Validate budget transition is allowed
 */
export function validateBudgetStatusTransition(
  currentStatus: EventBudgetStatus,
  newStatus: EventBudgetStatus
): NextResponse | null {
  // Define allowed transitions
  const allowedTransitions: Record<EventBudgetStatus, EventBudgetStatus[]> = {
    draft: ["draft", "approved", "locked"],
    approved: ["approved", "locked"],
    locked: ["locked"], // Locked budgets cannot change status
  };

  const allowed = allowedTransitions[currentStatus];

  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      {
        message: `Cannot transition budget from ${currentStatus} to ${newStatus}`,
      },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Validate line item exists and belongs to budget
 */
export async function verifyLineItem(
  tenantId: string,
  lineItemId: string,
  budgetId: string
): Promise<{
  lineItem: {
    id: string;
    budget_id: string;
    deleted_at: Date | null;
  } | null;
  error: NextResponse | null;
}> {
  const lineItem = await database.$queryRaw<
    Array<{
      id: string;
      budget_id: string;
      deleted_at: Date | null;
    }>
  >(
    Prisma.sql`
      SELECT id, budget_id, deleted_at
      FROM tenant_events.budget_line_items
      WHERE tenant_id = ${tenantId}
        AND id = ${lineItemId}
    `
  );

  if (!lineItem[0]) {
    return {
      lineItem: null,
      error: NextResponse.json(
        { message: "Line item not found" },
        { status: 404 }
      ),
    };
  }

  if (lineItem[0].deleted_at) {
    return {
      lineItem: null,
      error: NextResponse.json(
        { message: "Line item has been deleted" },
        { status: 404 }
      ),
    };
  }

  // Verify line item belongs to the specified budget
  if (lineItem[0].budget_id !== budgetId) {
    return {
      lineItem: null,
      error: NextResponse.json(
        { message: "Line item does not belong to this budget" },
        { status: 400 }
      ),
    };
  }

  return { lineItem: lineItem[0], error: null };
}
