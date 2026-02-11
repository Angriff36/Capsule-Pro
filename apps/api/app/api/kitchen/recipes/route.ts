/**
 * @module RecipesAPI
 * @intent List recipes with pagination and filtering
 * @responsibility Provide paginated list of recipes for the current tenant
 * @domain Kitchen
 * @tags recipes, api, list
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type RecipeCategory =
  | "appetizer"
  | "soup"
  | "salad"
  | "entree"
  | "side_dish"
  | "dessert"
  | "beverage"
  | "sauce"
  | "other";

type CuisineType =
  | "american"
  | "italian"
  | "french"
  | "asian"
  | "mexican"
  | "mediterranean"
  | "indian"
  | "other";

interface RecipeListFilters {
  category?: string;
  cuisineType?: string;
  search?: string;
  tag?: string;
  isActive?: boolean;
}

interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Parse and validate recipe list filters from URL search params
 */
function parseRecipeFilters(searchParams: URLSearchParams): RecipeListFilters {
  const filters: RecipeListFilters = {};

  const category = searchParams.get("category");
  if (category) {
    filters.category = category;
  }

  const cuisineType = searchParams.get("cuisineType");
  if (cuisineType) {
    filters.cuisineType = cuisineType;
  }

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  const tag = searchParams.get("tag");
  if (tag) {
    filters.tag = tag;
  }

  const isActive = searchParams.get("isActive");
  if (isActive) {
    filters.isActive = isActive === "true";
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

    // Fetch recipes with their current version (latest by version number)
    const recipes = await database.$queryRaw<
      {
        id: string;
        tenant_id: string;
        name: string;
        category: string | null;
        cuisine_type: string | null;
        description: string | null;
        tags: string[];
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
        yield_quantity: number | null;
        yield_unit_id: number | null;
        current_version_id: string | null;
        version_number: number | null;
        total_cost: number | null;
        cost_per_yield: number | null;
        cost_calculated_at: Date | null;
      }[]
    >(
      Prisma.sql`
        SELECT
          r.id,
          r.tenant_id,
          r.name,
          r.category,
          r.cuisine_type,
          r.description,
          r.tags,
          r.is_active,
          r.created_at,
          r.updated_at,
          rv.yield_quantity,
          rv.yield_unit_id,
          rv.id as current_version_id,
          rv.version_number,
          rv.total_cost,
          rv.cost_per_yield,
          rv.cost_calculated_at
        FROM tenant_kitchen.recipes r
        LEFT JOIN LATERAL (
          SELECT
            id,
            recipe_id,
            version_number,
            yield_quantity,
            yield_unit_id,
            total_cost,
            cost_per_yield,
            cost_calculated_at
          FROM tenant_kitchen.recipe_versions
          WHERE tenant_id = ${tenantId}
            AND recipe_id = r.id
            AND deleted_at IS NULL
          ORDER BY version_number DESC
          LIMIT 1
        ) rv ON true
        WHERE r.tenant_id = ${tenantId}
          AND r.deleted_at IS NULL
          ${filters.category !== undefined ? Prisma.sql`AND r.category = ${filters.category}` : Prisma.empty}
          ${filters.cuisineType !== undefined ? Prisma.sql`AND r.cuisine_type = ${filters.cuisineType}` : Prisma.empty}
          ${filters.search !== undefined ? Prisma.sql`AND (r.name ILIKE ${`%${filters.search}%`} OR r.description ILIKE ${`%${filters.search}%`})` : Prisma.empty}
          ${filters.tag !== undefined ? Prisma.sql`AND ${filters.tag} = ANY(r.tags)` : Prisma.empty}
          ${filters.isActive !== undefined ? Prisma.sql`AND r.is_active = ${filters.isActive}` : Prisma.empty}
        ORDER BY r.name ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    );

    // Get total count for pagination
    const totalCountResult = await database.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM tenant_kitchen.recipes r
        WHERE r.tenant_id = ${tenantId}
          AND r.deleted_at IS NULL
          ${filters.category !== undefined ? Prisma.sql`AND r.category = ${filters.category}` : Prisma.empty}
          ${filters.cuisineType !== undefined ? Prisma.sql`AND r.cuisine_type = ${filters.cuisineType}` : Prisma.empty}
          ${filters.search !== undefined ? Prisma.sql`AND (r.name ILIKE ${`%${filters.search}%`} OR r.description ILIKE ${`%${filters.search}%`})` : Prisma.empty}
          ${filters.tag !== undefined ? Prisma.sql`AND ${filters.tag} = ANY(r.tags)` : Prisma.empty}
          ${filters.isActive !== undefined ? Prisma.sql`AND r.is_active = ${filters.isActive}` : Prisma.empty}
      `
    );

    const totalCount = Number(totalCountResult[0]?.count ?? 0);
    const totalPages = Math.ceil(totalCount / limit);

    // Map snake_case DB results to camelCase API response
    const data = recipes.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      category: r.category as RecipeCategory | null,
      cuisineType: r.cuisine_type as CuisineType | null,
      description: r.description,
      tags: r.tags,
      isActive: r.is_active,
      yieldQuantity: r.yield_quantity ? Number(r.yield_quantity) : null,
      yieldUnitId: r.yield_unit_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      currentVersion: r.current_version_id
        ? {
            id: r.current_version_id,
            versionNumber: r.version_number ?? 1,
            totalCost: r.total_cost ? Number(r.total_cost) : null,
            costPerYield: r.cost_per_yield ? Number(r.cost_per_yield) : null,
            costCalculatedAt: r.cost_calculated_at,
          }
        : null,
    }));

    return NextResponse.json({
      data,
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
