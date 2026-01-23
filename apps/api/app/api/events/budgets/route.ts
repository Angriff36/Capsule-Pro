/**
 * Event Budgets API Endpoints
 *
 * GET    /api/events/budgets      - List budgets with pagination and filters
 * POST   /api/events/budgets      - Create a new budget
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { EVENT_BUDGET_STATUSES } from "./types";
import type {
  CreateBudgetRequest,
  EventBudget,
  EventBudgetStatus,
  UpdateBudgetRequest,
} from "./types";
import {
  verifyEditableBudget,
  verifyEvent,
  validateBudgetStatus,
  validateBudgetStatusTransition,
} from "./validation";

type PaginationParams = {
  page: number;
  limit: number;
};

type BudgetListFilters = {
  eventId?: string;
  status?: EventBudgetStatus;
};

/**
 * Parse pagination parameters from URL search params
 */
function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );

  return { page, limit };
}

/**
 * Parse budget list filters from URL search params
 */
function parseBudgetFilters(searchParams: URLSearchParams): BudgetListFilters {
  const filters: BudgetListFilters = {};

  const eventId = searchParams.get("eventId");
  if (eventId) {
    filters.eventId = eventId;
  }

  const status = searchParams.get("status");
  if (status && EVENT_BUDGET_STATUSES.includes(status as EventBudgetStatus)) {
    filters.status = status as EventBudgetStatus;
  }

  return filters;
}

/**
 * Validate create budget request body
 */
function validateCreateBudgetRequest(data: unknown): asserts data is CreateBudgetRequest {
  invariant(data, "Request body is required");

  const body = data as CreateBudgetRequest;

  invariant(body.eventId, "eventId is required");

  // Validate line items if provided
  if (body.lineItems) {
    invariant(Array.isArray(body.lineItems), "lineItems must be an array");

    for (const item of body.lineItems) {
      invariant(item.name, "Line item name is required");
      invariant(item.category, "Line item category is required");
      invariant(
        typeof item.budgetedAmount === "number" && item.budgetedAmount >= 0,
        "Line item budgetedAmount must be a non-negative number"
      );
      invariant(
        !item.actualAmount || typeof item.actualAmount === "number",
        "Line item actualAmount must be a number"
      );
    }
  }
}

/**
 * GET /api/events/budgets
 * List budgets with pagination and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    // Parse filters and pagination
    const filters = parseBudgetFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add event filter
    if (filters.eventId) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { eventId: filters.eventId },
      ];
    }

    // Add status filter
    if (filters.status) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { status: filters.status },
      ];
    }

    // Fetch budgets
    const budgets = await database.eventBudget.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Get event details for budgets
    const eventIds = budgets.map((b) => b.eventId).filter((id): id is string => id !== null);

    const events = await database.event.findMany({
      where: {
        AND: [{ tenantId }, { id: { in: eventIds } }, { deletedAt: null }],
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    });

    const eventMap = new Map(events.map((e) => [e.id, e]));

    // Get line items for budgets
    const budgetIds = budgets.map((b) => b.id);
    const lineItems = await database.budgetLineItem.findMany({
      where: {
        AND: [{ tenantId }, { budgetId: { in: budgetIds } }, { deletedAt: null }],
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    // Group line items by budget
    const lineItemsByBudget = new Map<string, typeof lineItems>();
    for (const item of lineItems) {
      const items = lineItemsByBudget.get(item.budgetId) || [];
      items.push(item);
      lineItemsByBudget.set(item.budgetId, items);
    }

    // Build response with joined data
    const budgetsWithDetails = budgets.map((budget) => ({
      ...budget,
      line_items: lineItemsByBudget.get(budget.id) || [],
      event: budget.eventId ? (eventMap.get(budget.eventId) || null) : null,
    }));

    // Get total count for pagination
    const totalCount = await database.eventBudget.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: budgetsWithDetails,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing budgets:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/budgets
 * Create a new budget
 */
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    // Validate request body
    validateCreateBudgetRequest(body);

    const data = body as CreateBudgetRequest;

    // Verify event exists
    const { event, error: eventError } = await verifyEvent(tenantId, data.eventId);
    if (eventError) {
      return eventError;
    }

    // Check if there's an existing active budget for this event
    const existingBudget = await database.eventBudget.findFirst({
      where: {
        AND: [
          { tenantId },
          { eventId: data.eventId },
          { status: { in: ["draft", "approved"] } },
          { deletedAt: null },
        ],
      },
    });

    if (existingBudget) {
      return NextResponse.json(
        {
          message:
            "Event already has an active budget. Use versioning or update the existing budget.",
          existingBudgetId: existingBudget.id,
        },
        { status: 409 }
      );
    }

    // Create the budget
    const budget = await database.eventBudget.create({
      data: {
        tenantId,
        eventId: data.eventId,
        version: data.version || 1,
        status: data.status || "draft",
        notes: data.notes || null,
      },
    });

    // Create line items if provided
    if (data.lineItems && data.lineItems.length > 0) {
      await database.budgetLineItem.createMany({
        data: data.lineItems.map((item, index) => ({
          tenantId,
          budgetId: budget.id,
          category: item.category,
          name: item.name,
          description: item.description || null,
          budgetedAmount: item.budgetedAmount,
          actualAmount: item.actualAmount || 0,
          sortOrder: item.sortOrder ?? index,
          notes: item.notes || null,
        })),
      });

      // Recalculate budget totals
      await database.$queryRaw`
        SELECT tenant_events.update_budget_totals(${budget.id}::uuid, ${tenantId}::uuid)
      `;
    }

    // Fetch the created budget with line items and event details
    const createdBudget = await database.$queryRaw<
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
        WHERE id = ${budget.id}
          AND tenant_id = ${tenantId}
      `
    );

    const lineItems = await database.budgetLineItem.findMany({
      where: {
        AND: [{ tenantId }, { budgetId: budget.id }, { deletedAt: null }],
      },
      orderBy: [{ sortOrder: "asc" }],
    });

    const eventData = await database.event.findFirst({
      where: {
        AND: [{ tenantId }, { id: data.eventId }, { deletedAt: null }],
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    });

    return NextResponse.json(
      {
        data: {
          ...createdBudget[0],
          line_items: lineItems,
          event: eventData,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating budget:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
