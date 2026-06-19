/**
 * Async reaction handler for EventStaffAssigned → staff notification.
 *
 * Deferred counterpart of {@link createEventStaffAssignedNotifyMiddleware}.
 * When `EventStaffAssigned` fires (from either `EventStaff.assign` or the
 * auto-bootstrap `EventStaff.create`), the middleware (with async enabled)
 * ENQUEUES a job instead of dispatching synchronously; this handler runs LATER
 * in the worker, loads the authoritative EventStaff row for
 * staffMemberId/eventId/role, opportunistically loads the Event for its title,
 * and dispatches the governed `Notification.create` addressed to the assigned
 * staff member.
 *
 * Mirrors the synchronous middleware's graceful-degradation contract: the
 * EventStaff store and Event store are OPTIONAL enrichment — if either is
 * missing the handler falls back to the captured payload and still notifies
 * (never silently skips). The EventStaff row is authoritative when reachable
 * because it is robust to the create/assign payload differences.
 *
 * Idempotency: `event-staff-notify:${tenantId}:${eventStaffId}:${staffMemberId}`
 * — a re-delivered `EventStaffAssigned` (or the create-then-assign double-emit
 * on the same row) dedupes to a single notification; a genuine NEW assignment
 * (a distinct EventStaff row) gets a fresh key and notifies. The worker is
 * at-least-once; this key is load-bearing.
 */

import { randomUUID } from "node:crypto";
import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const EVENT_STAFF_ASSIGNED_NOTIFY_REACTION = "eventStaffAssignedNotify";

interface EventStaffAssignedPayload {
  eventId?: unknown;
  role?: unknown;
  staffMemberId?: unknown;
}

interface EventStaffLike {
  eventId?: unknown;
  role?: unknown;
  staffMemberId?: unknown;
}

interface EventLike {
  title?: unknown;
}

interface ManifestStore {
  getById(id: string): Promise<unknown | undefined>;
}

const NOTIFICATION_TYPE = "event_staff_assigned";

/**
 * Handler implementation. Exposed for direct unit testing.
 */
export const eventStaffAssignedNotifyHandler: AsyncReactionHandler = async (
  ctx: AsyncReactionHandlerContext
): Promise<void> => {
  const { job, dispatchCommand, storeProvider, log } = ctx;
  const eventStaffId = job.triggeringEvent.subjectId;
  const tenantId = job.tenantId;
  const payload = job.triggeringEvent.payload as
    | EventStaffAssignedPayload
    | undefined;

  if (!eventStaffId) {
    log.warn?.("eventStaffAssignedNotify: missing subjectId — skipping", {
      jobId: job.id,
    });
    return;
  }

  const eventStaffStore = storeProvider("EventStaff") as
    | ManifestStore
    | undefined;
  let row: EventStaffLike | undefined;
  if (eventStaffStore) {
    row = (await eventStaffStore.getById(eventStaffId)) as
      | EventStaffLike
      | undefined;
  }

  const staffMemberId =
    asNonEmptyString(row?.staffMemberId) ??
    asNonEmptyString(payload?.staffMemberId);
  const eventId =
    asNonEmptyString(row?.eventId) ?? asNonEmptyString(payload?.eventId);
  const role = asNonEmptyString(row?.role) ?? asNonEmptyString(payload?.role);

  if (!staffMemberId) {
    log.warn?.(
      "eventStaffAssignedNotify: no staffMemberId — no one to notify",
      { jobId: job.id, eventStaffId, eventId }
    );
    return;
  }

  let eventTitle: string | undefined;
  if (eventId) {
    const eventStore = storeProvider("Event") as ManifestStore | undefined;
    if (eventStore) {
      const eventRow = (await eventStore.getById(eventId)) as
        | EventLike
        | undefined;
      eventTitle = asNonEmptyString(eventRow?.title);
    }
  }

  const title = eventTitle
    ? `You've been assigned to ${eventTitle}`
    : "You've been assigned to an event";
  const body = composeBody(eventTitle, role);

  const result = await dispatchCommand(
    "create",
    {
      id: randomUUID(),
      tenantId,
      recipientEmployeeId: staffMemberId,
      notificationType: NOTIFICATION_TYPE,
      title,
      body,
      actionUrl: "",
      correlationId: eventId ?? "",
    },
    {
      entityName: "Notification",
      correlationId: eventId,
      causationId: "EventStaffAssigned",
      idempotencyKey: `event-staff-notify:${tenantId}:${eventStaffId}:${staffMemberId}`,
    }
  );

  if (!result.success) {
    throw new Error(
      `Notification.create failed for eventStaff ${eventStaffId}: ${result.error ?? "unknown"}`
    );
  }
};

function composeBody(
  eventTitle: string | undefined,
  role: string | undefined
): string {
  const where = eventTitle ? ` for ${eventTitle}` : " for an upcoming event";
  const as = role ? ` as ${role}` : "";
  return `You've been assigned${as}${where}. Check your upcoming shifts.`;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
