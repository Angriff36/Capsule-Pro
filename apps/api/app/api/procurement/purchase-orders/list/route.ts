// List purchase orders with vendor name and item count. Pagination policy is
// centralized in `@/lib/pagination` so a hostile or buggy client cannot
// request the entire purchase-orders table for a tenant in one round trip.
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

    let statusFilter = "";
    const params: (string | number)[] = [tenantId];
    if (status && status !== "all") {
      statusFilter = "AND po.status = $2";
      params.push(status);
    }
    // LIMIT/OFFSET param indices are dynamic because the optional status
    // filter consumes $2 when present; mirrors procurement/vendors/list.
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    params.push(limit, offset);

    const orders = await database.$queryRawUnsafe(
      `
      SELECT
        po.id, po.po_number, po.vendor_id, po.location_id, po.order_date,
        po.expected_delivery_date, po.actual_delivery_date, po.status,
        po.subtotal, po.tax_amount, po.shipping_amount, po.total,
        po.notes, po.submitted_at, po.received_at, po.created_at,
        v.name as vendor_name,
        COUNT(poi.id)::int as item_count,
        SUM(CASE WHEN poi.quantity_received < poi.quantity_ordered THEN 1 ELSE 0 END)::int as pending_items
      FROM tenant_inventory.purchase_orders po
      LEFT JOIN tenant_inventory.inventory_suppliers v ON v.id = po.vendor_id
      LEFT JOIN tenant_inventory.purchase_order_items poi ON poi.purchase_order_id = po.id AND poi.deleted_at IS NULL
      WHERE po.tenant_id = $1::uuid AND po.deleted_at IS NULL
        ${statusFilter}
      GROUP BY po.id, po.po_number, po.vendor_id, po.location_id, po.order_date,
        po.expected_delivery_date, po.actual_delivery_date, po.status,
        po.subtotal, po.tax_amount, po.shipping_amount, po.total,
        po.notes, po.submitted_at, po.received_at, po.created_at, v.name
      ORDER BY po.order_date DESC, po.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
      ...params
    );

    return manifestSuccessResponse({ orders, limit, offset });
  } catch (error) {
    captureException(error);
    console.error("Error listing purchase orders:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
