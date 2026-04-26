// Create a purchase order with line items
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

    const body = await request.json();
    const { vendorId, locationId, expectedDeliveryDate, notes, items } = body;

    if (!vendorId) return manifestErrorResponse("vendorId is required", 400);
    if (!(items && items.length))
      return manifestErrorResponse("At least one item is required", 400);

    // Generate PO number
    const count = await database.purchaseOrder.count({ where: { tenantId } });
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += Number(item.quantityOrdered) * Number(item.unitCost);
    }
    const total = subtotal; // Tax/shipping can be added later

    // Create PO with items in a transaction
    const po = await database.purchaseOrder.create({
      data: {
        tenantId,
        poNumber,
        vendorId,
        locationId: locationId || null,
        status: "submitted",
        subtotal,
        total,
        notes: notes || null,
        expectedDeliveryDate: expectedDeliveryDate
          ? new Date(expectedDeliveryDate)
          : null,
        submittedBy: userId,
        submittedAt: new Date(),
        items: {
          create: items.map((item: Record<string, unknown>) => {
            const itemTotal =
              Number(item.quantityOrdered) * Number(item.unitCost);
            return {
              tenantId,
              itemId: item.itemId as string,
              quantityOrdered: Number(item.quantityOrdered),
              unitId: (item.unitId as number) || 1,
              unitCost: Number(item.unitCost),
              totalCost: itemTotal,
            };
          }),
        },
      },
    });

    if (!po) return manifestErrorResponse("Failed to create PO", 500);

    return manifestSuccessResponse({
      order: {
        id: po.id,
        po_number: po.poNumber,
        status: po.status,
        subtotal: po.subtotal.toNumber(),
        total: po.total.toNumber(),
        created_at: po.createdAt,
      },
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
