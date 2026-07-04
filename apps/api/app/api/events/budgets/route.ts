/**
 * Event Budget CRUD API Endpoints
 *
 * GET    /api/events/budgets      - List event budgets with pagination and filters
 * POST   /api/events/budgets      - Create a new event budget
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { parseEventBudgetListFilters } from "./validation";

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
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "Invalid query parameters", errors: error.issues },
        { status: 400 }
      );
    }
    captureException(error);
    log.error("Error fetching event budgets:", error);
    return NextResponse.json(
      { message: "Failed to fetch event budgets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/budgets
 * Create a new event budget via manifest runtime
 */
export async function POST(request: NextRequest) {
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runManifestCommand({
    entity: "EventBudget",
    command: "create",
    body: { ...rawBody, tenantId: user.tenantId },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
