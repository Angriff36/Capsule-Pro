/**
 * Update Purchase Order Item Quality Status
 *
 * PUT    /api/inventory/purchase-orders/[id]/items/[itemId]/quality      - Update quality status for an item
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUT = PUT;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../../../../validation");
/**
 * PUT /api/inventory/purchase-orders/[id]/items/[itemId]/quality - Update quality status
 */
async function PUT(request, context) {
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
    const { id, itemId } = await context.params;
    if (!(id && itemId)) {
      return server_2.NextResponse.json(
        { message: "Purchase order ID and item ID are required" },
        { status: 400 }
      );
    }
    const body = await request.json();
    (0, validation_1.validateUpdateQualityStatusRequest)(body);
    // Verify the purchase order exists and belongs to the tenant
    const purchaseOrder = await database_1.database.purchaseOrder.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });
    if (!purchaseOrder) {
      return server_2.NextResponse.json(
        { message: "Purchase order not found" },
        { status: 404 }
      );
    }
    // Verify the item exists and belongs to the purchase order
    const poItem = await database_1.database.purchaseOrderItem.findFirst({
      where: {
        id: itemId,
        purchaseOrderId: id,
        tenantId,
        deletedAt: null,
      },
    });
    if (!poItem) {
      return server_2.NextResponse.json(
        { message: "Purchase order item not found" },
        { status: 404 }
      );
    }
    // Build update data
    const updateData = {
      qualityStatus: body.quality_status,
    };
    if (body.discrepancy_type !== undefined) {
      updateData.discrepancyType =
        body.discrepancy_type === "none" ? null : body.discrepancy_type;
    }
    if (body.discrepancy_amount !== undefined) {
      updateData.discrepancyAmount = body.discrepancy_amount;
    }
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }
    // Update the purchase order item
    const updatedItem = await database_1.database.purchaseOrderItem.update({
      where: { tenantId_id: { tenantId, id: itemId } },
      data: updateData,
    });
    return server_2.NextResponse.json({
      id: updatedItem.id,
      tenant_id: updatedItem.tenantId,
      purchase_order_id: updatedItem.purchaseOrderId,
      item_id: updatedItem.itemId,
      quantity_ordered: Number(updatedItem.quantityOrdered),
      quantity_received: Number(updatedItem.quantityReceived),
      unit_id: updatedItem.unitId,
      unit_cost: Number(updatedItem.unitCost),
      total_cost: Number(updatedItem.totalCost),
      quality_status: updatedItem.qualityStatus ?? "pending",
      discrepancy_type: updatedItem.discrepancyType,
      discrepancy_amount: updatedItem.discrepancyAmount
        ? Number(updatedItem.discrepancyAmount)
        : null,
      notes: updatedItem.notes,
      created_at: updatedItem.createdAt,
      updated_at: updatedItem.updatedAt,
      deleted_at: updatedItem.deletedAt,
    });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Failed to update quality status:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
