import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * Normalize a date string to start-of-day UTC for comparing against @db.Date columns.
 * Prevents timezone-offset mismatches when the client sends full ISO timestamps.
 */
function toDateStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/**
 * Normalize a date string to end-of-day UTC for comparing against @db.Date columns.
 */
function toDateEnd(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  type: "event" | "shift" | "timeoff";
  status?: string;
  color?: string;
  details?: string;
  location?: string;
  assignedTo?: string;
  guestCount?: number;
}

export async function GET(request: NextRequest) {
  try {
    let orgId: string | null | undefined;
    try {
      const authResult = await auth();
      orgId = authResult.orgId;
    } catch (authError) {
      log.error("[calendar] Auth failed", {
        error: authError instanceof Error ? authError.message : authError,
      });
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let tenantId: string;
    try {
      tenantId = await getTenantIdForOrg(orgId);
    } catch (error) {
      log.error("[calendar] Failed to resolve tenant", {
        error: error instanceof Error ? error.message : error,
      });
      captureException(error);
      return NextResponse.json(
        { error: "Failed to resolve organization" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const typesParam = searchParams.get("types") || "event,shift,timeoff";

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
        { status: 400 }
      );
    }
    const types = typesParam.split(",");

    // Fetch all requested data sources in parallel
    const [dbEventsResult, shiftsResult, timeOffResult] = await Promise.all([
      types.includes("event")
        ? database.event
            .findMany({
              where: {
                tenantId,
                eventDate: {
                  gte: toDateStart(rawStart),
                  lte: toDateEnd(rawEnd),
                },
                deletedAt: null,
                status: { not: "cancelled" },
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
            })
            .catch((error) => {
              log.error("[calendar] Events query failed", {
                error: error instanceof Error ? error.message : error,
              });
              captureException(error);
              return [];
            })
        : Promise.resolve([]),
      types.includes("shift")
        ? database.scheduleShift
            .findMany({
              where: {
                tenantId,
                OR: [
                  { shift_start: { gte: rawStart, lte: rawEnd } },
                  {
                    shift_start: { lt: rawStart },
                    shift_end: { gt: rawStart },
                  },
                ],
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
            })
            .catch((error) => {
              log.error("[calendar] Shifts query failed", { error });
              return [];
            })
        : Promise.resolve([]),
      types.includes("timeoff")
        ? database.timeOffRequest
            .findMany({
              where: {
                tenantId: tenantId,
                startDate: {
                  gte: toDateStart(rawStart),
                  lte: toDateEnd(rawEnd),
                },
                deletedAt: null,
                status: "approved",
              },
              select: {
                id: true,
                startDate: true,
                endDate: true,
                reason: true,
                status: true,
                requestType: true,
              },
              orderBy: { startDate: "asc" },
              take: 50,
            })
            .catch((error) => {
              log.error("[calendar] Time-off query failed", { error });
              return [];
            })
        : Promise.resolve([]),
    ]);

    const events: CalendarEvent[] = [];

    events.push(
      ...dbEventsResult.map((e) => ({
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

    if (shiftsResult && shiftsResult.length > 0) {
      events.push(
        ...shiftsResult.map((s) => ({
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

    if (timeOffResult && timeOffResult.length > 0) {
      events.push(
        ...timeOffResult.map((t) => ({
          id: t.id,
          title: `${t.requestType?.replace(/_/g, " ") || "Time Off"}`,
          start: new Date(t.startDate).toISOString(),
          end: t.endDate ? new Date(t.endDate).toISOString() : undefined,
          type: "timeoff" as const,
          status: t.status,
          details: t.reason || undefined,
        }))
      );
    }

    return NextResponse.json({ events });
  } catch (error) {
    captureException(error);
    log.error("[calendar] API error", {
      error: error instanceof Error ? error.message : error,
    });
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}
