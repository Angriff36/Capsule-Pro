// Update work order status
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

const VALID_STATUSES = [
  "open",
  "assigned",
  "in_progress",
  "parts_ordered",
  "completed",
  "cancelled",
];

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const { workOrderId, status, laborHours, partsCost, laborCost, notes } =
      body;

    if (!workOrderId) {
      return manifestErrorResponse("workOrderId is required", 400);
    }

    if (!VALID_STATUSES.includes(status)) {
      return manifestErrorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }

    const existing = await database.maintenanceWorkOrder.findFirst({
      where: { tenantId, id: workOrderId, deletedAt: null },
    });

    if (!existing) {
      return manifestErrorResponse("Work order not found", 404);
    }

    const completedAt = status === "completed" ? new Date() : null;
    const startedAt =
      status === "in_progress" && !existing.startedAt
        ? new Date()
        : undefined;
    const totalCost =
      partsCost || laborCost ? (partsCost || 0) + (laborCost || 0) : undefined;

    const workOrder = await database.maintenanceWorkOrder.update({
      where: { tenantId_id: { tenantId, id: workOrderId } },
      data: {
        status,
        ...(startedAt !== undefined && { startedAt }),
        ...(completedAt && { completedAt, completedBy: userId }),
        ...(laborHours !== undefined &&
          laborHours !== null && { laborHours }),
        ...(partsCost !== undefined &&
          partsCost !== null && { partsCost }),
        ...(laborCost !== undefined &&
          laborCost !== null && { laborCost }),
        ...(totalCost !== undefined && totalCost > 0 && { totalCost }),
        ...(notes !== undefined && notes !== null && { notes }),
      },
    });

    const result = {
      id: workOrder.id,
      work_order_number: workOrder.workOrderNumber,
      status: workOrder.status,
      completed_at: workOrder.completedAt,
      total_cost: workOrder.totalCost?.toNumber?.() ?? null,
    };

    return manifestSuccessResponse({ workOrder: result });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
