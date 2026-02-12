/**
 * Inventory Items API Endpoints
 *
 * GET    /api/inventory/items      - List items with pagination and filters
 * POST   /api/inventory/items      - Create a new inventory item
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  FSAStatus,
  InventoryItemListFilters,
  InventoryItemWithStatus,
  ItemCategory,
  StockStatus,
} from "./types";
import { FSA_STATUSES, ITEM_CATEGORIES } from "./types";
import { validateCreateInventoryItemRequest } from "./validation";

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
 * Parse inventory item list filters from URL search params
 */
function parseInventoryItemFilters(
  searchParams: URLSearchParams
): InventoryItemListFilters {
  const filters: InventoryItemListFilters = {};

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  const category = searchParams.get("category");
  if (category && ITEM_CATEGORIES.includes(category as ItemCategory)) {
    filters.category = category;
  }

  const supplierId = searchParams.get("supplier_id");
  if (supplierId) {
    filters.supplier_id = supplierId;
  }

  const stockStatus = searchParams.get("stock_status");
  if (
    stockStatus &&
    ["in_stock", "low_stock", "out_of_stock"].includes(stockStatus)
  ) {
    filters.stock_status = stockStatus as StockStatus;
  }

  const fsaStatus = searchParams.get("fsa_status");
  if (fsaStatus && FSA_STATUSES.includes(fsaStatus as FSAStatus)) {
    filters.fsa_status = fsaStatus as FSAStatus;
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
function calculateStockStatus(
  quantityOnHand: number,
  reorderLevel: number
): StockStatus {
  if (quantityOnHand <= 0) {
    return "out_of_stock";
  }
  if (quantityOnHand <= reorderLevel) {
    return "low_stock";
  }
  return "in_stock";
}

/**
 * GET /api/inventory/items - List inventory items with pagination and filters
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
    const filters = parseInventoryItemFilters(searchParams);

    // Build where clause
    const where: Prisma.InventoryItemWhereInput = {
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

    // Supplier filter
    if (filters.supplier_id) {
      where.supplierId = filters.supplier_id;
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
        default:
          // Exhaustive check - all StockStatus cases handled above
          break;
      }
    }

    // Get total count for pagination
    const total = await database.inventoryItem.count({ where });

    // Get items with pagination
    const items = await database.inventoryItem.findMany({
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
        description: item.description,
        category: item.category,
        unit_of_measure: item.unitOfMeasure,
        unit_cost: Number(item.unitCost),
        quantity_on_hand: quantityOnHand,
        par_level: Number(item.parLevel),
        reorder_level: reorderLevel,
        supplier_id: item.supplierId,
        tags: item.tags,
        fsa_status: (item.fsa_status ?? "unknown") as FSAStatus,
        fsa_temp_logged: item.fsa_temp_logged ?? false,
        fsa_allergen_info: item.fsa_allergen_info ?? false,
        fsa_traceable: item.fsa_traceable ?? false,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        deleted_at: item.deletedAt,
        stock_status: stockStatus,
        total_value: quantityOnHand * Number(item.unitCost),
      } as InventoryItemWithStatus | null;
    });

    const itemsWithStatus = mappedItems.filter(
      (item): item is InventoryItemWithStatus => item !== null
    );

    // Recalculate total after stock status filtering
    const filteredTotal =
      filters.stock_status === "low_stock" ? itemsWithStatus.length : total;

    return NextResponse.json({
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
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Format inventory item with calculated status fields
 */
function formatInventoryItemWithStatus(item: {
  id: string;
  tenantId: string;
  item_number: string;
  name: string;
  description: string | null;
  category: string;
  unitOfMeasure: string;
  unitCost: unknown;
  quantityOnHand: unknown;
  parLevel: unknown;
  reorder_level: unknown;
  supplierId: string | null;
  tags: string[];
  fsa_status: string | null;
  fsa_temp_logged: boolean | null;
  fsa_allergen_info: boolean | null;
  fsa_traceable: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): InventoryItemWithStatus {
  const quantityOnHand = Number(item.quantityOnHand);
  const reorderLevel = Number(item.reorder_level);
  const stockStatus = calculateStockStatus(quantityOnHand, reorderLevel);

  return {
    id: item.id,
    tenant_id: item.tenantId,
    item_number: item.item_number,
    name: item.name,
    description: item.description,
    category: item.category,
    unit_of_measure: item.unitOfMeasure,
    unit_cost: Number(item.unitCost),
    quantity_on_hand: quantityOnHand,
    par_level: Number(item.parLevel),
    reorder_level: reorderLevel,
    supplier_id: item.supplierId,
    tags: item.tags,
    fsa_status: (item.fsa_status ?? "unknown") as FSAStatus,
    fsa_temp_logged: item.fsa_temp_logged ?? false,
    fsa_allergen_info: item.fsa_allergen_info ?? false,
    fsa_traceable: item.fsa_traceable ?? false,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    deleted_at: item.deletedAt,
    stock_status: stockStatus,
    total_value: quantityOnHand * Number(item.unitCost),
  };
}

/**
 * Check if item number already exists for tenant
 */
async function checkExistingItemNumber(
  tenantId: string,
  itemNumber: string
): Promise<boolean> {
  const existing = await database.inventoryItem.findFirst({
    where: {
      tenantId,
      item_number: itemNumber,
      deletedAt: null,
    },
  });
  return existing !== null;
}

/**
 * POST /api/inventory/items - Create a new inventory item
 */
export async function POST(request: Request) {
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

    const body = await request.json();
    validateCreateInventoryItemRequest(body);

    const itemNumberExists = await checkExistingItemNumber(
      tenantId,
      body.item_number
    );
    if (itemNumberExists) {
      return NextResponse.json(
        { message: "Item number already exists" },
        { status: 409 }
      );
    }

    // Create inventory item
    const item = await database.inventoryItem.create({
      data: {
        tenantId,
        item_number: body.item_number,
        name: body.name,
        description: body.description ?? null,
        category: body.category,
        unitOfMeasure: body.unit_of_measure ?? "each",
        unitCost: body.unit_cost ?? 0,
        quantityOnHand: body.quantity_on_hand ?? 0,
        parLevel: body.par_level ?? 0,
        reorder_level: body.reorder_level ?? 0,
        supplierId: body.supplier_id ?? null,
        tags: body.tags ?? [],
        fsa_status: body.fsa_status ?? "unknown",
        fsa_temp_logged: body.fsa_temp_logged ?? false,
        fsa_allergen_info: body.fsa_allergen_info ?? false,
        fsa_traceable: body.fsa_traceable ?? false,
      },
    });

    const itemWithStatus = formatInventoryItemWithStatus(item);
    return NextResponse.json(itemWithStatus, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to create inventory item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
