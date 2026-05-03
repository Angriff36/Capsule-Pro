/**
 * @module UpdateEventTimelineItem
 * @intent Edit a timeline item's description, time, role, or notes
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
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
}

interface UpdatePayload {
  itemId?: unknown;
  description?: unknown;
  timelineTime?: unknown;
  responsibleRole?: unknown;
  notes?: unknown;
  sortOrder?: unknown;
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

  let body: UpdatePayload;
  try {
    body = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  if (!UUID_REGEX.test(itemId)) {
    return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
  }

  const data: {
    description?: string;
    timelineTime?: Date;
    responsibleRole?: string | null;
    notes?: string | null;
    sortOrder?: number;
  } = {};

  if (body.description !== undefined) {
    if (typeof body.description !== "string" || !body.description.trim()) {
      return NextResponse.json(
        { error: "description must be a non-empty string" },
        { status: 400 }
      );
    }
    data.description = body.description.trim();
  }

  if (body.timelineTime !== undefined) {
    const parsed = parseTimelineTime(body.timelineTime);
    if (!parsed) {
      return NextResponse.json(
        { error: "timelineTime must be HH:MM or HH:MM:SS (24h)" },
        { status: 400 }
      );
    }
    data.timelineTime = parsed;
  }

  if (body.responsibleRole !== undefined) {
    if (body.responsibleRole === null) {
      data.responsibleRole = null;
    } else if (typeof body.responsibleRole === "string") {
      const trimmed = body.responsibleRole.trim();
      data.responsibleRole = trimmed.length > 0 ? trimmed : null;
    } else {
      return NextResponse.json(
        { error: "responsibleRole must be string or null" },
        { status: 400 }
      );
    }
  }

  if (body.notes !== undefined) {
    if (body.notes === null) {
      data.notes = null;
    } else if (typeof body.notes === "string") {
      const trimmed = body.notes.trim();
      data.notes = trimmed.length > 0 ? trimmed : null;
    } else {
      return NextResponse.json(
        { error: "notes must be string or null" },
        { status: 400 }
      );
    }
  }

  if (body.sortOrder !== undefined) {
    if (typeof body.sortOrder !== "number" || !Number.isFinite(body.sortOrder)) {
      return NextResponse.json(
        { error: "sortOrder must be a number" },
        { status: 400 }
      );
    }
    data.sortOrder = Math.trunc(body.sortOrder);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const existing = await database.eventTimeline.findFirst({
    where: { tenantId, id: itemId, eventId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Timeline item not found" },
      { status: 404 }
    );
  }

  const item = await database.eventTimeline.update({
    where: { tenantId_id: { tenantId, id: itemId } },
    data,
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

  return NextResponse.json({ data: item });
}
