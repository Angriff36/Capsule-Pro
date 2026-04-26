// Update PO status (approve, order, cancel)
import { auth } from "@repo/auth/server";
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
    const current = await database.purchaseOrder.findFirst({
      where: { tenantId, id: orderId, deletedAt: null },
      select: { status: true },
    });
    if (!current) return manifestErrorResponse("PO not found", 404);

    const allowed = VALID_TRANSITIONS[current.status] || [];
    if (!allowed.includes(status)) {
      return manifestErrorResponse(
        `Cannot transition from ${current.status} to ${status}`,
        400
      );
    }

    const order = await database.purchaseOrder.update({
      where: { tenantId_id: { tenantId, id: orderId } },
      data: { status },
    });

    return manifestSuccessResponse({
      order: {
        id: order.id,
        po_number: order.poNumber,
        status: order.status,
      },
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
