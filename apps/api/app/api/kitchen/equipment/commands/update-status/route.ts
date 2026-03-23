// Auto-generated Next.js API route for Equipment.updateStatus command
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

    const { equipmentId, newStatus, reason } = body;

    if (!(equipmentId && newStatus)) {
      return manifestErrorResponse(
        "equipmentId and newStatus are required",
        400
      );
    }

    const validStatuses = [
      "active",
      "maintenance",
      "out_of_service",
      "retired",
    ];
    if (!validStatuses.includes(newStatus)) {
      return manifestErrorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
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

    if (equipment.status === newStatus) {
      return manifestErrorResponse(
        `Equipment status is already ${newStatus}`,
        400
      );
    }

    const updatedEquipment = await database.equipment.update({
      where: {
        tenantId_id: {
          tenantId,
          id: equipmentId,
        },
      },
      data: {
        status: newStatus,
        isActive: newStatus !== "retired",
      },
    });

    return manifestSuccessResponse({
      equipment: updatedEquipment,
      previousStatus: equipment.status,
    });
  } catch (error) {
    console.error("Error updating equipment status:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
