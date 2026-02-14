/**
 * @module PrepListsAPI
 * @intent List prep lists with pagination and filtering
 * @responsibility Provide paginated list of prep lists for the current tenant
 * @domain Kitchen
 * @tags prep-lists, api, list
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { captureException } from "@sentry/nextjs";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface PrepListListFilters {
  eventId?: string;
  status?: string;
  station?: string;
  search?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Parse and validate prep list filters from URL search params
 */
function parsePrepListFilters(
  searchParams: URLSearchParams
): PrepListListFilters {
  const filters: PrepListListFilters = {};

  const eventId = searchParams.get("eventId");
  if (eventId) {
    filters.eventId = eventId;
  }

  const status = searchParams.get("status");
  if (status) {
    filters.status = status;
  }

  const station = searchParams.get("station");
  if (station) {
    filters.station = station;
  }

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
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
 * GET /api/kitchen/prep-lists
 * List prep lists with pagination and filters
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
    const filters = parsePrepListFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add eventId filter
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

    // Add search filter (searches in name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { name: { contains: searchLower, mode: "insensitive" } },
      ];
    }

    // If station filter is provided, we need to filter prep lists that have items at that station
    let prepListIdsForStation: string[] | undefined;
    if (filters.station) {
      const stationItems = await database.prepListItem.findMany({
        where: {
          tenantId,
          stationId: filters.station,
          deletedAt: null,
        },
        select: { prepListId: true },
        distinct: ["prepListId"],
      });

      prepListIdsForStation = stationItems.map((item) => item.prepListId);

      // If no prep lists have items at this station, return empty result
      if (prepListIdsForStation.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }

      // Add station filter via prep list IDs
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { id: { in: prepListIdsForStation } },
      ];
    }

    // Fetch prep lists
    const prepLists = await database.prepList.findMany({
      where: whereClause,
      select: {
        id: true,
        eventId: true,
        name: true,
        batchMultiplier: true,
        dietaryRestrictions: true,
        status: true,
        totalItems: true,
        totalEstimatedTime: true,
        notes: true,
        generatedAt: true,
        finalizedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ generatedAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await database.prepList.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    // Fetch event titles for the prep lists
    const eventIds = [...new Set(prepLists.map((pl) => pl.eventId))];
    const events = await database.event.findMany({
      where: {
        id: { in: eventIds },
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    });

    const eventMap = new Map(
      events.map((e) => [e.id, { title: e.title, eventDate: e.eventDate }])
    );

    // Add event data to each prep list
    const prepListsWithEvents = prepLists.map((prepList) => ({
      ...prepList,
      batchMultiplier: Number(prepList.batchMultiplier),
      event: eventMap.get(prepList.eventId) || null,
    }));

    return NextResponse.json({
      data: prepListsWithEvents,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kitchen/prep-lists
 * Create a new prep list
 */
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();
    const {
      eventId,
      name,
      batchMultiplier = 1,
      dietaryRestrictions = [],
      items,
    } = body;

    if (!(eventId && name && items && Array.isArray(items))) {
      return NextResponse.json(
        { error: "eventId, name, and items are required" },
        { status: 400 }
      );
    }

    // Create the prep list using Prisma
    const prepList = await database.prepList.create({
      data: {
        tenantId,
        eventId,
        name,
        batchMultiplier,
        dietaryRestrictions,
        status: "draft",
        totalItems: items.length,
        totalEstimatedTime: 0,
      },
    });

    // Create prep list items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await database.prepListItem.create({
        data: {
          tenantId,
          prepListId: prepList.id,
          stationId: item.stationId,
          stationName: item.stationName,
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          category: item.category || null,
          baseQuantity: item.baseQuantity,
          baseUnit: item.baseUnit,
          scaledQuantity: item.scaledQuantity,
          scaledUnit: item.scaledUnit,
          isOptional: item.isOptional,
          preparationNotes: item.preparationNotes || null,
          allergens: item.allergens || [],
          dietarySubstitutions: item.dietarySubstitutions || [],
          dishId: item.dishId || null,
          dishName: item.dishName || null,
          recipeVersionId: item.recipeVersionId || null,
          sortOrder: i,
        },
      });
    }

    return NextResponse.json({
      id: prepList.id,
      message: "Prep list created successfully",
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to create prep list" },
      { status: 500 }
    );
  }
}

