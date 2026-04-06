// Receive items against a PO
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { orderId, items } = await request.json();
    if (!(orderId && items?.length))
      return manifestErrorResponse("orderId and items required", 400);

    for (const item of items) {
      if (!item.itemId || item.quantityReceived == null) continue;

      const qualityStatus =
        Number(item.quantityReceived) >= Number(item.quantityOrdered)
          ? "accepted"
          : "partial";

      await database.$queryRaw`
        UPDATE tenant_inventory.purchase_order_items
        SET
          quantity_received = ${item.quantityReceived}::decimal(10,2),
          quality_status = ${qualityStatus},
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}::uuid
          AND purchase_order_id = ${orderId}::uuid
          AND id = ${item.itemId}::uuid
          AND deleted_at IS NULL
      `;

      // Update inventory on hand
      if (Number(item.quantityReceived) > 0) {
        await database.$queryRaw`
          UPDATE tenant_inventory.inventory_items
          SET quantity_on_hand = quantity_on_hand + ${item.quantityReceived}::decimal(12,3)
          WHERE tenant_id = ${tenantId}::uuid AND id = (
            SELECT poi.item_id FROM tenant_inventory.purchase_order_items poi
            WHERE poi.tenant_id = ${tenantId}::uuid AND poi.id = ${item.itemId}::uuid
          )
        `;
      }
    }

    // Check if all items are fully received
    const remaining = await database.$queryRaw`
      SELECT COUNT(*)::int as count FROM tenant_inventory.purchase_order_items
      WHERE tenant_id = ${tenantId}::uuid AND purchase_order_id = ${orderId}::uuid
        AND deleted_at IS NULL AND quantity_received < quantity_ordered
    `;

    const allReceived = (remaining as any[])[0]?.count === 0;

    if (allReceived) {
      await database.$queryRaw`
        UPDATE tenant_inventory.purchase_orders
        SET status = 'received', received_by = ${userId}::uuid, received_at = NOW(), updated_at = NOW()
        WHERE tenant_id = ${tenantId}::uuid AND id = ${orderId}::uuid
      `;
    }

    return manifestSuccessResponse({ allReceived });
  } catch (error) {
    captureException(error);
    console.error("Error receiving PO items:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
