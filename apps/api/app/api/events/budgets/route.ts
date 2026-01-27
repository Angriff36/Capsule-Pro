/**
 * Event Budget CRUD API Endpoints
 *
 * GET    /api/events/budgets      - List event budgets with pagination and filters
 * POST   /api/events/budgets      - Create a new event budget
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  type CreateBudgetLineItemInput,
  type CreateEventBudgetInput,
  parseEventBudgetListFilters,
  validateCreateEventBudget,
} from "./validation";

/**
 * GET /api/events/budgets
 * List event budgets with pagination, search, and filters
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
    const filters = parseEventBudgetListFilters(searchParams);
    const { page, limit, eventId, status } = filters;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add eventId filter
    if (eventId) {
      (whereClause.AND as Record<string, unknown>[]).push({ eventId });
    }

    // Add status filter
    if (status) {
      (whereClause.AND as Record<string, unknown>[]).push({ status });
    }

    // Fetch budgets
    const budgets = await database.eventBudget.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
      include: {
        lineItems: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // Get total count for pagination
    const total = await database.eventBudget.count({
      where: whereClause,
    });

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      budgets,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching event budgets:", error);
    return NextResponse.json(
      { message: "Failed to fetch event budgets" },
      { status: 500 }
    );
  }
}

// Helper function to validate event exists
async function validateEventExists(tenantId: string, eventId: string) {
  const event = await database.event.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  return event;
}

// Helper function to check if budget already exists
async function checkBudgetExists(tenantId: string, eventId: string) {
  const existingBudget = await database.eventBudget.findFirst({
    where: {
      tenantId,
      eventId,
      deletedAt: null,
    },
  });

  if (existingBudget) {
    throw new Error("A budget already exists for this event");
  }
}

// Helper function to calculate total budget amount
function calculateTotalBudgetAmount(
  totalBudgetAmount: number,
  lineItems?: { budgetedAmount: number }[]
) {
  if (lineItems && lineItems.length > 0) {
    const lineItemsTotal = lineItems.reduce(
      (sum, item) => sum + item.budgetedAmount,
      0
    );
    // If totalBudgetAmount was not explicitly set or is 0, use line items total
    if (totalBudgetAmount === 0) {
      return lineItemsTotal;
    }
  }
  return totalBudgetAmount;
}

// Helper function to create budget with line items
async function createBudgetWithLineItems(
  tenantId: string,
  validatedData: CreateEventBudgetInput
) {
  return await database.$transaction(async (tx) => {
    // Create the budget
    const newBudget = await tx.eventBudget.create({
      data: {
        tenantId,
        eventId: validatedData.eventId,
        status: validatedData.status || "draft",
        totalBudgetAmount: validatedData.totalBudgetAmount,
        totalActualAmount: 0,
        varianceAmount: validatedData.totalBudgetAmount, // Initially variance is the full budget
        variancePercentage: 0,
        notes: validatedData.notes || null,
      },
    });

    // Create line items if provided
    if (validatedData.lineItems && validatedData.lineItems.length > 0) {
      await tx.budgetLineItem.createMany({
        data: validatedData.lineItems.map(
          (item: CreateBudgetLineItemInput) => ({
            tenantId,
            budgetId: newBudget.id,
            category: item.category,
            name: item.name,
            description: item.description || null,
            budgetedAmount: item.budgetedAmount,
            actualAmount: 0,
            varianceAmount: item.budgetedAmount,
            sortOrder: item.sortOrder || 0,
            notes: item.notes || null,
          })
        ),
      });
    }

    return newBudget;
  });
}

// Helper function to fetch created budget with line items
async function fetchCreatedBudget(tenantId: string, budgetId: string) {
  return await database.eventBudget.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: budgetId,
      },
    },
    include: {
      lineItems: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

/**
 * POST /api/events/budgets
 * Create a new event budget
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
    const validatedData = validateCreateEventBudget(body);
    invariant(validatedData.eventId, "Event ID is required");

    // Validate event exists
    await validateEventExists(tenantId, validatedData.eventId);

    // Check if a budget already exists for this event
    await checkBudgetExists(tenantId, validatedData.eventId);

    // Calculate total budget amount
    const totalBudgetAmount = calculateTotalBudgetAmount(
      validatedData.totalBudgetAmount,
      validatedData.lineItems
    );

    // Update validated data with calculated total
    validatedData.totalBudgetAmount = totalBudgetAmount;

    // Create budget with line items in a transaction
    const budget = await createBudgetWithLineItems(tenantId, validatedData);

    // Fetch the created budget with line items
    const budgetWithLineItems = await fetchCreatedBudget(tenantId, budget.id);

    return NextResponse.json(budgetWithLineItems, { status: 201 });
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
    console.error("Error creating event budget:", error);
    return NextResponse.json(
      { message: "Failed to create event budget" },
      { status: 500 }
    );
  }
}
