/**
 * @module CreateEventTimelineItem
 * @intent Add a new run-of-show item to an event timeline
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function parseTimelineTime(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = TIME_REGEX.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;
  // Prisma `@db.Time(6)` accepts a Date — only the time portion is persisted.
  // Use 1970-01-01 UTC base so server timezone doesn't shift the wall-clock time.
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  if (!UUID_REGEX.test(eventId)) {
    return NextResponse.json({ error: "Invalid eventId" }, { status: 400 });
  }

  const tenantId = await getTenantIdForOrg(orgId ?? "");
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json(
      { error: "description is required" },
      { status: 400 }
    );
  }

  const timelineTime = parseTimelineTime(body.timelineTime);
  if (!timelineTime) {
    return NextResponse.json(
      { error: "timelineTime must be HH:MM or HH:MM:SS (24h)" },
      { status: 400 }
    );
  }

  const responsibleRole =
    typeof body.responsibleRole === "string" && body.responsibleRole.trim()
      ? body.responsibleRole.trim()
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;

  const event = await database.event.findFirst({
    where: { tenantId, id: eventId, deletedAt: null },
    select: { id: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const max = await database.eventTimeline.aggregate({
    where: { tenantId, eventId, deletedAt: null },
    _max: { sortOrder: true },
  });
  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.trunc(body.sortOrder)
      : (max._max.sortOrder ?? 0) + 10;

  const item = await database.eventTimeline.create({
    data: {
      tenantId,
      eventId,
      timelineTime,
      description,
      responsibleRole,
      notes,
      sortOrder,
    },
    select: {
      id: true,
      timelineTime: true,
      description: true,
      responsibleRole: true,
      isCompleted: true,
      completedAt: true,
      notes: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ data: item }, { status: 201 });
}
