/**
 * Complete Purchase Order Receiving Workflow
 *
 * POST   /api/inventory/purchase-orders/[id]/complete      - Complete receiving and update inventory
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../../validation");
/**
 * POST /api/inventory/purchase-orders/[id]/complete - Complete receiving workflow
 */
async function POST(request, context) {
  try {
    const { orgId, userId } = await (0, server_1.auth)();
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
    const body = await request.json();
    (0, validation_1.validateCompleteReceivingRequest)(body);
    // Get the purchase order with items
    const purchaseOrder = await database_1.database.purchaseOrder.findFirst({
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
    if (!purchaseOrder) {
      return server_2.NextResponse.json(
        { message: "Purchase order not found" },
        { status: 404 }
      );
    }
    // Create a map of item IDs to their updates
    const itemUpdatesMap = new Map(body.items.map((item) => [item.id, item]));
    // Validate all items belong to this purchase order
    const validItemIds = new Set(purchaseOrder.items.map((item) => item.id));
    for (const updateItem of body.items) {
      if (!validItemIds.has(updateItem.id)) {
        return server_2.NextResponse.json(
          {
            message: `Item ${updateItem.id} does not belong to this purchase order`,
          },
          { status: 400 }
        );
      }
    }
    // Use a transaction to ensure data consistency
    const result = await database_1.database.$transaction(async (tx) => {
      // Update all purchase order items
      const updatedItems = await Promise.all(
        body.items.map(async (updateItem) => {
          const poItem = purchaseOrder.items.find(
            (item) => item.id === updateItem.id
          );
          const quantityOrdered = Number(poItem.quantityOrdered);
          const quantityReceived = Number(updateItem.quantity_received);
          // Validate quantity received doesn't exceed quantity ordered
          if (quantityReceived > quantityOrdered) {
            throw new invariant_1.InvariantError(
              `Quantity received (${quantityReceived}) for item ${updateItem.id} cannot exceed quantity ordered (${quantityOrdered})`
            );
          }
          // Update the purchase order item
          const updated = await tx.purchaseOrderItem.update({
            where: { tenantId_id: { tenantId, id: updateItem.id } },
            data: {
              quantityReceived: updateItem.quantity_received,
              qualityStatus: updateItem.quality_status,
              discrepancyType:
                updateItem.discrepancy_type === "none"
                  ? null
                  : updateItem.discrepancy_type,
              discrepancyAmount: updateItem.discrepancy_amount ?? null,
              notes: updateItem.notes,
            },
          });
          return updated;
        })
      );
      // Create inventory transactions for received items
      const transactions = await Promise.all(
        updatedItems.map(async (item) => {
          const quantityReceived = Number(item.quantityReceived);
          const unitCost = Number(item.unitCost);
          // Only create transaction if quantity was received
          if (quantityReceived > 0) {
            const transaction = await tx.inventoryTransaction.create({
              data: {
                tenantId,
                itemId: item.itemId,
                transactionType: "purchase",
                quantity: quantityReceived,
                unit_cost: unitCost,
                reference: purchaseOrder.poNumber,
                notes:
                  body.notes ?? `Received via PO ${purchaseOrder.poNumber}`,
                transaction_date: new Date(),
                storage_location_id: purchaseOrder.locationId,
                reason: "purchase",
                referenceType: "purchase_order",
                referenceId: purchaseOrder.id,
                employee_id: userId ?? null,
              },
            });
            return transaction;
          }
          return null;
        })
      );
      // Update inventory item quantities (quantity on hand)
      await Promise.all(
        updatedItems.map(async (item) => {
          const quantityReceived = Number(item.quantityReceived);
          if (quantityReceived > 0) {
            // Get current inventory item
            const inventoryItem = await tx.inventoryItem.findFirst({
              where: {
                id: item.itemId,
                tenantId,
                deletedAt: null,
              },
            });
            if (inventoryItem) {
              const currentQuantity = Number(inventoryItem.quantityOnHand);
              const newQuantity = currentQuantity + quantityReceived;
              await tx.inventoryItem.update({
                where: { id: item.itemId },
                data: {
                  quantityOnHand: newQuantity,
                },
              });
            }
          }
        })
      );
      // Check if all items are fully received
      const allItemsReceived = updatedItems.every((item) => {
        const quantityOrdered = Number(item.quantityOrdered);
        const quantityReceived = Number(item.quantityReceived);
        return quantityReceived >= quantityOrdered;
      });
      // Update purchase order status
      const newStatus = allItemsReceived ? "received" : "partial";
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: newStatus,
          actualDeliveryDate: new Date(),
          receivedBy: userId ?? null,
          receivedAt: new Date(),
          notes: body.notes ?? purchaseOrder.notes,
        },
      });
      return {
        updatedItems,
        transactions: transactions.filter((t) => t !== null),
        newStatus,
      };
    });
    return server_2.NextResponse.json({
      message: "Receiving completed successfully",
      data: {
        purchase_order_id: id,
        items_updated: result.updatedItems.length,
        transactions_created: result.transactions.length,
        new_status: result.newStatus,
      },
    });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Failed to complete receiving:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
