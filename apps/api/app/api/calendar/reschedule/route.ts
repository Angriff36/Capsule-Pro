import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function PATCH(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const body = await request.json();
    const { eventId, eventType, newDate } = body;

    if (!(eventId && eventType && newDate)) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, eventType, newDate" },
        { status: 400 }
      );
    }

    const newDateTime = new Date(newDate);

    if (eventType === "event") {
      // Update event date
      const updated = await database.event.update({
        where: {
          tenantId_id: {
            tenantId,
            id: eventId,
          },
        },
        data: {
          eventDate: newDateTime,
        },
      });

      return NextResponse.json({ success: true, event: updated });
    }
    if (eventType === "shift") {
      // Update shift start and end, preserving duration
      const existingShift = await database.scheduleShift.findFirst({
        where: {
          tenantId,
          id: eventId,
          deletedAt: null,
        },
      });

      if (!existingShift) {
        return NextResponse.json({ error: "Shift not found" }, { status: 404 });
      }

      // Calculate duration difference to preserve shift length
      const originalDuration =
        existingShift.shift_end.getTime() - existingShift.shift_start.getTime();

      // Set new shift start time to newDate with same time components as original
      const newShiftStart = new Date(newDateTime);
      newShiftStart.setHours(existingShift.shift_start.getHours());
      newShiftStart.setMinutes(existingShift.shift_start.getMinutes());
      newShiftStart.setSeconds(existingShift.shift_start.getSeconds());

      const newShiftEnd = new Date(newShiftStart.getTime() + originalDuration);

      const updated = await database.scheduleShift.update({
        where: {
          tenantId_id: {
            tenantId,
            id: eventId,
          },
        },
        data: {
          shift_start: newShiftStart,
          shift_end: newShiftEnd,
        },
      });

      return NextResponse.json({ success: true, shift: updated });
    }
    return NextResponse.json(
      { error: "Invalid eventType. Must be 'event' or 'shift'" },
      { status: 400 }
    );
  } catch (error) {
    captureException(error);
    log.error("Calendar reschedule error:", error);
    return NextResponse.json(
      { error: "Failed to reschedule event" },
      { status: 500 }
    );
  }
}
