/**
 * Stock Levels API Endpoints
 *
 * GET    /api/inventory/stock-levels      - List stock levels with pagination and filters
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  StockLevelFilters,
  StockLevelWithStatus,
  StockReorderStatus,
} from "./types";

interface PaginationParams {
  page: number;
  limit: number;
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
 * Parse stock level filters from URL search params
 */
function parseStockLevelFilters(
  searchParams: URLSearchParams
): StockLevelFilters {
  const filters: StockLevelFilters = {};

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
    filters.reorderStatus = reorderStatus as StockReorderStatus;
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
function calculateReorderStatus(
  quantityOnHand: number,
  reorderLevel: number,
  parLevel: number | null
): StockReorderStatus {
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
function calculateParStatus(
  quantityOnHand: number,
  parLevel: number | null,
  _reorderLevel: number
): "below_par" | "at_par" | "above_par" | "no_par_set" {
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
function calculateStockOutRisk(
  quantityOnHand: number,
  reorderLevel: number
): boolean {
  return quantityOnHand <= reorderLevel && quantityOnHand > 0;
}

/**
 * Group stock records by item ID and location
 */
function groupStockByItemAndLocation(
  stockRecords: Array<{
    itemId: string;
    storageLocationId: string;
    quantity_on_hand: number | string | { toNumber: () => number };
    last_counted_at: Date | null;
  }>
) {
  const stockByItemAndLocation = new Map<
    string,
    Map<string, { quantity: number; lastCountedAt: Date | null }>
  >();

  for (const stock of stockRecords) {
    let itemMap = stockByItemAndLocation.get(stock.itemId);
    if (!itemMap) {
      itemMap = new Map();
      stockByItemAndLocation.set(stock.itemId, itemMap);
    }
    let quantity: number;
    if (typeof stock.quantity_on_hand === "number") {
      quantity = stock.quantity_on_hand;
    } else if (typeof stock.quantity_on_hand === "string") {
      quantity = Number(stock.quantity_on_hand);
    } else {
      quantity = stock.quantity_on_hand.toNumber();
    }
    itemMap.set(stock.storageLocationId, {
      quantity,
      lastCountedAt: stock.last_counted_at,
    });
  }

  return stockByItemAndLocation;
}

/**
 * Check if an item passes calculated filters
 */
function passesCalculatedFilters(
  reorderStatus: StockReorderStatus,
  quantityOnHand: number,
  reorderLevel: number,
  filters: StockLevelFilters
): boolean {
  if (filters.reorderStatus && reorderStatus !== filters.reorderStatus) {
    return false;
  }
  if (filters.lowStock && quantityOnHand > reorderLevel) {
    return false;
  }
  if (filters.outOfStock && quantityOnHand > 0) {
    return false;
  }
  return true;
}

/**
 * Create a stock level object for an item
 */
function createStockLevel(
  item: {
    tenantId: string;
    id: string;
    item_number: string;
    name: string;
    category: string | null;
    quantityOnHand: number | string | { toNumber: () => number };
    reorder_level: number | null | { toNumber: () => number };
    unitCost: number | string | { toNumber: () => number };
    createdAt: Date;
    updatedAt: Date;
  },
  quantityOnHand: number,
  reorderLevel: number,
  parLevel: number | null,
  totalValueItem: number,
  reorderStatus: StockReorderStatus,
  parStatus: "below_par" | "at_par" | "above_par" | "no_par_set",
  stockOutRisk: boolean,
  locationFilter: string | null,
  locationStock?: { quantity: number; lastCountedAt: Date | null },
  storageLocation?: { id: string; name: string }
): StockLevelWithStatus {
  const toNumber = (
    value: number | string | { toNumber: () => number }
  ): number => {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      return Number(value);
    }
    return value.toNumber();
  };

  return {
    tenantId: item.tenantId,
    id: item.id,
    inventoryItemId: item.id,
    storageLocationId: locationFilter,
    quantityOnHand: locationStock?.quantity ?? quantityOnHand,
    reorderLevel,
    parLevel,
    lastCountedAt: locationStock?.lastCountedAt ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    item: {
      id: item.id,
      itemNumber: item.item_number,
      name: item.name,
      category: item.category ?? "Uncategorized",
      unitCost: toNumber(item.unitCost),
      unit: null,
    },
    storageLocation: storageLocation
      ? { id: storageLocation.id, name: storageLocation.name }
      : null,
    reorderStatus,
    totalValue: totalValueItem,
    parStatus,
    stockOutRisk,
  };
}

/**
 * Build Prisma where clause from filters
 */
function buildWhereClause(
  tenantId: string,
  filters: StockLevelFilters
): Prisma.InventoryItemWhereInput {
  const where: Prisma.InventoryItemWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (filters.search) {
    where.OR = [
      { item_number: { contains: filters.search, mode: "insensitive" } },
      { name: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.category) {
    where.category = filters.category;
  }

  return where;
}

/**
 * Fetch storage locations for a tenant
 */
function fetchStorageLocations(tenantId: string) {
  return database.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name
    FROM tenant_inventory.storage_locations
    WHERE tenant_id = ${tenantId}
      AND deleted_at IS NULL
      AND is_active = true
    ORDER BY name ASC
  `;
}

/**
 * Resolve and validate location filter
 */
function resolveLocationFilter(
  filters: StockLevelFilters,
  storageLocations: Array<{ id: string; name: string }>
): string | null {
  if (!filters.locationId) {
    return null;
  }

  return storageLocations.some((l) => l.id === filters.locationId)
    ? filters.locationId
    : null;
}

interface QueryContext {
  items: Array<{
    id: string;
    tenantId: string;
    item_number: string;
    name: string;
    category: string | null;
    quantityOnHand: number | string | { toNumber: () => number };
    reorder_level: number | null | { toNumber: () => number };
    unitCost: number | string | { toNumber: () => number };
    createdAt: Date;
    updatedAt: Date;
  }>;
  stockByItemAndLocation: Map<
    string,
    Map<string, { quantity: number; lastCountedAt: Date | null }>
  >;
  storageLocations: Array<{ id: string; name: string }>;
}

interface ProcessedStockLevels {
  stockLevels: StockLevelWithStatus[];
  totalValue: number;
  belowParCount: number;
  outOfStockCount: number;
}

/**
 * Process items into stock levels with calculated status
 */
function processStockLevels(
  context: QueryContext,
  filters: StockLevelFilters,
  locationFilter: string | null
): ProcessedStockLevels {
  const stockLevels: StockLevelWithStatus[] = [];
  let totalValue = 0;
  let belowParCount = 0;
  let outOfStockCount = 0;

  for (const item of context.items) {
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

    if (
      !passesCalculatedFilters(
        reorderStatus,
        quantityOnHand,
        reorderLevel,
        filters
      )
    ) {
      continue;
    }

    totalValue += totalValueItem;

    if (parStatus === "below_par" || reorderStatus === "below_par") {
      belowParCount++;
    }

    if (quantityOnHand <= 0) {
      outOfStockCount++;
    }

    if (locationFilter) {
      addItemStockLevelForLocation(
        stockLevels,
        item,
        context.stockByItemAndLocation,
        context.storageLocations,
        locationFilter,
        quantityOnHand,
        reorderLevel,
        parLevel,
        totalValueItem,
        reorderStatus,
        parStatus,
        stockOutRisk
      );
    } else {
      stockLevels.push(
        createStockLevel(
          item,
          quantityOnHand,
          reorderLevel,
          parLevel,
          totalValueItem,
          reorderStatus,
          parStatus,
          stockOutRisk,
          null
        )
      );
    }
  }

  return { stockLevels, totalValue, belowParCount, outOfStockCount };
}

/**
 * Add stock level for a specific location
 */
function addItemStockLevelForLocation(
  stockLevels: StockLevelWithStatus[],
  item: {
    tenantId: string;
    id: string;
    item_number: string;
    name: string;
    category: string | null;
    quantityOnHand: number | string | { toNumber: () => number };
    reorder_level: number | null | { toNumber: () => number };
    unitCost: number | string | { toNumber: () => number };
    createdAt: Date;
    updatedAt: Date;
  },
  stockByItemAndLocation: Map<
    string,
    Map<string, { quantity: number; lastCountedAt: Date | null }>
  >,
  storageLocations: Array<{ id: string; name: string }>,
  locationFilter: string,
  quantityOnHand: number,
  reorderLevel: number,
  parLevel: number | null,
  totalValueItem: number,
  reorderStatus: StockReorderStatus,
  parStatus: "below_par" | "at_par" | "above_par" | "no_par_set",
  stockOutRisk: boolean
): void {
  const itemStockMap = stockByItemAndLocation.get(item.id);
  const locationStock = itemStockMap?.get(locationFilter);

  if (locationStock) {
    const storageLocation = storageLocations.find(
      (l) => l.id === locationFilter
    );

    stockLevels.push(
      createStockLevel(
        item,
        quantityOnHand,
        reorderLevel,
        parLevel,
        totalValueItem,
        reorderStatus,
        parStatus,
        stockOutRisk,
        locationFilter,
        locationStock,
        storageLocation
      )
    );
  }
}

interface StockLevelQueryResult {
  items: QueryContext["items"];
  stockByItemAndLocation: QueryContext["stockByItemAndLocation"];
  storageLocations: QueryContext["storageLocations"];
  locationFilter: string | null;
}

/**
 * Execute all database queries for stock levels
 */
async function executeStockLevelQueries(
  tenantId: string,
  filters: StockLevelFilters,
  page: number,
  limit: number
): Promise<StockLevelQueryResult> {
  const where = buildWhereClause(tenantId, filters);
  const storageLocations = await fetchStorageLocations(tenantId);
  const locationFilter = resolveLocationFilter(filters, storageLocations);

  const items = await database.inventoryItem.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const itemIds = items.map((item) => item.id);

  const stockRecords = await database.inventoryStock.findMany({
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

  const stockByItemAndLocation = groupStockByItemAndLocation(stockRecords);

  return { items, stockByItemAndLocation, storageLocations, locationFilter };
}

/**
 * Format successful response with stock levels data
 */
function formatStockLevelsResponse(
  stockLevels: StockLevelWithStatus[],
  page: number,
  limit: number,
  totalValue: number,
  belowParCount: number,
  outOfStockCount: number
) {
  const filteredTotal = stockLevels.length;

  return NextResponse.json({
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
}

/**
 * GET /api/inventory/stock-levels - List stock levels with pagination and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const filters = parseStockLevelFilters(searchParams);

    const { items, stockByItemAndLocation, storageLocations, locationFilter } =
      await executeStockLevelQueries(tenantId, filters, page, limit);

    const { stockLevels, totalValue, belowParCount, outOfStockCount } =
      processStockLevels(
        { items, stockByItemAndLocation, storageLocations },
        filters,
        locationFilter
      );

    return formatStockLevelsResponse(
      stockLevels,
      page,
      limit,
      totalValue,
      belowParCount,
      outOfStockCount
    );
  } catch (error) {
    console.error("Failed to list stock levels:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
