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

    let allReceived = false;

    await database.$transaction(async (tx) => {
      for (const item of items) {
        if (!item.itemId || item.quantityReceived == null) continue;

        const qualityStatus =
          Number(item.quantityReceived) >= Number(item.quantityOrdered)
            ? "accepted"
            : "partial";

        // Get the PO item to find the inventory item ID
        const poItem = await tx.purchaseOrderItem.findFirst({
          where: {
            tenantId,
            purchaseOrderId: orderId,
            id: item.itemId,
            deletedAt: null,
          },
        });
        if (!poItem) continue;

        await tx.purchaseOrderItem.update({
          where: { tenantId_id: { tenantId, id: item.itemId } },
          data: {
            quantityReceived: Number(item.quantityReceived),
            qualityStatus,
          },
        });

        // Update inventory on hand
        if (Number(item.quantityReceived) > 0) {
          await tx.inventoryItem.update({
            where: { tenantId_id: { tenantId, id: poItem.itemId } },
            data: {
              quantityOnHand: { increment: Number(item.quantityReceived) },
            },
          });
        }
      }

      // Check if all items are fully received
      // Prisma cannot compare two columns, so fetch and check in JS
      const allItems = await tx.purchaseOrderItem.findMany({
        where: {
          tenantId,
          purchaseOrderId: orderId,
          deletedAt: null,
        },
        select: {
          quantityReceived: true,
          quantityOrdered: true,
        },
      });

      allReceived = allItems.every(
        (i) => i.quantityReceived.greaterThanOrEqualTo(i.quantityOrdered)
      );

      if (allReceived) {
        await tx.purchaseOrder.update({
          where: { tenantId_id: { tenantId, id: orderId } },
          data: {
            status: "received",
            receivedBy: userId,
            receivedAt: new Date(),
          },
        });
      }
    });

    return manifestSuccessResponse({ allReceived });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
