/**
 * @module RecipesAPI
 * @intent List recipes with pagination and filtering
 * @responsibility Provide paginated list of recipes for the current tenant
 * @domain Kitchen
 * @tags recipes, api, list
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
/**
 * Parse and validate recipe list filters from URL search params
 */
function parseRecipeFilters(searchParams) {
  const filters = {};
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
function parsePaginationParams(searchParams) {
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
    const filters = parseRecipeFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;
    // Build where clause
    const whereClause = {
      AND: [{ tenantId }, { deletedAt: null }],
    };
    // Add category filter
    if (filters.category) {
      whereClause.AND = [...whereClause.AND, { category: filters.category }];
    }
    // Add cuisine type filter
    if (filters.cuisineType) {
      whereClause.AND = [
        ...whereClause.AND,
        { cuisineType: filters.cuisineType },
      ];
    }
    // Add search filter (searches in name and description)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...whereClause.AND,
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
      whereClause.AND = [...whereClause.AND, { tags: { has: filters.tag } }];
    }
    // Add active filter
    if (filters.isActive !== undefined) {
      whereClause.AND = [...whereClause.AND, { isActive: filters.isActive }];
    }
    // Fetch recipes
    const recipes = await database_1.database.recipe.findMany({
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
    const totalCount = await database_1.database.recipe.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalCount / limit);
    return server_2.NextResponse.json({
      data: recipes,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error listing recipes:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
