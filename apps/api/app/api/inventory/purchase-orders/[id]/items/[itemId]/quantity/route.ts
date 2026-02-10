/**
 * Update Purchase Order Item Quantity Received
 *
 * PUT    /api/inventory/purchase-orders/[id]/items/[itemId]/quantity      - Update quantity received for an item
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { validateUpdateQuantityReceivedRequest } from "../../../../validation";
import { createOutboxEvent } from "@repo/realtime";

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * PUT /api/inventory/purchase-orders/[id]/items/[itemId]/quantity - Update quantity received
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
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

    const { id, itemId } = await context.params;

    if (!(id && itemId)) {
      return NextResponse.json(
        { message: "Purchase order ID and item ID are required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    validateUpdateQuantityReceivedRequest(body);

    // Verify the purchase order exists and belongs to the tenant
    const purchaseOrder = await database.purchaseOrder.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { message: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Verify the item exists and belongs to the purchase order
    const poItem = await database.purchaseOrderItem.findFirst({
      where: {
        id: itemId,
        purchaseOrderId: id,
        tenantId,
        deletedAt: null,
      },
      include: {
        purchaseOrder: {
          select: { id: true, status: true },
        },
      },
    });

    if (!poItem) {
      return NextResponse.json(
        { message: "Purchase order item not found" },
        { status: 404 }
      );
    }

    // Validate quantity received doesn't exceed quantity ordered (unless explicitly allowed)
    const quantityOrdered = Number(poItem.quantityOrdered);
    const newQuantityReceived = Number(body.quantity_received);
    const oldQuantityReceived = Number(poItem.quantityReceived);

    if (newQuantityReceived > quantityOrdered) {
      return NextResponse.json(
        {
          message: `Quantity received (${newQuantityReceived}) cannot exceed quantity ordered (${quantityOrdered})`,
        },
        { status: 400 }
      );
    }

    // Calculate the incremental quantity received
    const incrementalQuantity = newQuantityReceived - oldQuantityReceived;

    // Use a transaction to ensure data consistency
    const result = await database.$transaction(async (tx) => {
      // Update the purchase order item
      const updatedItem = await tx.purchaseOrderItem.update({
        where: { tenantId_id: { tenantId, id: itemId } },
        data: {
          quantityReceived: body.quantity_received,
        },
      });

      // Only proceed with stock increment if there's a positive increment
      if (incrementalQuantity > 0) {
        // Get or create the inventory item
        let inventoryItem = await tx.inventoryItem.findFirst({
          where: {
            id: poItem.itemId,
            tenantId,
            deletedAt: null,
          },
        });

        if (!inventoryItem) {
          throw new InvariantError(
            `Inventory item ${poItem.itemId} not found. Cannot update stock levels.`
          );
        }

        const currentQuantity = Number(inventoryItem.quantityOnHand);
        const newQuantity = currentQuantity + incrementalQuantity;
        const unitCost = Number(poItem.unitCost);

        // Update inventory item quantity on hand
        await tx.inventoryItem.update({
          where: { id: poItem.itemId },
          data: {
            quantityOnHand: newQuantity,
          },
        });

        // Create inventory transaction record
        await tx.inventoryTransaction.create({
          data: {
            tenantId,
            itemId: poItem.itemId,
            transactionType: "purchase",
            quantity: incrementalQuantity,
            unit_cost: poItem.unitCost,
            reference: purchaseOrder.poNumber,
            notes: `Incremental receipt via PO ${purchaseOrder.poNumber}`,
            transaction_date: new Date(),
            storage_location_id: purchaseOrder.locationId,
            reason: "purchase",
            referenceType: "purchase_order",
            referenceId: purchaseOrder.id,
            employee_id: userId ?? null,
          },
        });

        // Emit outbox event for real-time inventory updates
        await createOutboxEvent(tx, {
          tenantId,
          aggregateType: "InventoryItem",
          aggregateId: poItem.itemId,
          eventType: "inventory.item.quantity_updated",
          payload: {
            inventoryItemId: poItem.itemId,
            quantityBefore: currentQuantity,
            quantityAfter: newQuantity,
            incrementalQuantity,
            purchaseOrderId: purchaseOrder.id,
            purchaseOrderNumber: purchaseOrder.poNumber,
            purchaseOrderItemId: poItem.id,
            transactionType: "purchase",
            locationId: purchaseOrder.locationId,
            userId: userId ?? null,
            timestamp: new Date().toISOString(),
          },
        });

        // Emit outbox event for purchase order item update
        await createOutboxEvent(tx, {
          tenantId,
          aggregateType: "PurchaseOrderItem",
          aggregateId: poItem.id,
          eventType: "inventory.purchase_order.item.quantity_received_updated",
          payload: {
            purchaseOrderItemId: poItem.id,
            purchaseOrderId: purchaseOrder.id,
            purchaseOrderNumber: purchaseOrder.poNumber,
            oldQuantityReceived: oldQuantityReceived,
            newQuantityReceived,
            incrementalQuantity,
            userId: userId ?? null,
            timestamp: new Date().toISOString(),
          },
        });

        return {
          updatedItem,
          inventoryUpdated: true,
          quantityBefore: currentQuantity,
          quantityAfter: newQuantity,
        };
      }

      // Even with zero or negative increment, emit an event for PO item update
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "PurchaseOrderItem",
        aggregateId: poItem.id,
        eventType: "inventory.purchase_order.item.quantity_received_updated",
        payload: {
          purchaseOrderItemId: poItem.id,
          purchaseOrderId: purchaseOrder.id,
          purchaseOrderNumber: purchaseOrder.poNumber,
          oldQuantityReceived,
          newQuantityReceived,
          incrementalQuantity,
          userId: userId ?? null,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        updatedItem,
        inventoryUpdated: false,
      };
    });

    return NextResponse.json({
      id: result.updatedItem.id,
      tenant_id: result.updatedItem.tenantId,
      purchase_order_id: result.updatedItem.purchaseOrderId,
      item_id: result.updatedItem.itemId,
      quantity_ordered: Number(result.updatedItem.quantityOrdered),
      quantity_received: Number(result.updatedItem.quantityReceived),
      unit_id: result.updatedItem.unitId,
      unit_cost: Number(result.updatedItem.unitCost),
      total_cost: Number(result.updatedItem.totalCost),
      quality_status: result.updatedItem.qualityStatus ?? "pending",
      discrepancy_type: result.updatedItem.discrepancyType,
      discrepancy_amount: result.updatedItem.discrepancyAmount
        ? Number(result.updatedItem.discrepancyAmount)
        : null,
      notes: result.updatedItem.notes,
      created_at: result.updatedItem.createdAt,
      updated_at: result.updatedItem.updatedAt,
      deleted_at: result.updatedItem.deletedAt,
      ...(result.inventoryUpdated && {
        inventory_update: {
          quantity_before: result.quantityBefore,
          quantity_after: result.quantityAfter,
          incremental_quantity: incrementalQuantity,
        },
      }),
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to update quantity received:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
