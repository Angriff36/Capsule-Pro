import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { manifestErrorResponse } from "@/lib/manifest-response";
import { database } from "@/lib/database";

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
    const { equipmentId, title, description, priority, scheduledDate, assignedTo, estimatedCost, vendorId } = body;

    if (!equipmentId) {
      return manifestErrorResponse("equipmentId is required", 400);
    }

    const equipment = await database.equipment.findFirst({
      where: { tenantId, id: equipmentId, deletedAt: null },
    });

    if (!equipment) {
      return manifestErrorResponse("Equipment not found", 404);
    }

    const workOrder = await database.workOrder.create({
      data: {
        tenantId,
        equipmentId,
        equipmentName: equipment.name,
        title: title || `Maintenance: ${equipment.name}`,
        type: "maintenance",
        priority: priority || "medium",
        description,
        assignedTo,
        estimatedCost,
        vendorId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      },
    });

    // Update equipment status to maintenance and set next maintenance date
    await database.equipment.update({
      where: { tenantId_id: { tenantId, id: equipmentId } },
      data: {
        status: "maintenance",
        ...(scheduledDate && { nextMaintenanceDate: new Date(scheduledDate) }),
      },
    });

    return new Response(
      JSON.stringify({ workOrder }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    captureException(error);
    console.error("Error scheduling maintenance:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
