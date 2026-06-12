// Get single PO with items
import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
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
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;

    const order = await database.purchaseOrder.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!order) {
      return manifestErrorResponse("PO not found", 404);
    }

    // Fetch vendor name (no relation on PurchaseOrder → InventorySupplier)
    const vendor = order.vendorId
      ? await database.inventorySupplier.findFirst({
          where: { tenantId, id: order.vendorId, deletedAt: null },
          select: { name: true },
        })
      : null;

    // Fetch items with item names (no relation on PurchaseOrderItem → InventoryItem)
    const items = await database.purchaseOrderItem.findMany({
      where: { tenantId, purchaseOrderId: id, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    // Resolve item names for display
    const itemIds = items.map((i) => i.itemId);
    const inventoryItems =
      itemIds.length > 0
        ? await database.inventoryItem.findMany({
            where: { tenantId, id: { in: itemIds } },
            select: {
              id: true,
              name: true,
              item_number: true,
              unitOfMeasure: true,
            },
          })
        : [];

    const itemMap = new Map(inventoryItems.map((i) => [i.id, i]));
    const itemsWithNames = items.map((poi) => ({
      ...poi,
      itemName: itemMap.get(poi.itemId)?.name ?? null,
      itemNumber: itemMap.get(poi.itemId)?.item_number ?? null,
      unitOfMeasure: itemMap.get(poi.itemId)?.unitOfMeasure ?? null,
    }));

    return manifestSuccessResponse({
      order: { ...order, vendorName: vendor?.name ?? null },
      items: itemsWithNames,
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching purchase order:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
