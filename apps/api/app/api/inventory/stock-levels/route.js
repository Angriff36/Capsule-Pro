/**
 * Stock Levels API Endpoints
 *
 * GET    /api/inventory/stock-levels      - List stock levels with pagination and filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
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
 * Parse stock level filters from URL search params
 */
function parseStockLevelFilters(searchParams) {
  const filters = {};
  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }
  const category = searchParams.get("category");
  if (category) {
    filters.category = category;
  }
  const locationId = searchParams.get("locationId");
  if (locationId) {
    filters.locationId = locationId;
  }
  const reorderStatus = searchParams.get("reorderStatus");
  if (
    reorderStatus &&
    ["below_par", "at_par", "above_par"].includes(reorderStatus)
  ) {
    filters.reorderStatus = reorderStatus;
  }
  const lowStock = searchParams.get("lowStock");
  if (lowStock === "true") {
    filters.lowStock = true;
  }
  const outOfStock = searchParams.get("outOfStock");
  if (outOfStock === "true") {
    filters.outOfStock = true;
  }
  return filters;
}
/**
 * Calculate reorder status based on quantity and reorder level
 */
function calculateReorderStatus(quantityOnHand, reorderLevel, parLevel) {
  const par = parLevel ?? reorderLevel;
  if (quantityOnHand <= 0) {
    return "below_par";
  }
  if (quantityOnHand <= reorderLevel) {
    return "below_par";
  }
  // Use tolerance of 5% for "at_par" determination
  const tolerance = Math.max(par * 0.05, 1);
  const diff = Math.abs(quantityOnHand - par);
  if (diff <= tolerance) {
    return "at_par";
  }
  if (quantityOnHand < par) {
    return "below_par";
  }
  return "above_par";
}
/**
 * Calculate par status
 */
function calculateParStatus(quantityOnHand, parLevel, reorderLevel) {
  if (!parLevel || parLevel <= 0) {
    return "no_par_set";
  }
  const tolerance = Math.max(parLevel * 0.05, 1);
  const diff = Math.abs(quantityOnHand - parLevel);
  if (diff <= tolerance) {
    return "at_par";
  }
  if (quantityOnHand < parLevel) {
    return "below_par";
  }
  return "above_par";
}
/**
 * Calculate if stock out risk exists
 */
function calculateStockOutRisk(quantityOnHand, reorderLevel) {
  return quantityOnHand <= reorderLevel && quantityOnHand > 0;
}
/**
 * GET /api/inventory/stock-levels - List stock levels with pagination and filters
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
    const filters = parseStockLevelFilters(searchParams);
    // Build where clause for inventory items
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
    // Get storage locations for this tenant
    const storageLocations = await database_1.database.$queryRaw`
      SELECT id, name
      FROM tenant_inventory.storage_locations
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
      ORDER BY name ASC
    `;
    // Filter by location if specified
    const locationFilter = filters.locationId
      ? storageLocations.some((l) => l.id === filters.locationId)
        ? filters.locationId
        : null
      : null;
    // Get total count for pagination
    const total = await database_1.database.inventoryItem.count({ where });
    // Get items with pagination
    const items = await database_1.database.inventoryItem.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    // Get stock levels for items
    const itemIds = items.map((item) => item.id);
    // Get stock records by location
    const stockRecords = await database_1.database.inventoryStock.findMany({
      where: {
        tenantId,
        itemId: { in: itemIds },
        ...(locationFilter && { storageLocationId: locationFilter }),
      },
      include: {
        tenant: {
          select: { id: true },
        },
      },
    });
    // Group stock by item ID and location
    const stockByItemAndLocation = new Map();
    for (const stock of stockRecords) {
      let itemMap = stockByItemAndLocation.get(stock.itemId);
      if (!itemMap) {
        itemMap = new Map();
        stockByItemAndLocation.set(stock.itemId, itemMap);
      }
      itemMap.set(stock.storageLocationId, {
        quantity: Number(stock.quantity_on_hand),
        lastCountedAt: stock.last_counted_at,
      });
    }
    // Build stock levels with status
    const stockLevels = [];
    let totalValue = 0;
    let belowParCount = 0;
    let outOfStockCount = 0;
    for (const item of items) {
      const quantityOnHand = Number(item.quantityOnHand);
      const reorderLevel = Number(item.reorder_level);
      const parLevel = item.reorder_level ? Number(item.reorder_level) : null;
      const unitCost = Number(item.unitCost);
      const reorderStatus = calculateReorderStatus(
        quantityOnHand,
        reorderLevel,
        parLevel
      );
      const parStatus = calculateParStatus(
        quantityOnHand,
        parLevel,
        reorderLevel
      );
      const stockOutRisk = calculateStockOutRisk(quantityOnHand, reorderLevel);
      const totalValueItem = quantityOnHand * unitCost;
      // Apply filters that require calculation
      if (filters.reorderStatus && reorderStatus !== filters.reorderStatus) {
        continue;
      }
      if (filters.lowStock && quantityOnHand > reorderLevel) {
        continue;
      }
      if (filters.outOfStock && quantityOnHand > 0) {
        continue;
      }
      totalValue += totalValueItem;
      if (parStatus === "below_par" || reorderStatus === "below_par") {
        belowParCount++;
      }
      if (quantityOnHand <= 0) {
        outOfStockCount++;
      }
      // If filtering by location, only show items with stock at that location
      if (locationFilter) {
        const itemStockMap = stockByItemAndLocation.get(item.id);
        const locationStock = itemStockMap?.get(locationFilter);
        if (locationStock) {
          const storageLocation = storageLocations.find(
            (l) => l.id === locationFilter
          );
          stockLevels.push({
            tenantId: item.tenantId,
            id: item.id,
            inventoryItemId: item.id,
            storageLocationId: locationFilter,
            quantityOnHand: locationStock.quantity,
            reorderLevel,
            parLevel,
            lastCountedAt: locationStock.lastCountedAt,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            item: {
              id: item.id,
              itemNumber: item.item_number,
              name: item.name,
              category: item.category,
              unitCost: Number(item.unitCost),
              unit: null,
            },
            storageLocation: storageLocation
              ? { id: storageLocation.id, name: storageLocation.name }
              : null,
            reorderStatus,
            totalValue: totalValueItem,
            parStatus,
            stockOutRisk,
          });
        }
      } else {
        // Show aggregated stock across all locations for the item
        stockLevels.push({
          tenantId: item.tenantId,
          id: item.id,
          inventoryItemId: item.id,
          storageLocationId: null,
          quantityOnHand,
          reorderLevel,
          parLevel,
          lastCountedAt: null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          item: {
            id: item.id,
            itemNumber: item.item_number,
            name: item.name,
            category: item.category,
            unitCost: Number(item.unitCost),
            unit: null,
          },
          storageLocation: null,
          reorderStatus,
          totalValue: totalValueItem,
          parStatus,
          stockOutRisk,
        });
      }
    }
    // Recalculate total after filtering
    const filteredTotal = stockLevels.length;
    return server_2.NextResponse.json({
      data: stockLevels,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit),
      },
      summary: {
        totalItems: filteredTotal,
        totalValue,
        belowParCount,
        outOfStockCount,
      },
    });
  } catch (error) {
    console.error("Failed to list stock levels:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
