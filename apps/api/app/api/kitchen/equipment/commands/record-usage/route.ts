// Auto-generated Next.js API route for Equipment.recordUsage command
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

    const { equipmentId, hours } = body;

    if (!equipmentId || hours === undefined) {
      return manifestErrorResponse("equipmentId and hours are required", 400);
    }

    if (hours <= 0) {
      return manifestErrorResponse("Usage hours must be positive", 400);
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

    const newUsageHours = equipment.usageHours + hours;
    const usagePercentage =
      equipment.maxUsageHours > 0
        ? (newUsageHours / equipment.maxUsageHours) * 100
        : 0;

    const updatedEquipment = await database.equipment.update({
      where: {
        tenantId_id: {
          tenantId,
          id: equipmentId,
        },
      },
      data: {
        usageHours: newUsageHours,
      },
    });

    const alerts = [];
    if (usagePercentage >= 90) {
      alerts.push({
        level: "critical",
        message: `Equipment has reached ${usagePercentage.toFixed(1)}% of its recommended usage limit`,
      });
    } else if (usagePercentage >= 80) {
      alerts.push({
        level: "warning",
        message: `Equipment has reached ${usagePercentage.toFixed(1)}% of its recommended usage limit`,
      });
    }

    return manifestSuccessResponse({
      equipment: updatedEquipment,
      usagePercentage: usagePercentage.toFixed(1),
      alerts,
    });
  } catch (error) {
    console.error("Error recording usage:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
