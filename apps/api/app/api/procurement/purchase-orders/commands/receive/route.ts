// Receive items against a PO
import { auth } from "@repo/auth/server";
import { Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
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
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { orderId, items } = await request.json();
    if (!(orderId && items?.length)) {
      return manifestErrorResponse("orderId and items required", 400);
    }

    const allReceived = await database.$transaction(async (tx) => {
      for (const item of items) {
        if (!item.itemId || item.quantityReceived == null) {
          continue;
        }

        const quantityReceived = new Prisma.Decimal(item.quantityReceived);
        const qualityStatus =
          Number(item.quantityReceived) >= Number(item.quantityOrdered)
            ? "accepted"
            : "partial";

        await tx.purchaseOrderItem.updateMany({
          where: {
            tenantId,
            purchaseOrderId: orderId,
            id: item.itemId,
            deletedAt: null,
          },
          data: {
            quantityReceived,
            qualityStatus,
          },
        });

        if (quantityReceived.gt(0)) {
          const purchaseOrderItem = await tx.purchaseOrderItem.findUnique({
            where: {
              tenantId_id: {
                tenantId,
                id: item.itemId,
              },
            },
            select: {
              itemId: true,
            },
          });

          if (purchaseOrderItem) {
            await tx.inventoryItem.updateMany({
              where: {
                tenantId,
                id: purchaseOrderItem.itemId,
                deletedAt: null,
              },
              data: {
                quantityOnHand: {
                  increment: quantityReceived,
                },
              },
            });
          }
        }
      }

      const receivedItems = await tx.purchaseOrderItem.findMany({
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
      const remaining = receivedItems.filter((item) =>
        item.quantityReceived.lt(item.quantityOrdered)
      ).length;

      if (remaining === 0) {
        await tx.purchaseOrder.update({
          where: {
            tenantId_id: {
              tenantId,
              id: orderId,
            },
          },
          data: {
            status: "received",
            receivedBy: userId,
            receivedAt: new Date(),
          },
        });
      }

      return remaining === 0;
    });

    return manifestSuccessResponse({ allReceived });
  } catch (error) {
    captureException(error);
    log.error("Error receiving PO items:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
