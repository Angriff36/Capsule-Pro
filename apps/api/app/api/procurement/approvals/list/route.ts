// List purchase orders needing approval with approval history
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    // Map frontend status to DB status
    // "pending" maps to "submitted" status
    let statusFilter = "";
    const params: any[] = [tenantId];
    
    if (status && status !== "all") {
      if (status === "pending") {
        statusFilter = "AND po.status = $2";
        params.push("submitted");
      } else {
        statusFilter = "AND po.status = $2";
        params.push(status);
      }
    }

    const orders = await database.$queryRawUnsafe(`
      SELECT
        po.id, po.po_number, po.vendor_id, po.status,
        po.total, po.submitted_by, po.submitted_at, po.created_at,
        v.name as vendor_name,
        COUNT(poi.id)::int as item_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ah.id,
              'entityType', ah.entity_type,
              'entityId', ah.entity_id,
              'action', ah.action,
              'performedBy', ah.performed_by,
              'performedAt', ah.performed_at,
              'previousStatus', ah.previous_status,
              'newStatus', ah.new_status,
              'notes', ah.notes,
              'metadata', ah.metadata
            )
            ORDER BY ah.performed_at DESC
          ) FILTER (WHERE ah.id IS NOT NULL),
          '[]'::json
        ) as approval_history
      FROM tenant_inventory.purchase_orders po
      LEFT JOIN tenant_inventory.inventory_suppliers v ON v.id = po.vendor_id
      LEFT JOIN tenant_inventory.purchase_order_items poi ON poi.purchase_order_id = po.id AND poi.deleted_at IS NULL
      LEFT JOIN tenant_staff.approval_history ah ON ah.entity_type = 'purchase_order' AND ah.entity_id = po.id
      WHERE po.tenant_id = $1::uuid AND po.deleted_at IS NULL
        ${statusFilter}
      GROUP BY po.id, po.po_number, po.vendor_id, po.status,
        po.total, po.submitted_by, po.submitted_at, po.created_at, v.name
      ORDER BY 
        CASE WHEN po.status = 'submitted' THEN 0 ELSE 1 END,
        po.submitted_at DESC NULLS LAST,
        po.created_at DESC
    `, ...params);

    return manifestSuccessResponse({ orders });
  } catch (error) {
    console.error("Error listing approval orders:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
