/**
 * Inventory Items API Endpoints
 *
 * GET    /api/inventory/items      - List items with pagination and filters
 * POST   /api/inventory/items      - Create a new inventory item
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const types_1 = require("./types");
const validation_1 = require("./validation");
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
 * Parse inventory item list filters from URL search params
 */
function parseInventoryItemFilters(searchParams) {
  const filters = {};
  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }
  const category = searchParams.get("category");
  if (category && types_1.ITEM_CATEGORIES.includes(category)) {
    filters.category = category;
  }
  const stockStatus = searchParams.get("stock_status");
  if (
    stockStatus &&
    ["in_stock", "low_stock", "out_of_stock"].includes(stockStatus)
  ) {
    filters.stock_status = stockStatus;
  }
  const fsaStatus = searchParams.get("fsa_status");
  if (fsaStatus && types_1.FSA_STATUSES.includes(fsaStatus)) {
    filters.fsa_status = fsaStatus;
  }
  const tags = searchParams.get("tags");
  if (tags) {
    filters.tags = tags.split(",");
  }
  return filters;
}
/**
 * Calculate stock status based on quantity and reorder level
 */
function calculateStockStatus(quantityOnHand, reorderLevel) {
  if (quantityOnHand <= 0) return "out_of_stock";
  if (quantityOnHand <= reorderLevel) return "low_stock";
  return "in_stock";
}
/**
 * GET /api/inventory/items - List inventory items with pagination and filters
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
    if (!tenantId) {
      return server_2.NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const filters = parseInventoryItemFilters(searchParams);
    // Build where clause
    const where = {
      tenantId,
      deletedAt: null,
    };
    // Search filter (item_number or name)
    if (filters.search) {
      where.OR = [
        { item_number: { contains: filters.search, mode: "insensitive" } },
        { name: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    // Category filter
    if (filters.category) {
      where.category = filters.category;
    }
    // FSA status filter
    if (filters.fsa_status) {
      where.fsa_status = filters.fsa_status;
    }
    // Tags filter (any of the provided tags)
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }
    // Stock status filter (requires calculation)
    if (filters.stock_status) {
      switch (filters.stock_status) {
        case "out_of_stock":
          where.quantityOnHand = { equals: 0 };
          break;
        case "low_stock":
          where.quantityOnHand = { lte: 0 }; // Will be refined with client-level filtering
          break;
        case "in_stock":
          where.quantityOnHand = { gt: 0 };
          break;
      }
    }
    // Get total count for pagination
    const total = await database_1.database.inventoryItem.count({ where });
    // Get items with pagination
    const items = await database_1.database.inventoryItem.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    // Calculate stock status and total value for each item
    const mappedItems = items.map((item) => {
      const quantityOnHand = Number(item.quantityOnHand);
      const reorderLevel = Number(item.reorder_level);
      const stockStatus = calculateStockStatus(quantityOnHand, reorderLevel);
      // Apply stock status filter that requires calculation
      if (filters.stock_status === "low_stock" && stockStatus !== "low_stock") {
        return null;
      }
      return {
        id: item.id,
        tenant_id: item.tenantId,
        item_number: item.item_number,
        name: item.name,
        category: item.category,
        unit_cost: Number(item.unitCost),
        quantity_on_hand: quantityOnHand,
        reorder_level: reorderLevel,
        tags: item.tags,
        fsa_status: item.fsa_status ?? "unknown",
        fsa_temp_logged: item.fsa_temp_logged ?? false,
        fsa_allergen_info: item.fsa_allergen_info ?? false,
        fsa_traceable: item.fsa_traceable ?? false,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        deleted_at: item.deletedAt,
        stock_status: stockStatus,
        total_value: quantityOnHand * Number(item.unitCost),
      };
    });
    const itemsWithStatus = mappedItems.filter((item) => item !== null);
    // Recalculate total after stock status filtering
    const filteredTotal =
      filters.stock_status === "low_stock" ? itemsWithStatus.length : total;
    return server_2.NextResponse.json({
      data: itemsWithStatus,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit),
      },
    });
  } catch (error) {
    console.error("Failed to list inventory items:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/inventory/items - Create a new inventory item
 */
async function POST(request) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    if (!tenantId) {
      return server_2.NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    const body = await request.json();
    (0, validation_1.validateCreateInventoryItemRequest)(body);
    // Check if item_number already exists for this tenant
    const existing = await database_1.database.inventoryItem.findFirst({
      where: {
        tenantId,
        item_number: body.item_number,
        deletedAt: null,
      },
    });
    if (existing) {
      return server_2.NextResponse.json(
        { message: "Item number already exists" },
        { status: 409 }
      );
    }
    // Create inventory item
    const item = await database_1.database.inventoryItem.create({
      data: {
        tenantId,
        item_number: body.item_number,
        name: body.name,
        category: body.category,
        unitCost: body.unit_cost ?? 0,
        quantityOnHand: body.quantity_on_hand ?? 0,
        reorder_level: body.reorder_level ?? 0,
        tags: body.tags ?? [],
        fsa_status: body.fsa_status ?? "unknown",
        fsa_temp_logged: body.fsa_temp_logged ?? false,
        fsa_allergen_info: body.fsa_allergen_info ?? false,
        fsa_traceable: body.fsa_traceable ?? false,
      },
    });
    const quantityOnHand = Number(item.quantityOnHand);
    const reorderLevel = Number(item.reorder_level);
    const stockStatus = calculateStockStatus(quantityOnHand, reorderLevel);
    const itemWithStatus = {
      id: item.id,
      tenant_id: item.tenantId,
      item_number: item.item_number,
      name: item.name,
      category: item.category,
      unit_cost: Number(item.unitCost),
      quantity_on_hand: quantityOnHand,
      reorder_level: reorderLevel,
      tags: item.tags,
      fsa_status: item.fsa_status ?? "unknown",
      fsa_temp_logged: item.fsa_temp_logged ?? false,
      fsa_allergen_info: item.fsa_allergen_info ?? false,
      fsa_traceable: item.fsa_traceable ?? false,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt,
      stock_status: stockStatus,
      total_value: quantityOnHand * Number(item.unitCost),
    };
    return server_2.NextResponse.json(itemWithStatus, { status: 201 });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Failed to create inventory item:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
