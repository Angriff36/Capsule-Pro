/**
 * @module DishesAPI
 * @intent List dishes with pagination and filtering
 * @responsibility Provide paginated list of dishes with allergen and dietary information
 * @domain Kitchen
 * @tags dishes, allergens, api, list
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
 * Parse and validate dish list filters from URL search params
 */
function parseDishFilters(searchParams) {
  const filters = {};
  const category = searchParams.get("category");
  if (category) filters.category = category;
  const search = searchParams.get("search");
  if (search) filters.search = search;
  const hasAllergens = searchParams.get("hasAllergens");
  if (hasAllergens) filters.hasAllergens = hasAllergens === "true";
  const dietaryTag = searchParams.get("dietaryTag");
  if (dietaryTag) filters.dietaryTag = dietaryTag;
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
 * GET /api/kitchen/dishes
 * List dishes with pagination and filters
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
    const filters = parseDishFilters(searchParams);
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
    // Add allergens filter
    if (filters.hasAllergens !== undefined) {
      whereClause.AND = [
        ...whereClause.AND,
        filters.hasAllergens
          ? { allergens: { isEmpty: false } }
          : { allergens: { isEmpty: true } },
      ];
    }
    // Add dietary tag filter
    if (filters.dietaryTag) {
      whereClause.AND = [
        ...whereClause.AND,
        { dietaryTags: { has: filters.dietaryTag } },
      ];
    }
    // Fetch dishes
    const dishes = await database_1.database.dish.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        serviceStyle: true,
        dietaryTags: true,
        allergens: true,
        pricePerPerson: true,
        minPrepLeadDays: true,
        maxPrepLeadDays: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ name: "asc" }],
      take: limit,
      skip: offset,
    });
    // Get total count for pagination
    const totalCount = await database_1.database.dish.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalCount / limit);
    return server_2.NextResponse.json({
      data: dishes,
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
    console.error("Error listing dishes:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
