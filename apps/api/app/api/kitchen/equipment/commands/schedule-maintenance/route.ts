// Auto-generated Next.js API route for Equipment.scheduleMaintenance command
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
      scheduledDate,
      maintenanceType = "preventive",
      notes,
    } = body;

    if (!(equipmentId && scheduledDate)) {
      return manifestErrorResponse(
        "equipmentId and scheduledDate are required",
        400
      );
    }

    const validTypes = ["preventive", "corrective", "emergency"];
    if (!validTypes.includes(maintenanceType)) {
      return manifestErrorResponse(
        `Invalid maintenance type. Must be one of: ${validTypes.join(", ")}`,
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

    if (equipment.status === "retired") {
      return manifestErrorResponse(
        "Cannot schedule maintenance for retired equipment",
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
        nextMaintenanceDate: new Date(scheduledDate),
      },
    });

    // Check for event conflicts
    const conflicts = (await database.$queryRaw`
      SELECT DISTINCT
        e.id as event_id,
        e.title as event_title,
        e.event_date
      FROM tenant_events.events e
      JOIN tenant_kitchen.prep_lists pl ON pl.event_id = e.id
        AND pl.tenant_id = e.tenant_id
        AND pl.deleted_at IS NULL
      JOIN tenant_kitchen.prep_list_items pli ON pli.prep_list_id = pl.id
        AND pli.tenant_id = pl.tenant_id
        AND pli.deleted_at IS NULL
      JOIN tenant_kitchen.stations s ON s.id = pli.station_id
        AND s.tenant_id = pli.tenant_id
        AND s.deleted_at IS NULL
      WHERE e.tenant_id = ${tenantId}::uuid
        AND e.deleted_at IS NULL
        AND e.event_date = ${new Date(scheduledDate)}::date
        AND e.status NOT IN ('cancelled', 'completed')
        AND ${equipment.name} = ANY(s."equipmentList")
    `) as Array<{ event_id: string; event_title: string; event_date: Date }>;

    return manifestSuccessResponse({
      equipment: updatedEquipment,
      conflicts: conflicts.map((c) => ({
        eventId: c.event_id,
        eventTitle: c.event_title,
        eventDate: c.event_date,
      })),
      warning:
        conflicts.length > 0
          ? `Equipment is scheduled for use in ${conflicts.length} event(s) on the maintenance date`
          : undefined,
    });
  } catch (error) {
    console.error("Error scheduling maintenance:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
