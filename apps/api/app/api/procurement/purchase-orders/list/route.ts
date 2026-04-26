// List purchase orders with vendor name and item count
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    const whereClause: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };
    if (status && status !== "all") {
      whereClause.status = status;
    }

    const orders = await database.purchaseOrder.findMany({
      where: whereClause,
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      include: {
        items: {
          where: { deletedAt: null },
          select: {
            id: true,
            quantityReceived: true,
            quantityOrdered: true,
          },
        },
      },
    });

    // Collect vendor IDs for batch lookup
    const vendorIds = [
      ...new Set(orders.map((o) => o.vendorId).filter(Boolean)),
    ];
    const vendors = await database.inventorySupplier.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, name: true },
    });
    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));

    const ordersMapped = orders.map((po) => ({
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
      submitted_at: po.submittedAt,
      received_at: po.receivedAt,
      created_at: po.createdAt,
      vendor_name: vendorMap.get(po.vendorId) ?? null,
      item_count: po.items.length,
      pending_items: po.items.filter(
        (i) => i.quantityReceived.lessThan(i.quantityOrdered)
      ).length,
    }));

    return manifestSuccessResponse({ orders: ordersMapped });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
