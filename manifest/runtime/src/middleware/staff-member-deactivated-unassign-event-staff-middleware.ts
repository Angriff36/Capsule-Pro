/**
 * StaffMemberDeactivated → unassign the staff member's active EventStaff
 * assignments (IMPLEMENTATION_PLAN P1, Staffing → "StaffMemberDeactivated →
 * unassign future work").
 *
 * WHY this exists: deactivating a staff member must take them OFF the event
 * assignments they have not yet worked — otherwise a deactivated person stays
 * rostered as "assigned"/"confirmed" on upcoming events, so the event staffing
 * sheet shows someone who can no longer work as still on the crew (a stale
 * double-booking a coordinator has to clean up by hand). Until this middleware
 * existed, `StaffMemberDeactivated` (staff-member-rules.manifest:101) had ZERO
 * consumers: deactivation flipped only the staff member's own status and left
 * every open EventStaff assignment live.
 *
 * SCOPE — EventStaff only (deliberately, not the plan's full leg list). The plan
 * item also names `ScheduleShift` and `TimeOffRequest`/`TimecardEditRequest`,
 * but:
 *   - `ScheduleShift` is OUT: `ScheduleShift.employeeId belongsTo User`
 *     (schedule-rules.manifest:143) — a DIFFERENT id space than `StaffMember`.
 *     `StaffMemberDeactivated` carries `staffMemberId` = the `StaffMember` id,
 *     which is NOT a `ScheduleShift.employeeId`, so matching the two would be an
 *     identity mismatch (the very caveat IMPLEMENTATION_PLAN line 80 flags). That
 *     leg belongs to a `User`/employee-deactivation event, not this one.
 *   - cancelling open `TimecardEditRequest` is OUT: that entity has no `cancel`
 *     command yet (a prerequisite IR/source change — plan line 88).
 * `EventStaff.staffMemberId belongsTo StaffMember` (event-staff-rules.manifest:41)
 * IS a genuine same-id-space FK, so this leg is sound with no prerequisite.
 *
 * WHY middleware and not a reaction (the structural reason, per the verified
 * engine-semantics correction in IMPLEMENTATION_PLAN P0):
 *   - It is a 1:N fan-out: one deactivated staff member → MANY open EventStaff
 *     rows. A declarative reaction resolves exactly ONE target instance, so it
 *     cannot reach the set.
 *   - The target EventStaff rows are found by scanning `staffMemberId` across the
 *     store; that staff-member id is the source instance id (`_subject.id`), but
 *     the SET of assignments is not expressible in a reaction `params` block.
 *
 * Resolution: on `StaffMemberDeactivated`, take `staffMemberId` from the engine-
 * stamped `_subject.id`, then scan `EventStaff` for that tenant + staff member
 * whose status is still pre-work (`assigned`/`confirmed`) and dispatch the
 * governed `EventStaff.unassign(reason)` on each. The deactivation `reason` rides
 * the payload (it IS a `deactivate` input param) and is carried through to each
 * assignment's notes.
 *
 * Guard-safe + idempotent: only `assigned`/`confirmed` assignments are touched —
 * which is exactly what `EventStaff.unassign` guards
 * (`status in ["assigned", "confirmed"]`), so the dispatch never relies on the
 * engine swallowing a guard failure. Already-`unassigned`/`checked_in`/
 * `checked_out`/`no_show`/`completed` (and any soft-deleted) rows are filtered out
 * before dispatch, so a re-delivered `StaffMemberDeactivated` re-scans and finds
 * nothing to do; each dispatch also carries a per-(staffMember, assignment)
 * idempotency key. Every skip path reports through `onDiagnostic`.
 *
 * KNOWN LIMITATION (documented, not silent): each `unassign` dispatch runs as the
 * SAME actor who deactivated the staff member and is subject to `EventStaff`'s
 * default policy (`staff`/`event_coordinator`/`catering_manager`/`event_manager`/
 * `manager`/`admin`). `StaffMember.deactivate`'s own default policy is
 * `hr_admin`/`payroll_admin`/`manager`/`admin`, so a `manager`/`admin` (the
 * overlap) always passes both — but an `hr_admin`/`payroll_admin` deactivating a
 * staff member is NOT in `EventStaff`'s policy set, so their `unassign` is
 * policy-denied and the assignment is skipped with a diagnostic (the runtime has
 * no per-call identity override).
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";
import type { AsyncDispatch } from "../async-reactions";
import {
  captureTriggeringEvents,
  STAFF_MEMBER_DEACTIVATED_UNASSIGN_EVENT_STAFF_REACTION,
} from "../async-reactions";

interface RunCommandOptions {
  causationId?: string;
  correlationId?: string;
  entityName?: string;
  idempotencyKey?: string;
  instanceId?: string;
}

type DispatchCommand = (
  commandName: string,
  input: Record<string, unknown>,
  options: RunCommandOptions
) => Promise<CommandResult>;

export interface StaffMemberDeactivatedUnassignDiagnostic {
  detail?: Record<string, unknown>;
  eventStaffId?: string;
  reason: string;
  staffMemberId?: string;
  stage: string;
  tenantId?: string;
}

export interface StaffMemberDeactivatedUnassignEventStaffMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  asyncEnqueue?: AsyncDispatch;
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: StaffMemberDeactivatedUnassignDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface EventStaffLike {
  deletedAt?: unknown;
  id?: unknown;
  staffMemberId?: unknown;
  status?: unknown;
  tenantId?: unknown;
}

interface StaffMemberDeactivatedPayload {
  reason?: unknown;
  tenantId?: unknown;
}

/** Pre-work assignment statuses — the only states `EventStaff.unassign` allows. */
const UNASSIGNABLE_STATUSES = new Set(["assigned", "confirmed"]);

