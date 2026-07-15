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
  _request: NextRequest,
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

    // ponytail: vendor (needs order.vendorId) and items (needs only route id) are
    // independent of each other — fire both, then await together (inventoryItems
    // stays serial below since it depends on items). 3 serial round-trips -> 2.
    const [vendor, items] = await Promise.all([
      order.vendorId
        ? database.inventorySupplier.findFirst({
            where: { tenantId, id: order.vendorId, deletedAt: null },
            select: { name: true },
          })
        : Promise.resolve(null),
      database.purchaseOrderItem.findMany({
        where: { tenantId, purchaseOrderId: id, deletedAt: null },
        orderBy: { createdAt: "asc" },
      }),
    ]);

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
