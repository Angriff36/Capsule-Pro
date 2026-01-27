/**
 * Complete Purchase Order Receiving Workflow
 *
 * POST   /api/inventory/purchase-orders/[id]/complete      - Complete receiving and update inventory
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CompleteReceivingRequest } from "../../types";
import { validateCompleteReceivingRequest } from "../../validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/inventory/purchase-orders/[id]/complete - Complete receiving workflow
 */
export async function POST(request: Request, context: RouteContext) {
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "Purchase order ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    validateCompleteReceivingRequest(body);

    // Get the purchase order with items
    const purchaseOrder = await database.purchaseOrder.findFirst({
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
      return NextResponse.json(
        { message: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Validate all items belong to this purchase order
    const validItemIds = new Set(purchaseOrder.items.map((item) => item.id));
    for (const updateItem of body.items) {
      if (!validItemIds.has(updateItem.id)) {
        return NextResponse.json(
          {
            message: `Item ${updateItem.id} does not belong to this purchase order`,
          },
          { status: 400 }
        );
      }
    }

    // Use a transaction to ensure data consistency
    const result = await database.$transaction(async (tx) => {
      // Update all purchase order items
      const updatedItems = await Promise.all(
        body.items.map(
          async (updateItem: CompleteReceivingRequest["items"][number]) => {
            const poItem = purchaseOrder.items.find(
              (item) => item.id === updateItem.id
            );
            if (!poItem) {
              throw new InvariantError(
                `Item ${updateItem.id} not found in purchase order`
              );
            }

            const quantityOrdered = Number(poItem.quantityOrdered);
            const quantityReceived = Number(updateItem.quantity_received);

            // Validate quantity received doesn't exceed quantity ordered
            if (quantityReceived > quantityOrdered) {
              throw new InvariantError(
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
          }
        )
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

    return NextResponse.json({
      message: "Receiving completed successfully",
      data: {
        purchase_order_id: id,
        items_updated: result.updatedItems.length,
        transactions_created: result.transactions.length,
        new_status: result.newStatus,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to complete receiving:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
