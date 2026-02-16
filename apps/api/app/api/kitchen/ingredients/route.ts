/**
 * @module IngredientsAPI
 * @intent List ingredients with pagination and filtering
 * @responsibility Provide paginated list of ingredients for the current tenant
 * @domain Kitchen
 * @tags ingredients, api, list
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface IngredientListFilters {
  category?: string;
  search?: string;
  isActive?: boolean;
  allergen?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Parse and validate ingredient list filters from URL search params
 */
function parseIngredientFilters(
  searchParams: URLSearchParams
): IngredientListFilters {
  const filters: IngredientListFilters = {};

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

  const allergen = searchParams.get("allergen");
  if (allergen) {
    filters.allergen = allergen;
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
 * GET /api/kitchen/ingredients
 * List ingredients with pagination and filters
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
    const filters = parseIngredientFilters(searchParams);
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

    // Add search filter (searches in name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { name: { contains: searchLower, mode: "insensitive" } },
      ];
    }

    // Add active filter
    if (filters.isActive !== undefined) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { isActive: filters.isActive },
      ];
    }

    // Add allergen filter
    if (filters.allergen) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { allergens: { has: filters.allergen } },
      ];
    }

    // Fetch ingredients
    const ingredients = await database.ingredient.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        category: true,
        defaultUnitId: true,
        densityGPerMl: true,
        shelfLifeDays: true,
        storageInstructions: true,
        allergens: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ name: "asc" }],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await database.ingredient.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: ingredients,
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
