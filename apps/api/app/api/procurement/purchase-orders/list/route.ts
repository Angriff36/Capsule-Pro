// List purchase orders with vendor name and item count.
// Converted from $queryRawUnsafe to Prisma ORM.
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { clampLimit, clampOffset } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };
    if (status && status !== "all") {
      where.status = status;
    }

    const orders = await database.purchaseOrder.findMany({
      where,
      include: {
        items: {
          where: { deletedAt: null },
          select: {
            quantityOrdered: true,
            quantityReceived: true,
          },
        },
      },
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Batch fetch vendor names
    const vendorIds = [...new Set(orders.map((o) => o.vendorId))];
    const vendors =
      vendorIds.length > 0
        ? await database.inventorySupplier.findMany({
            where: { id: { in: vendorIds } },
            select: { id: true, name: true },
          })
        : [];
    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));

    const shaped = orders.map((po) => {
      const items = po.items ?? [];
      const pendingItems = items.filter(
        (i) => Number(i.quantityReceived) < Number(i.quantityOrdered),
      ).length;
      return {
        id: po.id,
        po_number: po.poNumber,
        vendor_id: po.vendorId,
        location_id: po.locationId,
        order_date: po.orderDate,
        expected_delivery_date: po.expectedDeliveryDate,
        actual_delivery_date: po.actualDeliveryDate,
        status: po.status,
        subtotal: po.subtotal,
        tax_amount: po.taxAmount,
        shipping_amount: po.shippingAmount,
        total: po.total,
        notes: po.notes,
        submitted_at: po.submittedAt,
        received_at: po.receivedAt,
        created_at: po.createdAt,
        vendor_name: vendorMap.get(po.vendorId) || null,
        item_count: items.length,
        pending_items: pendingItems,
      };
    });

    return manifestSuccessResponse({ orders: shaped, limit, offset });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
