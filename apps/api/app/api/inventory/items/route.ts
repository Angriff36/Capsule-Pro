/**
 * Inventory Items API Endpoints
 *
 * GET    /api/inventory/items      - List items with pagination and filters
 * POST   /api/inventory/items      - Create a new inventory item (manifest command)
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import type {
  FSAStatus,
  InventoryItemListFilters,
  InventoryItemWithStatus,
  ItemCategory,
  StockStatus,
} from "./types";
import { FSA_STATUSES, ITEM_CATEGORIES } from "./types";

interface PaginationParams {
  limit: number;
  page: number;
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
 * Prisma row type for an inventory item (default findMany payload).
 */
type InventoryItemRow = Awaited<
  ReturnType<typeof database.inventoryItem.findMany>
>[number];

/**
 * Map a hydrated inventory row to the API response shape with computed
 * `stock_status` and `total_value`. Pure — stock-status *filtering* is applied
 * in SQL (see buildStockStatusConditions), not here.
 */
function mapInventoryItemWithStatus(
  item: InventoryItemRow
): InventoryItemWithStatus {
  const quantityOnHand = Number(item.quantityOnHand);
  const reorderLevel = Number(item.reorder_level);
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
    stock_status: calculateStockStatus(quantityOnHand, reorderLevel),
    total_value: quantityOnHand * Number(item.unitCost),
  };
}

/**
 * Build the parameterized SQL WHERE conditions for a stock-status-filtered
 * inventory query.
 *
 * Stock status compares `quantity_on_hand` against `reorder_level` — a
 * column-to-column predicate Prisma's `where` cannot express — so it is
 * resolved in SQL via a CASE that mirrors `calculateStockStatus` exactly. This
 * fixes the prior behavior where `low_stock` always returned empty (SQL filtered
 * `qty <= 0` then JS discarded every row) and `in_stock` leaked low-stock rows.
 * The remaining filters mirror the Prisma `where` built for the non-stock path.
 */
function buildStockStatusConditions(
  tenantId: string,
  filters: InventoryItemListFilters
): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`tenant_id = ${tenantId}`,
    Prisma.sql`deleted_at IS NULL`,
    Prisma.sql`(CASE WHEN quantity_on_hand <= 0 THEN 'out_of_stock'
                     WHEN quantity_on_hand <= reorder_level THEN 'low_stock'
                     ELSE 'in_stock' END) = ${filters.stock_status}`,
  ];
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      Prisma.sql`(item_number ILIKE ${pattern} OR name ILIKE ${pattern})`
    );
  }
  if (filters.category) {
    conditions.push(Prisma.sql`category = ${filters.category}`);
  }
  if (filters.supplier_id) {
    conditions.push(Prisma.sql`supplier_id = ${filters.supplier_id}`);
  }
  if (filters.fsa_status) {
    conditions.push(Prisma.sql`fsa_status = ${filters.fsa_status}`);
  }
  if (filters.tags && filters.tags.length > 0) {
    conditions.push(Prisma.sql`tags && ${filters.tags}::text[]`);
  }
  return conditions;
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

    // Stock status compares quantity_on_hand against reorder_level — a
    // column-to-column predicate Prisma `where` cannot express — so when a
    // stock_status filter is set, resolve the matching page of IDs + the total
    // in SQL (CASE mirrors calculateStockStatus), then hydrate full rows via
    // findMany to preserve the camelCase Decimal mapping the response relies on.
    if (filters.stock_status) {
      const conditions = buildStockStatusConditions(tenantId, filters);

      const countRows = await database.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) AS count
        FROM tenant_inventory.inventory_items
        WHERE ${Prisma.join(conditions, " AND ")}`;
      const total = countRows[0] ? Number(countRows[0].count) : 0;

      const idRows = await database.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM tenant_inventory.inventory_items
        WHERE ${Prisma.join(conditions, " AND ")}
        ORDER BY category ASC, name ASC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
      const pageIds = idRows.map((row) => row.id);

      const stockItems = pageIds.length
        ? await database.inventoryItem.findMany({
            where: { tenantId, id: { in: pageIds } },
            orderBy: [{ category: "asc" }, { name: "asc" }],
          })
        : [];
      // findMany({ id: { in } }) does not preserve the SQL ORDER BY, so remap
      // the hydrated rows back to the SQL-determined page order.
      const itemsById = new Map(stockItems.map((item) => [item.id, item]));
      const data = pageIds
        .map((id) => itemsById.get(id))
        .filter((item): item is InventoryItemRow => item !== undefined)
        .map(mapInventoryItemWithStatus);

      return NextResponse.json({
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // Total count + page of items are fully data-independent (both keyed only on
    // the shared `where`), so run them in one concurrent round instead of two
    // serial round-trips. The stock_status branch above resolves its own
    // count/IDs via SQL and is intentionally separate. Array order mirrors the
    // prior serial call order (count-first).
    const [total, items] = await Promise.all([
      database.inventoryItem.count({ where }),
      database.inventoryItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ category: "asc" }, { name: "asc" }],
      }),
    ]);

    // Calculate stock status and total value for each item
    const data = items.map(mapInventoryItemWithStatus);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    log.error("Failed to list inventory items:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/items - Create a new inventory item
 */
export async function POST(request: NextRequest) {
  log.info("[InventoryItem/POST] Delegating to manifest create command");
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runManifestCommand({
    entity: "InventoryItem",
    command: "create",
    body: {
      ...rawBody,
      unitCost: rawBody.unit_cost,
      quantityOnHand: rawBody.quantity_on_hand,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
