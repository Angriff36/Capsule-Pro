/**
 * Inventory Transaction History API Endpoint
 *
 * GET    /api/inventory/stock-levels/transactions      - List transaction history
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
    Math.max(Number.parseInt(searchParams.get("limit") || "50", 10), 1),
    100
  );
  return { page, limit };
}
/**
 * Parse transaction filters from URL search params
 */
function parseTransactionFilters(searchParams) {
  const filters = {};
  const inventoryItemId = searchParams.get("inventoryItemId");
  if (inventoryItemId) {
    filters.inventoryItemId = inventoryItemId;
  }
  const transactionType = searchParams.get("transactionType");
  if (transactionType) {
    filters.transactionType = transactionType;
  }
  const locationId = searchParams.get("locationId");
  if (locationId) {
    filters.locationId = locationId;
  }
  const startDate = searchParams.get("startDate");
  if (startDate) {
    filters.startDate = startDate;
  }
  const endDate = searchParams.get("endDate");
  if (endDate) {
    filters.endDate = endDate;
  }
  return filters;
}
/**
 * GET /api/inventory/stock-levels/transactions - List transaction history
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
    const filters = parseTransactionFilters(searchParams);
    // Build where clause
    const where = {
      tenantId,
    };
    // Item filter
    if (filters.inventoryItemId) {
      where.itemId = filters.inventoryItemId;
    }
    // Transaction type filter
    if (filters.transactionType) {
      where.transactionType = filters.transactionType;
    }
    // Location filter
    if (filters.locationId) {
      where.storage_location_id = filters.locationId;
    }
    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.transaction_date = {};
      if (filters.startDate) {
        where.transaction_date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.transaction_date.lte = new Date(filters.endDate);
      }
    }
    // Get total count for pagination
    const total = await database_1.database.inventoryTransaction.count({
      where,
    });
    // Get transactions with pagination
    const transactions =
      await database_1.database.inventoryTransaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ transaction_date: "desc" }, { createdAt: "desc" }],
      });
    // Get related item details
    const itemIds = [...new Set(transactions.map((t) => t.itemId))];
    const items = await database_1.database.inventoryItem.findMany({
      where: {
        tenantId,
        id: { in: itemIds },
      },
      select: {
        id: true,
        item_number: true,
        name: true,
        category: true,
      },
    });
    const itemsMap = new Map(items.map((item) => [item.id, item]));
    // Get storage locations for name lookup
    const locationIds = [
      ...new Set(
        transactions
          .map((t) => t.storage_location_id)
          .filter((id) => id !== "00000000-0000-0000-0000-000000000000")
      ),
    ];
    const locations =
      locationIds.length > 0
        ? await database_1.database.$queryRaw`
        SELECT id, name
        FROM tenant_inventory.storage_locations
        WHERE tenant_id = ${tenantId}
          AND id = ANY(${locationIds}::uuid[])
          AND deleted_at IS NULL
      `
        : [];
    const locationsMap = new Map(locations.map((loc) => [loc.id, loc]));
    // Get user details for employee_id
    const userIds = [
      ...new Set(
        transactions.map((t) => t.employee_id).filter((id) => id !== null)
      ),
    ];
    const users =
      userIds.length > 0
        ? await database_1.database.user.findMany({
            where: {
              id: { in: userIds },
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          })
        : [];
    const usersMap = new Map(users.map((user) => [user.id, user]));
    // Build response with details
    const data = transactions.map((transaction) => {
      const item = itemsMap.get(transaction.itemId);
      const location = locationsMap.get(transaction.storage_location_id);
      const user = transaction.employee_id
        ? usersMap.get(transaction.employee_id)
        : null;
      return {
        tenantId: transaction.tenantId,
        id: transaction.id,
        inventoryItemId: transaction.itemId,
        transactionType: transaction.transactionType,
        quantity: Number(transaction.quantity),
        unitCost: Number(transaction.unit_cost),
        totalCost: transaction.total_cost
          ? Number(transaction.total_cost)
          : null,
        referenceId: transaction.referenceId,
        referenceType: transaction.referenceType,
        storageLocationId: transaction.storage_location_id,
        reason: transaction.reason,
        notes: transaction.notes,
        performedBy: transaction.employee_id,
        createdAt: transaction.createdAt,
        item: item
          ? {
              id: item.id,
              itemNumber: item.item_number,
              name: item.name,
              category: item.category,
            }
          : null,
        storageLocation: location
          ? {
              id: location.id,
              name: location.name,
            }
          : null,
        performedByUser: user
          ? {
              id: user.id,
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
            }
          : null,
      };
    });
    const response = {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    return server_2.NextResponse.json(response);
  } catch (error) {
    console.error("Failed to list transactions:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
