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

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * PUT /api/inventory/purchase-orders/[id]/items/[itemId]/quantity - Update quantity received
 */
export async function PUT(request: Request, context: RouteContext) {
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
    const quantityReceived = Number(body.quantity_received);

    if (quantityReceived > quantityOrdered) {
      return NextResponse.json(
        {
          message: `Quantity received (${quantityReceived}) cannot exceed quantity ordered (${quantityOrdered})`,
        },
        { status: 400 }
      );
    }

    // Update the purchase order item
    const updatedItem = await database.purchaseOrderItem.update({
      where: { tenantId_id: { tenantId, id: itemId } },
      data: {
        quantityReceived: body.quantity_received,
      },
    });

    return NextResponse.json({
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
