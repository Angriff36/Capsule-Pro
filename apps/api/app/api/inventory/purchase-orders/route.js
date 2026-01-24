/**
 * Purchase Orders API Endpoints
 *
 * GET    /api/inventory/purchase-orders      - List purchase orders with pagination and filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const types_1 = require("./types");
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
 * Parse purchase order list filters from URL search params
 */
function parsePurchaseOrderFilters(searchParams) {
  const filters = {};
  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }
  const poNumber = searchParams.get("po_number");
  if (poNumber) {
    filters.po_number = poNumber;
  }
  const status = searchParams.get("status");
  if (status && types_1.PO_STATUSES.includes(status)) {
    filters.status = status;
  }
  const vendorId = searchParams.get("vendor_id");
  if (vendorId) {
    filters.vendor_id = vendorId;
  }
  const locationId = searchParams.get("location_id");
  if (locationId) {
    filters.location_id = locationId;
  }
  return filters;
}
/**
 * Calculate receiving progress for a purchase order
 */
function calculateProgress(items) {
  const totalItems = items.length;
  const receivedItems = items.filter(
    (item) => Number(item.quantity_received) >= Number(item.quantity_ordered)
  ).length;
  const percentage = totalItems > 0 ? (receivedItems / totalItems) * 100 : 0;
  return {
    total_items: totalItems,
    received_items: receivedItems,
    percentage: Math.round(percentage),
  };
}
/**
 * GET /api/inventory/purchase-orders - List purchase orders with pagination and filters
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
    const filters = parsePurchaseOrderFilters(searchParams);
    // Build where clause
    const where = {
      tenantId,
      deletedAt: null,
    };
    // PO number filter (exact match)
    if (filters.po_number) {
      where.poNumber = {
        equals: filters.po_number,
        mode: "insensitive",
      };
    }
    // Search filter (po_number only - primary use case for receiving)
    if (filters.search && !filters.po_number) {
      where.poNumber = {
        contains: filters.search,
        mode: "insensitive",
      };
    }
    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }
    // Vendor filter
    if (filters.vendor_id) {
      where.vendorId = filters.vendor_id;
    }
    // Location filter
    if (filters.location_id) {
      where.locationId = filters.location_id;
    }
    // Get total count for pagination
    const total = await database_1.database.purchaseOrder.count({ where });
    // Get purchase orders with pagination
    const orders = await database_1.database.purchaseOrder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      include: {
        items: {
          where: { deletedAt: null },
        },
      },
    });
    // Get all inventory items for details
    const itemIds = orders
      .flatMap((order) => order.items.map((item) => item.itemId))
      .filter((id, index, self) => self.indexOf(id) === index);
    const inventoryItems =
      itemIds.length > 0
        ? await database_1.database.inventoryItem.findMany({
            where: { id: { in: itemIds }, deletedAt: null },
            select: { id: true, item_number: true, name: true },
          })
        : [];
    const inventoryItemMap = new Map(
      inventoryItems.map((item) => [item.id, item])
    );
    // Map orders to response format with details
    const mappedOrders = orders.map((order) => {
      const itemsWithDetails = order.items.map((item) => {
        const inventoryItem = inventoryItemMap.get(item.itemId);
        return {
          id: item.id,
          tenant_id: item.tenantId,
          purchase_order_id: item.purchaseOrderId,
          item_id: item.itemId,
          quantity_ordered: Number(item.quantityOrdered),
          quantity_received: Number(item.quantityReceived),
          unit_id: item.unitId,
          unit_cost: Number(item.unitCost),
          total_cost: Number(item.totalCost),
          quality_status: item.qualityStatus ?? "pending",
          discrepancy_type: item.discrepancyType,
          discrepancy_amount: item.discrepancyAmount
            ? Number(item.discrepancyAmount)
            : null,
          notes: item.notes,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
          deleted_at: item.deletedAt,
          item_number: inventoryItem?.item_number,
          item_name: inventoryItem?.name,
        };
      });
      const progress = calculateProgress(itemsWithDetails);
      return {
        id: order.id,
        tenant_id: order.tenantId,
        po_number: order.poNumber,
        vendor_id: order.vendorId,
        location_id: order.locationId,
        order_date: order.orderDate,
        expected_delivery_date: order.expectedDeliveryDate,
        actual_delivery_date: order.actualDeliveryDate,
        status: order.status,
        subtotal: Number(order.subtotal),
        tax_amount: Number(order.taxAmount),
        shipping_amount: Number(order.shippingAmount),
        total: Number(order.total),
        notes: order.notes,
        submitted_by: order.submittedBy,
        submitted_at: order.submittedAt,
        received_by: order.receivedBy,
        received_at: order.receivedAt,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
        deleted_at: order.deletedAt,
        items: itemsWithDetails,
        progress,
      };
    });
    return server_2.NextResponse.json({
      data: mappedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to list purchase orders:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
