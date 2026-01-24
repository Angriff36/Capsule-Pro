/**
 * Event Budget CRUD API Endpoints
 *
 * GET    /api/events/budgets      - List event budgets with pagination and filters
 * POST   /api/events/budgets      - Create a new event budget
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("./validation");
/**
 * GET /api/events/budgets
 * List event budgets with pagination, search, and filters
 */
async function GET(request) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { searchParams } = new URL(request.url);
    // Parse filters and pagination
    const filters = (0, validation_1.parseEventBudgetListFilters)(searchParams);
    const { page, limit, eventId, status } = filters;
    const offset = (page - 1) * limit;
    // Build where clause
    const whereClause = {
      AND: [{ tenantId }, { deletedAt: null }],
    };
    // Add eventId filter
    if (eventId) {
      whereClause.AND.push({ eventId });
    }
    // Add status filter
    if (status) {
      whereClause.AND.push({ status });
    }
    // Fetch budgets
    const budgets = await database_1.database.eventBudget.findMany({
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
    const total = await database_1.database.eventBudget.count({
      where: whereClause,
    });
    // Calculate total pages
    const totalPages = Math.ceil(total / limit);
    return server_2.NextResponse.json({
      budgets,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching event budgets:", error);
    return server_2.NextResponse.json(
      { message: "Failed to fetch event budgets" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/events/budgets
 * Create a new event budget
 */
async function POST(request) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const body = await request.json();
    // Validate request body
    const validatedData = (0, validation_1.validateCreateEventBudget)(body);
    (0, invariant_1.invariant)(validatedData.eventId, "Event ID is required");
    // Check if event exists
    const event = await database_1.database.event.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: validatedData.eventId,
        },
      },
    });
    if (!event) {
      return server_2.NextResponse.json(
        { message: "Event not found" },
        { status: 404 }
      );
    }
    // Check if a budget already exists for this event
    const existingBudget = await database_1.database.eventBudget.findFirst({
      where: {
        tenantId,
        eventId: validatedData.eventId,
        deletedAt: null,
      },
    });
    if (existingBudget) {
      return server_2.NextResponse.json(
        { message: "A budget already exists for this event" },
        { status: 409 }
      );
    }
    // Calculate total from line items if provided
    let totalBudgetAmount = validatedData.totalBudgetAmount;
    if (validatedData.lineItems && validatedData.lineItems.length > 0) {
      const lineItemsTotal = validatedData.lineItems.reduce(
        (sum, item) => sum + item.budgetedAmount,
        0
      );
      // If totalBudgetAmount was not explicitly set or is 0, use line items total
      if (validatedData.totalBudgetAmount === 0) {
        totalBudgetAmount = lineItemsTotal;
      }
    }
    // Create budget with line items in a transaction
    const budget = await database_1.database.$transaction(async (tx) => {
      // Create the budget
      const newBudget = await tx.eventBudget.create({
        data: {
          tenantId,
          eventId: validatedData.eventId,
          status: validatedData.status || "draft",
          totalBudgetAmount,
          totalActualAmount: 0,
          varianceAmount: totalBudgetAmount, // Initially variance is the full budget
          variancePercentage: 0,
          notes: validatedData.notes || null,
        },
      });
      // Create line items if provided
      if (validatedData.lineItems && validatedData.lineItems.length > 0) {
        await tx.budgetLineItem.createMany({
          data: validatedData.lineItems.map((item) => ({
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
          })),
        });
      }
      return newBudget;
    });
    // Fetch the created budget with line items
    const budgetWithLineItems =
      await database_1.database.eventBudget.findUnique({
        where: {
          tenantId_id: {
            tenantId,
            id: budget.id,
          },
        },
        include: {
          lineItems: {
            where: { deletedAt: null },
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    return server_2.NextResponse.json(budgetWithLineItems, { status: 201 });
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
    console.error("Error creating event budget:", error);
    return server_2.NextResponse.json(
      { message: "Failed to create event budget" },
      { status: 500 }
    );
  }
}
