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
    const currentPO = await database.purchaseOrder.findFirst({
      where: { id: orderId, tenantId, deletedAt: null },
      select: { id: true, status: true, poNumber: true },
    });

    if (!currentPO) {
      return manifestErrorResponse("Purchase order not found", 404);
    }

    // Validate state transition: only "submitted" can transition to "approved" or "rejected"
    if (currentPO.status !== "submitted") {
      return manifestErrorResponse(
        `Cannot ${action} a purchase order with status '${currentPO.status}'. Only 'submitted' orders can be approved or rejected.`,
        400
      );
    }

    // Update PO status and insert approval history in a transaction
    await database.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { tenantId_id: { tenantId, id: orderId } },
        data: { status: action },
      });

      await tx.approvalHistory.create({
        data: {
          tenantId,
          entityType: "purchase_order",
          entityId: orderId,
          action,
          performedBy: userId,
          previousStatus: "submitted",
          newStatus: action,
          notes: notes || null,
        },
      });
    });

    // Fetch updated PO with vendor info
    const updatedPO = await database.purchaseOrder.findFirst({
      where: { id: orderId, tenantId },
      select: {
        id: true,
        poNumber: true,
        status: true,
        total: true,
        submittedBy: true,
        submittedAt: true,
        updatedAt: true,
        vendorId: true,
      },
    });

    // Get vendor name
    const vendor = updatedPO?.vendorId
      ? await database.inventorySupplier.findFirst({
          where: { id: updatedPO.vendorId },
          select: { name: true },
        })
      : null;

    return manifestSuccessResponse({
      order: updatedPO
        ? {
            id: updatedPO.id,
            po_number: updatedPO.poNumber,
            status: updatedPO.status,
            total: updatedPO.total.toNumber(),
            submitted_by: updatedPO.submittedBy,
            submitted_at: updatedPO.submittedAt,
            updated_at: updatedPO.updatedAt,
            vendor_name: vendor?.name ?? null,
          }
        : null,
      message: `Purchase order ${currentPO.poNumber} has been ${action}`,
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
