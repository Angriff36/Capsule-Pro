/**
 * Update Purchase Order Item Quality Status
 *
 * PUT    /api/inventory/purchase-orders/[id]/items/[itemId]/quality      - Update quality status for an item
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { validateUpdateQualityStatusRequest } from "../../../../validation";

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

/**
 * PUT /api/inventory/purchase-orders/[id]/items/[itemId]/quality - Update quality status
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

    if (!id || !itemId) {
      return NextResponse.json(
        { message: "Purchase order ID and item ID are required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    validateUpdateQualityStatusRequest(body);

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
    });

    if (!poItem) {
      return NextResponse.json(
        { message: "Purchase order item not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: {
      qualityStatus: string;
      discrepancyType?: string | null;
      discrepancyAmount?: number | null;
      notes?: string | null;
    } = {
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
    const updatedItem = await database.purchaseOrderItem.update({
      where: { tenantId_id: { tenantId, id: itemId } },
      data: updateData,
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
    console.error("Failed to update quality status:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
