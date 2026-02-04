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

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

async function verifyPurchaseOrderExists(
  id: string,
  tenantId: string
): Promise<boolean> {
  const purchaseOrder = await database.purchaseOrder.findFirst({
    where: {
      id,
      tenantId,
      deletedAt: null,
    },
  });
  return !!purchaseOrder;
}

async function verifyPurchaseOrderItemExists(
  itemId: string,
  purchaseOrderId: string,
  tenantId: string
): Promise<boolean> {
  const poItem = await database.purchaseOrderItem.findFirst({
    where: {
      id: itemId,
      purchaseOrderId,
      tenantId,
      deletedAt: null,
    },
  });
  return !!poItem;
}

function buildQualityUpdateData(body: {
  quality_status: string;
  discrepancy_type?: string;
  discrepancy_amount?: number;
  notes?: string;
}): {
  qualityStatus: string;
  discrepancyType?: string | null;
  discrepancyAmount?: number | null;
  notes?: string | null;
} {
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

  return updateData;
}

function formatQualityUpdateResponse(updatedItem: {
  id: string;
  tenantId: string;
  purchaseOrderId: string;
  itemId: string;
  quantityOrdered: { toNumber: () => number } | bigint | number;
  quantityReceived: { toNumber: () => number } | bigint | number;
  unitId: string | number;
  unitCost: { toNumber: () => number } | number;
  totalCost: { toNumber: () => number } | number;
  qualityStatus: string | null;
  discrepancyType: string | null;
  discrepancyAmount: { toNumber: () => number } | number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  const toNum = (
    val: { toNumber?: () => number } | bigint | number | null
  ): number | null => {
    if (val === null) {
      return null;
    }
    if (typeof val === "bigint") {
      return Number(val);
    }
    if (typeof val === "number") {
      return val;
    }
    if (val && typeof val === "object" && "toNumber" in val && val.toNumber) {
      return val.toNumber();
    }
    return Number(val);
  };

  return {
    id: updatedItem.id,
    tenant_id: updatedItem.tenantId,
    purchase_order_id: updatedItem.purchaseOrderId,
    item_id: updatedItem.itemId,
    quantity_ordered: toNum(updatedItem.quantityOrdered),
    quantity_received: toNum(updatedItem.quantityReceived),
    unit_id: updatedItem.unitId,
    unit_cost: toNum(updatedItem.unitCost),
    total_cost: toNum(updatedItem.totalCost),
    quality_status: updatedItem.qualityStatus ?? "pending",
    discrepancy_type: updatedItem.discrepancyType,
    discrepancy_amount: toNum(updatedItem.discrepancyAmount),
    notes: updatedItem.notes,
    created_at: updatedItem.createdAt,
    updated_at: updatedItem.updatedAt,
    deleted_at: updatedItem.deletedAt,
  };
}

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

    if (!(id && itemId)) {
      return NextResponse.json(
        { message: "Purchase order ID and item ID are required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    validateUpdateQualityStatusRequest(body);

    const purchaseOrderExists = await verifyPurchaseOrderExists(id, tenantId);
    if (!purchaseOrderExists) {
      return NextResponse.json(
        { message: "Purchase order not found" },
        { status: 404 }
      );
    }

    const poItemExists = await verifyPurchaseOrderItemExists(
      itemId,
      id,
      tenantId
    );
    if (!poItemExists) {
      return NextResponse.json(
        { message: "Purchase order item not found" },
        { status: 404 }
      );
    }

    const updateData = buildQualityUpdateData(body);

    const updatedItem = await database.purchaseOrderItem.update({
      where: { tenantId_id: { tenantId, id: itemId } },
      data: updateData,
    });

    return NextResponse.json(formatQualityUpdateResponse(updatedItem));
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
