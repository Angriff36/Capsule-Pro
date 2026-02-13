/**
 * @module MenusAPI
 * @intent List menus with pagination and filtering
 * @responsibility Provide paginated list of menus for the current tenant
 * @domain Kitchen
 * @tags menus, api, list
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface MenuListFilters {
  category?: string;
  search?: string;
  isActive?: boolean;
  minGuests?: number;
  maxGuests?: number;
}

interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Parse and validate menu list filters from URL search params
 */
function parseMenuFilters(searchParams: URLSearchParams): MenuListFilters {
  const filters: MenuListFilters = {};

  const category = searchParams.get("category");
  if (category) {
    filters.category = category;
  }

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  const isActive = searchParams.get("isActive");
  if (isActive) {
    filters.isActive = isActive === "true";
  }

  const minGuests = searchParams.get("minGuests");
  if (minGuests) {
    filters.minGuests = Number.parseInt(minGuests, 10);
  }

  const maxGuests = searchParams.get("maxGuests");
  if (maxGuests) {
    filters.maxGuests = Number.parseInt(maxGuests, 10);
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
 * GET /api/kitchen/menus
 * List menus with pagination and filters
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
    const filters = parseMenuFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add category filter
    if (filters.category) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { category: filters.category },
      ];
    }

    // Add search filter (searches in name and description)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        {
          OR: [
            { name: { contains: searchLower, mode: "insensitive" } },
            { description: { contains: searchLower, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Add active filter
    if (filters.isActive !== undefined) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { isActive: filters.isActive },
      ];
    }

    // Add guest count filters
    if (filters.minGuests !== undefined) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { maxGuests: { gte: filters.minGuests } },
      ];
    }

    if (filters.maxGuests !== undefined) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { minGuests: { lte: filters.maxGuests } },
      ];
    }

    // Fetch menus with their dishes
    const menus = await database.menu.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        isActive: true,
        basePrice: true,
        pricePerPerson: true,
        minGuests: true,
        maxGuests: true,
        createdAt: true,
        updatedAt: true,
        menuDishes: {
          select: {
            id: true,
            dishId: true,
            course: true,
            sortOrder: true,
            isOptional: true,
          },
          orderBy: [{ sortOrder: "asc" }],
        },
      },
      orderBy: [{ name: "asc" }],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await database.menu.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: menus,
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
