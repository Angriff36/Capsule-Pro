// Approve or reject a purchase order
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

interface ActionRequest {
  orderId: string;
  action: "approved" | "rejected";
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const body: ActionRequest = await request.json();
    const { orderId, action, notes } = body;

    if (!(orderId && action)) {
      return manifestErrorResponse("Missing orderId or action", 400);
    }

    if (!["approved", "rejected"].includes(action)) {
      return manifestErrorResponse(
        "Invalid action. Must be 'approved' or 'rejected'",
        400
      );
    }

    // Get current PO to validate state transition
    const currentPOs = await database.$queryRawUnsafe(
      `
      SELECT id, status, po_number FROM tenant_inventory.purchase_orders
      WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
    `,
      orderId,
      tenantId
    );

    if (!Array.isArray(currentPOs) || currentPOs.length === 0) {
      return manifestErrorResponse("Purchase order not found", 404);
    }

    const currentPO = currentPOs[0] as {
      id: string;
      status: string;
      po_number: string;
    };

    // Validate state transition: only "submitted" can transition to "approved" or "rejected"
    if (currentPO.status !== "submitted") {
      return manifestErrorResponse(
        `Cannot ${action} a purchase order with status '${currentPO.status}'. Only 'submitted' orders can be approved or rejected.`,
        400
      );
    }

    // Update PO status
    await database.$queryRawUnsafe(
      `
      UPDATE tenant_inventory.purchase_orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2::uuid AND tenant_id = $3::uuid
    `,
      action,
      orderId,
      tenantId
    );

    // Insert approval history record
    await database.$queryRawUnsafe(
      `
      INSERT INTO tenant_staff.approval_history (
        entity_type, entity_id, action, performed_by, performed_at,
        previous_status, new_status, notes, tenant_id
      ) VALUES (
        'purchase_order', $1::uuid, $2, $3, NOW(),
        'submitted', $4, $5, $6::uuid
      )
    `,
      orderId,
      action,
      userId,
      action,
      notes || null,
      tenantId
    );

    // Return updated PO with vendor info. tenant_id is included so the
    // SELECT cannot return a row from another tenant if PO ids ever collide.
    const updatedPOs = await database.$queryRawUnsafe(
      `
      SELECT
        po.id, po.po_number, po.status, po.total,
        po.submitted_by, po.submitted_at, po.updated_at,
        v.name as vendor_name
      FROM tenant_inventory.purchase_orders po
      LEFT JOIN tenant_inventory.inventory_suppliers v
        ON v.id = po.vendor_id
        AND v.tenant_id = po.tenant_id
      WHERE po.id = $1::uuid AND po.tenant_id = $2::uuid
    `,
      orderId,
      tenantId
    );

    return manifestSuccessResponse({
      order: (updatedPOs as any[])[0],
      message: `Purchase order ${currentPO.po_number} has been ${action}`,
    });
  } catch (error) {
    captureException(error);
    console.error("Error processing approval action:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
