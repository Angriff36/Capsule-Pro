/**
 * @module RecipesAPI
 * @intent List recipes with pagination and filtering
 * @responsibility Provide paginated list of recipes for the current tenant
 * @domain Kitchen
 * @tags recipes, api, list
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type RecipeListFilters = {
  category?: string;
  cuisineType?: string;
  search?: string;
  tag?: string;
  isActive?: boolean;
};

type PaginationParams = {
  page: number;
  limit: number;
};

/**
 * Parse and validate recipe list filters from URL search params
 */
function parseRecipeFilters(searchParams: URLSearchParams): RecipeListFilters {
  const filters: RecipeListFilters = {};

  const category = searchParams.get("category");
  if (category) filters.category = category;

  const cuisineType = searchParams.get("cuisineType");
  if (cuisineType) filters.cuisineType = cuisineType;

  const search = searchParams.get("search");
  if (search) filters.search = search;

  const tag = searchParams.get("tag");
  if (tag) filters.tag = tag;

  const isActive = searchParams.get("isActive");
  if (isActive) filters.isActive = isActive === "true";

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
 * GET /api/kitchen/recipes
 * List recipes with pagination and filters
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
    const filters = parseRecipeFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add category filter
    if (filters.category) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { category: filters.category },
      ];
    }

    // Add cuisine type filter
    if (filters.cuisineType) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { cuisineType: filters.cuisineType },
      ];
    }

    // Add search filter (searches in name and description)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        {
          OR: [
            { name: { contains: searchLower, mode: "insensitive" } },
            { description: { contains: searchLower, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Add tag filter
    if (filters.tag) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { tags: { has: filters.tag } },
      ];
    }

    // Add active filter
    if (filters.isActive !== undefined) {
      whereClause.AND = [
        ...(whereClause.AND as Array<Record<string, unknown>>),
        { isActive: filters.isActive },
      ];
    }

    // Fetch recipes
    const recipes = await database.recipe.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        category: true,
        cuisineType: true,
        description: true,
        tags: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ name: "asc" }],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await database.recipe.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: recipes,
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
    console.error("Error listing recipes:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
