/**
 * Complete Purchase Order Receiving Workflow
 *
 * POST   /api/inventory/purchase-orders/[id]/complete      - Complete receiving and update inventory
 *
 * TODO(manifest-migration): This route performs multi-entity orchestration (update PO items,
 * create inventory transactions, update inventory quantities, change PO status) that does not
 * map to a single manifest command. The available PurchaseOrder.markReceived command only
 * handles the PO header status change. Migrating this route requires either:
 *   1. A new "completeReceiving" command that orchestrates item updates + inventory mutations,
 *      or
 *   2. Event handlers on PurchaseOrderReceived that perform the inventory side effects.
 * Until then, this route remains hybrid (direct Prisma writes).
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import type { CompleteReceivingRequest } from "../../types";
import { validateCompleteReceivingRequest } from "../../validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/inventory/purchase-orders/[id]/complete - Complete receiving workflow
 */
export async function POST(request: Request, context: RouteContext) {
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

    // received_by is a uuid column and employee_id is a person column resolved
    // against tenant_staff.employees — the raw Clerk id ("user_…") 500s the uuid
    // cast (22P02) and misattributes the inventory transactions.
    const employeeId = (await requireCurrentUser()).id;

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

    // Idempotency guard: "received" and "cancelled" are terminal states (the
    // governed PurchaseOrder FSM treats them as such). This route adds
    // quantityReceived to InventoryItem.quantityOnHand on every call, so a
    // retried/duplicate POST against an already-completed PO would re-increment
    // stock (double-apply corruption). Honor the same terminal invariant the
    // runtime command enforces until this route is migrated (see header TODO).
    if (
      purchaseOrder.status === "received" ||
      purchaseOrder.status === "cancelled"
    ) {
      return NextResponse.json(
        {
          message: `Purchase order is already ${purchaseOrder.status} and cannot be received again`,
        },
        { status: 409 }
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
                unitCost,
                reference: purchaseOrder.poNumber,
                notes:
                  body.notes ?? `Received via PO ${purchaseOrder.poNumber}`,
                transactionDate: new Date(),
                storageLocationId: purchaseOrder.locationId,
                reason: "purchase",
                referenceType: "purchase_order",
                referenceId: purchaseOrder.id,
                employeeId,
              },
            });
            return transaction;
          }
          return null;
        })
      );

      // Get all inventory items in one query (fix N+1)
      const itemIds = updatedItems
        .filter((item) => Number(item.quantityReceived) > 0)
        .map((item) => item.itemId);

      const inventoryItems = await tx.inventoryItem.findMany({
        where: {
          id: { in: itemIds },
          tenantId,
          deletedAt: null,
        },
      });

      const inventoryItemMap = new Map(
        inventoryItems.map((item) => [item.id, item])
      );

      // Update inventory item quantities in batch (fix N+1)
      await Promise.all(
        updatedItems.map(async (item) => {
          const quantityReceived = Number(item.quantityReceived);

          if (quantityReceived > 0) {
            const inventoryItem = inventoryItemMap.get(item.itemId);
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
          receivedBy: employeeId,
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
    captureException(error);
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    log.error("Failed to complete receiving:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
