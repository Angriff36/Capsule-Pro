// Update PO status (approve, order, cancel)
import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { runManifestCommand } from "@/lib/manifest/execute-command";
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

/** Map a target status to the Manifest command name. */
const STATUS_TO_COMMAND: Record<string, string> = {
  submitted: "submit",
  approved: "approve",
  rejected: "reject",
  cancelled: "cancel",
  ordered: "markOrdered",
  received: "markReceived",
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

    // Verify current status allows transition (read bypasses Manifest runtime per constitution §10)
    const current = await database.$queryRaw<Array<{ status: string }>>`
      SELECT status FROM tenant_inventory.purchase_orders
      WHERE tenant_id = ${tenantId}::uuid AND id = ${orderId}::uuid AND deleted_at IS NULL
    `;
    if (!current.length)
      return manifestErrorResponse("PO not found", 404);

    const currentStatus = current[0].status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(status)) {
      return manifestErrorResponse(
        `Cannot transition from ${currentStatus} to ${status}`,
        400
      );
    }

    // Delegate governed status mutation to Manifest runtime
    const command = STATUS_TO_COMMAND[status];
    const result = await runManifestCommand({
      entity: "PurchaseOrder",
      command,
      body: { id: orderId, userId },
      user: { id: userId, tenantId, role: "user" },
    });

    if (result.status >= 400) return result;

    // Read updated PO for response (reads bypass runtime)
    const order = await database.purchaseOrder.findFirst({
      where: { id: orderId, tenantId, deletedAt: null },
      select: { id: true, poNumber: true, status: true },
    });

    return manifestSuccessResponse({
      order: order
        ? {
            id: order.id,
            po_number: order.poNumber,
            status: order.status,
          }
        : null,
    });
  } catch (error) {
    captureException(error);
    log.error("Error updating PO status:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
