import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const user = await resolveCurrentUser(request);
    const tenantId = user.tenantId;

    const body = await request.json();
    const { eventId, eventType, newDate } = body;

    if (!(eventId && eventType && newDate)) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, eventType, newDate" },
        { status: 400 }
      );
    }

    // Validate date is parseable
    const newDateTime = new Date(newDate);
    if (Number.isNaN(newDateTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format for newDate" },
        { status: 400 }
      );
    }

    // Reject past dates for events
    const now = new Date();
    const newDateOnly = new Date(
      newDateTime.getFullYear(),
      newDateTime.getMonth(),
      newDateTime.getDate()
    );
    const todayOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    if (newDateOnly < todayOnly) {
      return NextResponse.json(
        { error: "Cannot reschedule to a past date" },
        { status: 400 }
      );
    }

    if (eventType === "event") {
      // Check event exists and is not cancelled/completed (pre-validation;
      // Manifest guards also enforce this but we give clearer errors here)
      const existing = await database.event.findFirst({
        where: {
          tenantId,
          id: eventId,
          deletedAt: null,
        },
        select: { id: true, status: true },
      });

      if (!existing) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      if (existing.status === "cancelled") {
        return NextResponse.json(
          { error: "Cannot reschedule a cancelled event" },
          { status: 400 }
        );
      }

      if (existing.status === "completed") {
        return NextResponse.json(
          { error: "Cannot reschedule a completed event" },
          { status: 400 }
        );
      }

      // Governed write: Event.updateDate sets eventDate via Manifest runtime
      return runManifestCommand({
        entity: "Event",
        command: "updateDate",
        body: { newEventDate: newDateTime.toISOString() },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
        instanceId: eventId,
      });
    }
    if (eventType === "shift") {
      // Check shift exists
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

      // Governed write: ScheduleShift.update sets shiftStart/shiftEnd via Manifest runtime
      return runManifestCommand({
        entity: "ScheduleShift",
        command: "update",
        body: {
          employeeId: existingShift.employeeId,
          locationId: existingShift.locationId,
          shiftStart: newShiftStart.getTime(),
          shiftEnd: newShiftEnd.getTime(),
          roleDuringShift: existingShift.role_during_shift ?? "",
          notes: existingShift.notes ?? "",
        },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
        instanceId: eventId,
      });
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
