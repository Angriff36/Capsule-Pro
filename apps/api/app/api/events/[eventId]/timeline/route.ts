/**
 * @module EventTimelineAPI
 * @intent List run-of-show timeline items for an event with completion summary
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export async function GET(
  _request: Request,
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

  const event = await database.event.findFirst({
    where: { tenantId, id: eventId, deletedAt: null },
    select: {
      id: true,
      title: true,
      eventNumber: true,
      eventDate: true,
      status: true,
    },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const items = await database.eventTimeline.findMany({
    where: { tenantId, eventId, deletedAt: null },
    orderBy: [
      { sortOrder: "asc" },
      { timelineTime: "asc" },
      { createdAt: "asc" },
    ],
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

  const total = items.length;
  const completed = items.filter((item) => item.isCompleted).length;
  const pending = total - completed;
  const completionRate = total > 0 ? completed / total : 0;

  return NextResponse.json({
    data: {
      event: {
        id: event.id,
        title: event.title,
        eventNumber: event.eventNumber,
        eventDate: event.eventDate,
        status: event.status,
      },
      items,
      summary: {
        total,
        completed,
        pending,
        completionRate,
      },
    },
  });
}
