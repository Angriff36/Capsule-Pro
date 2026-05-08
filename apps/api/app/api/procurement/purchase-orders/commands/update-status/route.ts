// Update PO status (approve, order, cancel)
import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "rejected", "cancelled"],
  approved: ["ordered", "cancelled"],
  ordered: ["received", "cancelled"],
  received: [],
  cancelled: [],
  rejected: [],
};

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { orderId, status } = await request.json();
    if (!(orderId && status))
      return manifestErrorResponse("orderId and status required", 400);

    // Verify current status allows transition
    const current = await database.$queryRaw`
      SELECT status FROM tenant_inventory.purchase_orders
      WHERE tenant_id = ${tenantId}::uuid AND id = ${orderId}::uuid AND deleted_at IS NULL
    `;
    if (!(current as any[]).length)
      return manifestErrorResponse("PO not found", 404);

    const currentStatus = (current as any[])[0].status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(status)) {
      return manifestErrorResponse(
        `Cannot transition from ${currentStatus} to ${status}`,
        400
      );
    }

    const result = await database.$queryRaw`
      UPDATE tenant_inventory.purchase_orders
      SET status = ${status}, updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${orderId}::uuid
      RETURNING id, po_number, status
    `;

    return manifestSuccessResponse({ order: (result as any[])[0] });
  } catch (error) {
    captureException(error);
    log.error("Error updating PO status:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
