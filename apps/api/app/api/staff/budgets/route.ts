import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createLaborBudget, getLaborBudgets } from "@/lib/staff/labor-budget";

/**
 * GET /api/staff/budgets
 * List all labor budgets for the tenant
 *
 * Query params:
 * - locationId: Filter by location
 * - eventId: Filter by event
 * - budgetType: Filter by budget type (event, week, month)
 * - status: Filter by status (active, paused, archived)
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const locationId = searchParams.get("locationId") || undefined;
  const eventId = searchParams.get("eventId") || undefined;
  const budgetType = searchParams.get("budgetType") || undefined;
  const status = searchParams.get("status") || undefined;

  try {
    const budgets = await getLaborBudgets(tenantId, {
      locationId,
      eventId,
      budgetType,
      status,
    });

    return NextResponse.json({ budgets });
  } catch (error) {
    console.error("Error fetching labor budgets:", error);
    return NextResponse.json(
      { message: "Failed to fetch labor budgets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staff/budgets
 * Create a new labor budget
 *
 * Required fields:
 * - name: Budget name
 * - budgetType: Type of budget (event, week, month)
 * - budgetTarget: Target amount (hours or cost)
 * - budgetUnit: Unit of budget (hours, cost)
 *
 * Optional fields:
 * - locationId: Location for this budget (null = tenant-wide)
 * - eventId: Event ID for event budgets
 * - description: Budget description
 * - periodStart: Period start date (for week/month budgets)
 * - periodEnd: Period end date (for week/month budgets)
 * - threshold80Pct: Enable 80% threshold alert
 * - threshold90Pct: Enable 90% threshold alert
 * - threshold100Pct: Enable 100% threshold alert
 */
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = await request.json();

  // Validate required fields
  if (!(body.name && body.budgetType && body.budgetTarget && body.budgetUnit)) {
    return NextResponse.json(
      {
        message: "Name, budget type, target, and unit are required",
      },
      { status: 400 }
    );
  }

  // Validate budget type
  if (!["event", "week", "month"].includes(body.budgetType)) {
    return NextResponse.json(
      { message: "Budget type must be one of: event, week, month" },
      { status: 400 }
    );
  }

  // Validate budget unit
  if (!["hours", "cost"].includes(body.budgetUnit)) {
    return NextResponse.json(
      { message: "Budget unit must be one of: hours, cost" },
      { status: 400 }
    );
  }

  // Validate budget target is positive
  if (body.budgetTarget <= 0) {
    return NextResponse.json(
      { message: "Budget target must be greater than 0" },
      { status: 400 }
    );
  }

  // Validate event budgets have event_id
  if (body.budgetType === "event" && !body.eventId) {
    return NextResponse.json(
      { message: "Event budgets must have an eventId" },
      { status: 400 }
    );
  }

  // Validate period budgets have dates
  if (
    (body.budgetType === "week" || body.budgetType === "month") &&
    !(body.periodStart && body.periodEnd)
  ) {
    return NextResponse.json(
      { message: "Period budgets must have periodStart and periodEnd dates" },
      { status: 400 }
    );
  }

  try {
    const budget = await createLaborBudget({
      tenantId,
      locationId: body.locationId,
      eventId: body.eventId,
      name: body.name,
      description: body.description,
      budgetType: body.budgetType,
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
      budgetTarget: Number(body.budgetTarget),
      budgetUnit: body.budgetUnit,
      threshold80Pct: body.threshold80Pct,
      threshold90Pct: body.threshold90Pct,
      threshold100Pct: body.threshold100Pct,
    });

    return NextResponse.json({ budget }, { status: 201 });
  } catch (error) {
    console.error("Error creating labor budget:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create labor budget";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
