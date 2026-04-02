// Get single PO with items
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { id } = await params;

    const orders = await database.$queryRawUnsafe(`
      SELECT
        po.*, v.name as vendor_name
      FROM tenant_inventory.purchase_orders po
      LEFT JOIN tenant_inventory.inventory_suppliers v ON v.id = po.vendor_id
      WHERE po.tenant_id = $1::uuid AND po.id = $2::uuid AND po.deleted_at IS NULL
    `, tenantId, id);

    if (!(orders as any[]).length) return manifestErrorResponse("PO not found", 404);

    const order = (orders as any[])[0];

    const items = await database.$queryRawUnsafe(`
      SELECT poi.*, ii.name as item_name, ii.item_number, ii.unit_of_measure
      FROM tenant_inventory.purchase_order_items poi
      LEFT JOIN tenant_inventory.inventory_items ii ON ii.id = poi.item_id
      WHERE poi.tenant_id = $1::uuid AND poi.purchase_order_id = $2::uuid AND poi.deleted_at IS NULL
      ORDER BY poi.created_at
    `, tenantId, id);

    return manifestSuccessResponse({ order, items });
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
