// Create maintenance work order
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

const VALID_TYPES = ["preventive", "corrective", "emergency", "inspection"];
const VALID_PRIORITIES = ["critical", "high", "medium", "low"];

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
    const {
      areaId,
      equipmentId,
      workOrderType = "corrective",
      priority = "medium",
      title,
      description,
      scheduledDate,
      assignedTo,
      assignedVendor,
    } = body;

    if (!title) {
      return manifestErrorResponse("title is required", 400);
    }

    if (!VALID_TYPES.includes(workOrderType)) {
      return manifestErrorResponse(
        `Invalid work order type. Must be one of: ${VALID_TYPES.join(", ")}`,
        400
      );
    }

    if (!VALID_PRIORITIES.includes(priority)) {
      return manifestErrorResponse(
        `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}`,
        400
      );
    }

    const count = await database.maintenanceWorkOrder.count({
      where: { tenantId },
    });
    const workOrderNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

    const workOrder = await database.maintenanceWorkOrder.create({
      data: {
        tenantId,
        workOrderNumber,
        areaId: areaId || null,
        equipmentId: equipmentId || null,
        workOrderType,
        priority,
        status: "open",
        title,
        description: description || null,
        reportedBy: userId,
        assignedTo: assignedTo || null,
        assignedVendor: assignedVendor || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      },
    });

    const result = {
      id: workOrder.id,
      work_order_number: workOrder.workOrderNumber,
      area_id: workOrder.areaId,
      equipment_id: workOrder.equipmentId,
      work_order_type: workOrder.workOrderType,
      priority: workOrder.priority,
      status: workOrder.status,
      title: workOrder.title,
      description: workOrder.description,
      reported_at: workOrder.reportedAt,
      scheduled_date: workOrder.scheduledDate,
      created_at: workOrder.createdAt,
    };

    return manifestSuccessResponse({ workOrder: result });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
