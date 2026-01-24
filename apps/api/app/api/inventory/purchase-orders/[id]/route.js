/**
 * Individual Purchase Order API Endpoints
 *
 * GET    /api/inventory/purchase-orders/[id]      - Get a single purchase order by ID
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/inventory/purchase-orders/[id] - Get a single purchase order by ID
 */
async function GET(request, context) {
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
    const { id } = await context.params;
    if (!id) {
      return server_2.NextResponse.json(
        { message: "Purchase order ID is required" },
        { status: 400 }
      );
    }
    // Get purchase order with items
    const order = await database_1.database.purchaseOrder.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        items: {
          where: { deletedAt: null },
        },
      },
    });
    if (!order) {
      return server_2.NextResponse.json(
        { message: "Purchase order not found" },
        { status: 404 }
      );
    }
    // Get inventory items for details
    const itemIds = order.items.map((item) => item.itemId);
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
    // Calculate receiving progress
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
    const totalItems = itemsWithDetails.length;
    const receivedItems = itemsWithDetails.filter(
      (item) => item.quantity_received >= item.quantity_ordered
    ).length;
    const percentage = totalItems > 0 ? (receivedItems / totalItems) * 100 : 0;
    const progress = {
      total_items: totalItems,
      received_items: receivedItems,
      percentage: Math.round(percentage),
    };
    const orderWithDetails = {
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
    return server_2.NextResponse.json(orderWithDetails);
  } catch (error) {
    console.error("Failed to get purchase order:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
