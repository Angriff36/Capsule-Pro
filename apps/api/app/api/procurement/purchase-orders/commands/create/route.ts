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
import { log } from "@repo/observability/log";

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
    const countResult = await database.$queryRaw`
      SELECT COUNT(*)::int as count FROM tenant_inventory.purchase_orders WHERE tenant_id = ${tenantId}
    `;
    const count = (countResult as any[])[0]?.count || 0;
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += Number(item.quantityOrdered) * Number(item.unitCost);
    }
    const total = subtotal; // Tax/shipping can be added later

    // Create PO
    const poResult = await database.$queryRaw`
      INSERT INTO tenant_inventory.purchase_orders (
        tenant_id, po_number, vendor_id, location_id, status, subtotal, total,
        notes, expected_delivery_date, submitted_by, submitted_at
      ) VALUES (
        ${tenantId}::uuid, ${poNumber}, ${vendorId}::uuid, ${locationId || null}::uuid,
        'submitted', ${subtotal}::decimal(12,2), ${total}::decimal(12,2),
        ${notes || null}, ${expectedDeliveryDate ? new Date(expectedDeliveryDate) : null}::date,
        ${userId}::uuid, NOW()
      )
      RETURNING id, po_number, status, subtotal, total, created_at
    `;

    const po = (poResult as any[])[0];
    if (!po) return manifestErrorResponse("Failed to create PO", 500);

    // Create line items
    for (const item of items) {
      const itemTotal = Number(item.quantityOrdered) * Number(item.unitCost);
      await database.$queryRaw`
        INSERT INTO tenant_inventory.purchase_order_items (
          tenant_id, purchase_order_id, item_id, quantity_ordered, unit_id, unit_cost, total_cost
        ) VALUES (
          ${tenantId}::uuid, ${po.id}::uuid, ${item.itemId}::uuid,
          ${item.quantityOrdered}::decimal(10,2), ${item.unitId || 1},
          ${item.unitCost}::decimal(10,4), ${itemTotal}::decimal(12,2)
        )
      `;
    }

    return manifestSuccessResponse({ order: po });
  } catch (error) {
    captureException(error);
    log.error("Error creating purchase order:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
