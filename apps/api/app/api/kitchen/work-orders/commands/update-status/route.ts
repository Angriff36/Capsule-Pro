// Auto-generated Next.js API route for WorkOrder.updateStatus command
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

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

    const { workOrderId, newStatus, reason, actualCost, partsUsed } = body;

    if (!(workOrderId && newStatus)) {
      return manifestErrorResponse(
        "workOrderId and newStatus are required",
        400
      );
    }

    const validStatuses = [
      "open",
      "assigned",
      "in_progress",
      "awaiting_parts",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(newStatus)) {
      return manifestErrorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400
      );
    }

    const workOrder = await database.workOrder.findFirst({
      where: {
        id: workOrderId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!workOrder) {
      return manifestErrorResponse("Work order not found", 404);
    }

    const updateData: any = {
      status: newStatus,
    };

    if (newStatus === "completed") {
      updateData.completedDate = new Date();
      if (actualCost !== undefined) {
        updateData.actualCost = actualCost;
      }
      if (partsUsed) {
        updateData.partsUsed = partsUsed;
      }
    }

    const updatedWorkOrder = await database.workOrder.update({
      where: {
        tenantId_id: {
          tenantId,
          id: workOrderId,
        },
      },
      data: updateData,
    });

    return manifestSuccessResponse({
      workOrder: updatedWorkOrder,
      previousStatus: workOrder.status,
    });
  } catch (error) {
    console.error("Error updating work order status:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
