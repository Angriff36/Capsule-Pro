import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * Normalize a date string to start-of-day UTC for comparing against @db.Date columns.
 * Prevents timezone-offset mismatches when the client sends full ISO timestamps.
 */
function toDateStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Normalize a date string to end-of-day UTC for comparing against @db.Date columns.
 */
function toDateEnd(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  type: "event" | "shift" | "timeoff" | "deadline" | "reminder";
  status?: string;
  color?: string;
  details?: string;
  location?: string;
  assignedTo?: string;
  guestCount?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const searchParams = request.nextUrl.searchParams;

    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const typesParam =
      searchParams.get("types") || "event,shift,timeoff,deadline,reminder";

    if (!(startParam && endParam)) {
      return NextResponse.json(
        { error: "Missing start or end parameter" },
        { status: 400 }
      );
    }

    const rawStart = new Date(startParam);
    const rawEnd = new Date(endParam);
    if (Number.isNaN(rawStart.getTime()) || Number.isNaN(rawEnd.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601." },
        { status: 400 },
      );
    }
    const types = typesParam.split(",");

    const events: CalendarEvent[] = [];

    // Fetch events (eventDate is @db.Date — compare date-only bounds)
    if (types.includes("event")) {
      const dbEvents = await database.event.findMany({
        where: {
          tenantId,
          eventDate: {
            gte: toDateStart(rawStart),
            lte: toDateEnd(rawEnd),
          },
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          eventDate: true,
          eventType: true,
          status: true,
          venueName: true,
          guestCount: true,
        },
        orderBy: { eventDate: "asc" },
      });

      events.push(
        ...dbEvents.map((e) => ({
          id: e.id,
          title: e.title || `${e.eventType} Event`,
          start: e.eventDate.toISOString(),
          type: "event" as const,
          status: e.status || undefined,
          location: e.venueName || undefined,
          guestCount: e.guestCount || undefined,
          details: `Type: ${e.eventType}`,
        }))
      );
    }

    // Fetch shifts from tenant_staff.schedule_shifts
    if (types.includes("shift")) {
      try {
        const shifts = await database.scheduleShift.findMany({
          where: {
            tenantId,
            shift_start: {
              gte: rawStart,
              lte: rawEnd,
            },
            deletedAt: null,
          },
          select: {
            id: true,
            shift_start: true,
            shift_end: true,
            role_during_shift: true,
            employeeId: true,
          },
          orderBy: { shift_start: "asc" },
          take: 100,
        });

        if (shifts && shifts.length > 0) {
          events.push(
            ...shifts.map((s) => ({
              id: s.id,
              title: `Shift: ${s.role_during_shift || "Staff"}`,
              start: s.shift_start.toISOString(),
              end: s.shift_end?.toISOString(),
              type: "shift" as const,
              details: s.role_during_shift
                ? `Role: ${s.role_during_shift}`
                : undefined,
            }))
          );
        }
      } catch (error) {
        console.error("[calendar] Shifts query failed:", error);
      }
    }

    // Fetch time off requests from tenant_staff.employee_time_off_requests
    // start_date / end_date are @db.Date — compare date-only bounds
    if (types.includes("timeoff")) {
      try {
        const timeOff = await database.employeeTimeOffRequest.findMany({
          where: {
            tenant_id: tenantId,
            start_date: {
              gte: toDateStart(rawStart),
              lte: toDateEnd(rawEnd),
            },
            deleted_at: null,
          },
          select: {
            id: true,
            start_date: true,
            end_date: true,
            reason: true,
            status: true,
            request_type: true,
          },
          orderBy: { start_date: "asc" },
          take: 50,
        });

        if (timeOff && timeOff.length > 0) {
          events.push(
            ...timeOff.map((t) => ({
              id: t.id,
              title: `${t.request_type?.replace(/_/g, " ") || "Time Off"}`,
              start: new Date(t.start_date).toISOString(),
              end: t.end_date ? new Date(t.end_date).toISOString() : undefined,
              type: "timeoff" as const,
              status: t.status,
              details: t.reason || undefined,
            }))
          );
        }
      } catch (error) {
        console.error("[calendar] Time-off query failed:", error);
      }
    }

    // BLOCKER: Deadline and Reminder models do not exist in schema.
    // Tracked as capsule-pro/TODO:calendar-deadlines-reminders

    return NextResponse.json({ events });
  } catch (error) {
    captureException(error);
    console.error("[calendar] API error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}
