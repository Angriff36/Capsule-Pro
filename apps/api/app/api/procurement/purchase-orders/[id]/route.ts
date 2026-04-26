// Get single PO with items
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { id } = await params;

    const po = await database.purchaseOrder.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!po) return manifestErrorResponse("PO not found", 404);

    // Get vendor name
    const vendor = po.vendorId
      ? await database.inventorySupplier.findFirst({
          where: { id: po.vendorId },
          select: { name: true },
        })
      : null;

    // Get PO items with inventory item details
    const items = await database.purchaseOrderItem.findMany({
      where: { tenantId, purchaseOrderId: id, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    // Batch-fetch inventory item details for the PO items
    const itemIds = items.map((i) => i.itemId);
    const inventoryItems = await database.inventoryItem.findMany({
      where: { id: { in: itemIds } },
      select: {
        id: true,
        name: true,
        item_number: true,
        unitOfMeasure: true,
      },
    });
    const inventoryMap = new Map(inventoryItems.map((ii) => [ii.id, ii]));

    const order = {
      id: po.id,
      po_number: po.poNumber,
      vendor_id: po.vendorId,
      location_id: po.locationId,
      order_date: po.orderDate,
      expected_delivery_date: po.expectedDeliveryDate,
      actual_delivery_date: po.actualDeliveryDate,
      status: po.status,
      subtotal: po.subtotal.toNumber(),
      tax_amount: po.taxAmount.toNumber(),
      shipping_amount: po.shippingAmount.toNumber(),
      total: po.total.toNumber(),
      notes: po.notes,
      submitted_by: po.submittedBy,
      submitted_at: po.submittedAt,
      received_by: po.receivedBy,
      received_at: po.receivedAt,
      created_at: po.createdAt,
      updated_at: po.updatedAt,
      vendor_name: vendor?.name ?? null,
    };

    const itemsMapped = items.map((poi) => {
      const ii = inventoryMap.get(poi.itemId);
      return {
        id: poi.id,
        purchase_order_id: poi.purchaseOrderId,
        item_id: poi.itemId,
        quantity_ordered: poi.quantityOrdered.toNumber(),
        quantity_received: poi.quantityReceived.toNumber(),
        unit_id: poi.unitId,
        unit_cost: poi.unitCost.toNumber(),
        total_cost: poi.totalCost.toNumber(),
        quality_status: poi.qualityStatus,
        discrepancy_type: poi.discrepancyType,
        discrepancy_amount: poi.discrepancyAmount?.toNumber() ?? null,
        notes: poi.notes,
        created_at: poi.createdAt,
        updated_at: poi.updatedAt,
        item_name: ii?.name ?? null,
        item_number: ii?.item_number ?? null,
        unit_of_measure: ii?.unitOfMeasure ?? null,
      };
    });

    return manifestSuccessResponse({ order, items: itemsMapped });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