const defaultDiagnostic = (
  diag: StaffMemberDeactivatedUnassignDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[staff-deactivate-unassign:${diag.stage}] ${diag.reason}`, {
    staffMemberId: diag.staffMemberId,
    eventStaffId: diag.eventStaffId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that unassigns a staff member's open event assignments when
 * the staff member is deactivated. Store/provider based so tests and production
 * share the same Manifest runtime boundary.
 */
export function createStaffMemberDeactivatedUnassignEventStaffMiddleware(
  options: StaffMemberDeactivatedUnassignEventStaffMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
    asyncEnqueue,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine StaffMember.deactivate — not a look-alike event.
      if (
        !(ctx.entityName === "StaffMember" && ctx.command.name === "deactivate")
      ) {
        return {};
      }

      const deactivatedEvents = ctx.emittedEvents.filter(
        (event) => event.name === "StaffMemberDeactivated"
      );

      if (asyncEnqueue && deactivatedEvents.length > 0) {
        await captureTriggeringEvents({
          asyncEnqueue,
          ctx,
          events: deactivatedEvents,
          reactionName:
            STAFF_MEMBER_DEACTIVATED_UNASSIGN_EVENT_STAFF_REACTION,
        });
        return {};
      }

      for (const event of deactivatedEvents) {
        const payload = event.payload as
          | StaffMemberDeactivatedPayload
          | undefined;

        // The staff member id IS the engine-stamped source instance id.
        const staffMemberId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        // `reason` is a genuine `deactivate` input param, so it rides the payload;
        // it becomes the unassigned assignment's note for an audit trail.
        const deactivationReason = asNonEmptyString(payload?.reason);
        const unassignReason = deactivationReason
          ? `Staff member deactivated: ${deactivationReason}`
          : "Staff member deactivated";

        if (!(staffMemberId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `StaffMemberDeactivated missing ${staffMemberId ? "tenantId" : "staffMemberId"}`,
            staffMemberId,
            tenantId,
          });
          continue;
        }

        const eventStaffStore = storeProvider("EventStaff");
        if (!eventStaffStore) {
          onDiagnostic({
            stage: "stores",
            reason: "EventStaff store unavailable — assignments not unassigned",
            staffMemberId,
            tenantId,
          });
          continue;
        }

        // Open assignments: this staff member's active pre-work EventStaff rows.
        const openAssignments = (await eventStaffStore.getAll())
          .map((row) => row as EventStaffLike)
          .filter((row) => {
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
          onDiagnostic({
            stage: "scan",
            reason: "no open event assignments for deactivated staff member",
            staffMemberId,
            tenantId,
          });
          continue;
        }

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
              causationId: "StaffMemberDeactivated",
              idempotencyKey: `staff-deactivate-unassign:${tenantId}:${staffMemberId}:${eventStaffId}`,
            }
          );

          if (result.emittedEvents) {
            ctx.emittedEvents.push(...result.emittedEvents);
          }
          if (!result.success) {
            onDiagnostic({
              stage: "unassign",
              reason: `EventStaff.unassign failed for ${eventStaffId}: ${result.error ?? "unknown"}`,
              staffMemberId,
              eventStaffId,
              tenantId,
            });
            continue;
          }

          onDiagnostic({
            stage: "unassigned",
            reason: "open event assignment unassigned for deactivated staff member",
            staffMemberId,
            eventStaffId,
            tenantId,
          });
        }
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** A removed assignment carries a non-null/non-empty `deletedAt`. */
function isRemoved(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === "string") {
    return value.length > 0;
  }
  // epoch-ms number or Date → removed.
  return true;
}
