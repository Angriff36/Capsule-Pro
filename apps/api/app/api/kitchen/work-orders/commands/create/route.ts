// Auto-generated Next.js API route for WorkOrder.create command
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

    const {
      equipmentId,
      title,
      type = "repair",
      priority = "medium",
      description,
      estimatedCost,
      scheduledDate,
    } = body;

    if (!(equipmentId && title)) {
      return manifestErrorResponse("equipmentId and title are required", 400);
    }

    const validTypes = ["repair", "replacement", "inspection", "upgrade"];
    if (!validTypes.includes(type)) {
      return manifestErrorResponse(
        `Invalid work order type. Must be one of: ${validTypes.join(", ")}`,
        400
      );
    }

    const validPriorities = ["low", "medium", "high", "critical"];
    if (!validPriorities.includes(priority)) {
      return manifestErrorResponse(
        `Invalid priority. Must be one of: ${validPriorities.join(", ")}`,
        400
      );
    }

    const equipment = await database.equipment.findFirst({
      where: {
        id: equipmentId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!equipment) {
      return manifestErrorResponse("Equipment not found", 404);
    }

    const workOrder = await database.workOrder.create({
      data: {
        tenantId,
        equipmentId,
        equipmentName: equipment.name,
        title,
        type,
        priority,
        description,
        estimatedCost,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        status: "open",
        actualCost: 0,
      },
    });

    return manifestSuccessResponse({ workOrder });
  } catch (error) {
    console.error("Error creating work order:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
