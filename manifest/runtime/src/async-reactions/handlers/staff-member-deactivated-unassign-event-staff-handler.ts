/**
 * Async reaction handler for staff member deactivation → event assignment unassign.
 *
 * Deferred counterpart of {@link createStaffMemberDeactivatedUnassignEventStaffMiddleware}.
 * When `StaffMemberDeactivated` fires (from `StaffMember.deactivate`), the
 * middleware (with async enabled) ENQUEUES a job; this handler runs LATER in
 * the worker, loads all `EventStaff` rows for the deactivated staff member
 * that are still in a pre-work status (`assigned`/`confirmed`), and dispatches
 * the governed `EventStaff.unassign(reason)` per assignment so a deactivated
 * person is taken off upcoming event rosters.
 *
 * The staff member id is the engine-stamped source instance id, received as
 * the job's `triggeringEvent.subjectId`. The deactivation `reason` rides the
 * triggering event payload and is carried through to each assignment's
 * unassign reason for an audit trail.
 *
 * Guard-safe + idempotent: only `assigned`/`confirmed` assignments are touched
 * — which is exactly what `EventStaff.unassign` guards — so the dispatch never
 * relies on the engine swallowing a guard failure. Already-unassigned /
 * checked-in / soft-deleted rows are filtered out before dispatch, so a
 * re-delivered job re-scans and finds nothing to do. Each dispatch carries a
 * per-(tenant, staff, assignment) idempotency key.
 *
 * Partial failures: if at least one assignment is unassigned the job is treated
 * as delivered; failed assignments are surfaced via `log.warn`. Only when every
 * dispatch fails does the handler throw so the retry/DLQ path engages.
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const STAFF_MEMBER_DEACTIVATED_UNASSIGN_EVENT_STAFF_REACTION =
  "staffMemberDeactivatedUnassignEventStaff";

interface EventStaffRow {
  deletedAt?: unknown;
  id?: unknown;
  staffMemberId?: unknown;
  status?: unknown;
  tenantId?: unknown;
}

interface StaffMemberDeactivatedPayload {
  reason?: unknown;
}

interface ManifestStore {
  getAll(): Promise<unknown[]>;
}

const UNASSIGNABLE_STATUSES = new Set(["assigned", "confirmed"]);

/**
 * Handler implementation. Exposed for direct unit testing (the registry
 * registers a thin wrapper around it).
 */
export const staffMemberDeactivatedUnassignEventStaffHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const staffMemberId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;
    const payload = job.triggeringEvent.payload as
      | StaffMemberDeactivatedPayload
      | undefined;

    if (!staffMemberId) {
      log.warn?.(
        "staffDeactivatedUnassign: missing subjectId — skipping",
        { jobId: job.id }
      );
      return;
    }

    const deactivationReason = asNonEmptyString(payload?.reason);
    const unassignReason = deactivationReason
      ? `Staff member deactivated: ${deactivationReason}`
      : "Staff member deactivated";

    const store = storeProvider("EventStaff") as ManifestStore | undefined;
    if (!store) {
      throw new Error("EventStaff store unavailable");
    }

    const openAssignments = (
      (await store.getAll()) as EventStaffRow[]
    ).filter((row) => {
      if (asNonEmptyString(row.tenantId) !== tenantId) {
        return false;
      }
      if (asNonEmptyString(row.staffMemberId) !== staffMemberId) {
        return false;
      }
      if (isRemoved(row.deletedAt)) {
        return false;
      }
      const status = asNonEmptyString(row.status);
      return status !== undefined && UNASSIGNABLE_STATUSES.has(status);
    });

    if (openAssignments.length === 0) {
      return;
    }

    const eventName = job.triggeringEvent.name;
    let failures = 0;

    for (const assignment of openAssignments) {
      const eventStaffId = asNonEmptyString(assignment.id);
      if (!eventStaffId) {
        continue;
      }

      const result = await dispatchCommand(
        "unassign",
        { reason: unassignReason },
        {
          entityName: "EventStaff",
          instanceId: eventStaffId,
          correlationId: staffMemberId,
          causationId: eventName,
          idempotencyKey: `staff-deactivated:${tenantId}:${staffMemberId}:${eventStaffId}`,
        }
      );

      if (!result.success) {
        failures++;
        log.warn?.(
          "staffDeactivatedUnassign: unassign failed for assignment",
          {
            jobId: job.id,
            staffMemberId,
            eventStaffId,
            error: result.error ?? "unknown",
          }
        );
      }
    }

    if (failures > 0 && failures === openAssignments.length) {
      throw new Error(
        `EventStaff.unassign failed for all ${failures} assignment(s): ${job.id}`
      );
    }
  };

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRemoved(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === "string") {
    return value.length > 0;
  }
  return true;
}
