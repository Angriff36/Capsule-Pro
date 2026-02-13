/**
 * @module PrepTasksAPI
 * @intent List prep tasks with pagination and filtering
 * @responsibility Provide paginated list of prep tasks for the current tenant
 * @domain Kitchen
 * @tags prep-tasks, api, list
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import * as Sentry from "@sentry/nextjs";

interface PrepTaskListFilters {
  eventId?: string;
  status?: string;
  priority?: number;
  stationId?: string;
  locationId?: string;
  taskType?: string;
  search?: string;
  isOverdue?: boolean;
}

interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Parse and validate prep task list filters from URL search params
 */
function parsePrepTaskFilters(
  searchParams: URLSearchParams
): PrepTaskListFilters {
  const filters: PrepTaskListFilters = {};

  const eventId = searchParams.get("eventId");
  if (eventId) {
    filters.eventId = eventId;
  }

  const status = searchParams.get("status");
  if (status) {
    filters.status = status;
  }

  const priority = searchParams.get("priority");
  if (priority) {
    filters.priority = Number.parseInt(priority, 10);
  }

  const stationId = searchParams.get("stationId");
  if (stationId) {
    filters.stationId = stationId;
  }

  const locationId = searchParams.get("locationId");
  if (locationId) {
    filters.locationId = locationId;
  }

  const taskType = searchParams.get("taskType");
  if (taskType) {
    filters.taskType = taskType;
  }

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  const isOverdue = searchParams.get("isOverdue");
  if (isOverdue) {
    filters.isOverdue = isOverdue === "true";
  }

  return filters;
}

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
 * GET /api/kitchen/prep-tasks
 * List prep tasks with pagination and filters
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
    const filters = parsePrepTaskFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add event filter
    if (filters.eventId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { eventId: filters.eventId },
      ];
    }

    // Add status filter
    if (filters.status) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { status: filters.status },
      ];
    }

    // Add priority filter
    if (filters.priority !== undefined) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { priority: filters.priority },
      ];
    }

    // Add location filter
    if (filters.locationId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { locationId: filters.locationId },
      ];
    }

    // Add task type filter
    if (filters.taskType) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { taskType: filters.taskType },
      ];
    }

    // Add search filter (searches in name and notes)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        {
          OR: [
            { name: { contains: searchLower, mode: "insensitive" } },
            { notes: { contains: searchLower, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Add overdue filter
    if (filters.isOverdue) {
      const now = new Date();
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        {
          AND: [
            { dueByDate: { lt: now } },
            { status: { notIn: ["done", "completed", "canceled"] } },
          ],
        },
      ];
    }

    // Fetch prep tasks
    const prepTasks = await database.prepTask.findMany({
      where: whereClause,
      select: {
        id: true,
        tenantId: true,
        eventId: true,
        dishId: true,
        recipeVersionId: true,
        methodId: true,
        containerId: true,
        locationId: true,
        taskType: true,
        name: true,
        quantityTotal: true,
        quantityUnitId: true,
        quantityCompleted: true,
        servingsTotal: true,
        startByDate: true,
        dueByDate: true,
        dueByTime: true,
        isEventFinish: true,
        status: true,
        priority: true,
        estimatedMinutes: true,
        actualMinutes: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        do_not_complete_until: true,
      },
      orderBy: [
        { priority: "desc" },
        { dueByDate: "asc" },
        { startByDate: "asc" },
      ],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await database.prepTask.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: prepTasks,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
