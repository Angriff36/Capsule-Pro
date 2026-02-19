import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { addDays, differenceInHours, endOfDay, startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/kitchen/events/today
 *
 * Returns events for today and tomorrow with prep status information.
 * Used by the mobile kitchen app Today tab.
 */
export async function GET() {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowEnd = endOfDay(addDays(now, 1));

  // Get events for today and tomorrow
  const events = await database.event.findMany({
    where: {
      AND: [
        { tenantId },
        { deletedAt: null },
        { eventDate: { gte: todayStart, lte: tomorrowEnd } },
        { status: { notIn: ["canceled", "cancelled"] } },
      ],
    },
    orderBy: [{ eventDate: "asc" }],
    select: {
      id: true,
      title: true,
      eventDate: true,
      guestCount: true,
    },
  });

  // Get prep lists for these events
  const eventIds = events.map((e) => e.id);

  const prepLists = await database.prepList.findMany({
    where: {
      AND: [
        { tenantId },
        { deletedAt: null },
        { eventId: { in: eventIds } },
        { status: { notIn: ["canceled", "cancelled"] } },
      ],
    },
    select: {
      id: true,
      eventId: true,
      status: true,
      totalItems: true,
    },
  });

  // Get prep list items to count completed/incomplete
  const prepListIds = prepLists.map((p) => p.id);

  const prepListItems = await database.prepListItem.findMany({
    where: {
      AND: [
        { tenantId },
        { prepListId: { in: prepListIds } },
        { deletedAt: null },
      ],
    },
    select: {
      prepListId: true,
      isCompleted: true,
    },
  });

  // Get unassigned kitchen tasks (using tags to identify event association if possible)
  const kitchenTasks = await database.kitchenTask.findMany({
    where: {
      AND: [
        { tenantId },
        { deletedAt: null },
        { status: { notIn: ["done", "canceled", "cancelled"] } },
      ],
    },
    select: {
      id: true,
      tags: true,
    },
  });

  // Get claimed task IDs
  const taskIds = kitchenTasks.map((t) => t.id);
  const claims = await database.kitchenTaskClaim.findMany({
    where: {
      AND: [{ tenantId }, { taskId: { in: taskIds } }, { releasedAt: null }],
    },
    select: {
      taskId: true,
    },
  });

  const claimedTaskIds = new Set(claims.map((c) => c.taskId));

  // Build item completion map per prep list
  const prepListCompletionMap = new Map<
    string,
    { completed: number; total: number }
  >();

  for (const item of prepListItems) {
    const current = prepListCompletionMap.get(item.prepListId) || {
      completed: 0,
      total: 0,
    };
    current.total += 1;
    if (item.isCompleted) {
      current.completed += 1;
    }
    prepListCompletionMap.set(item.prepListId, current);
  }

  // Build prep lists map per event
  const eventPrepListsMap = new Map<
    string,
    Array<{
      id: string;
      status: string;
      completedCount: number;
      totalCount: number;
    }>
  >();

  for (const prepList of prepLists) {
    const completion = prepListCompletionMap.get(prepList.id) || {
      completed: 0,
      total: prepList.totalItems || 0,
    };

    const eventLists = eventPrepListsMap.get(prepList.eventId) || [];
    eventLists.push({
      id: prepList.id,
      status: prepList.status,
      completedCount: completion.completed,
      totalCount: completion.total,
    });
    eventPrepListsMap.set(prepList.eventId, eventLists);
  }

  // Calculate total unclaimed kitchen tasks (not event-specific for now)
  const totalUnclaimedTasks = kitchenTasks.filter(
    (t) => !claimedTaskIds.has(t.id)
  ).length;

  // Calculate urgency for each event
  const eventsWithStatus = events.map((event) => {
    const eventDate = new Date(event.eventDate);
    const hoursUntil = differenceInHours(eventDate, now);

    // Get prep lists for this event
    const prepListsForEvent = eventPrepListsMap.get(event.id) || [];

    // Count incomplete items across all prep lists
    const incompleteItemsCount = prepListsForEvent.reduce(
      (sum, pl) => sum + (pl.totalCount - pl.completedCount),
      0
    );

    // For now, show total unclaimed tasks (we could enhance this to match events via tags)
    const unclaimedPrepCount = totalUnclaimedTasks;

    // Calculate urgency based on time until event
    let urgency: "critical" | "warning" | "ok" = "ok";
    if (hoursUntil < 2) {
      urgency = "critical";
    } else if (hoursUntil < 6) {
      urgency = "warning";
    }

    // If event has already started and still has incomplete items, it's critical
    if (hoursUntil < 0 && incompleteItemsCount > 0) {
      urgency = "critical";
    }

    return {
      id: event.id,
      name: event.title,
      startTime: event.eventDate.toISOString(),
      headcount: event.guestCount,
      unclaimedPrepCount,
      incompleteItemsCount,
      urgency,
    };
  });

  // Sort by urgency, then by time
  eventsWithStatus.sort((a, b) => {
    const urgencyOrder = { critical: 0, warning: 1, ok: 2 };
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) {
      return urgencyDiff;
    }
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  return NextResponse.json({ events: eventsWithStatus });
}
