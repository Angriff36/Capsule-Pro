/**
 * EventStaffAssigned → Notification for the assigned staff member
 * (IMPLEMENTATION_PLAN P1, Staffing → "EventStaffAssigned → …notify the staff member").
 *
 * WHY this exists: when a staff member is rostered onto an event
 * (`EventStaff.assign`, and the auto-bootstrap `EventStaff.create` — BOTH emit
 * `EventStaffAssigned`, event-staff-rules.manifest:148-157), the person being
 * assigned should be told. Until this middleware existed `EventStaffAssigned` had
 * ZERO consumers (verified: no reaction, no middleware, no factory registration),
 * so the `/notifications` surface was blind to event staffing — staff learned of
 * their assignments only by someone telling them out of band.
 *
 * WHY middleware and not a reaction (the structural reason, per the verified
 * engine-semantics correction in IMPLEMENTATION_PLAN P0):
 *   - The recipient id (`staffMemberId`) IS an `assign`/`create` param, so a 1:1
 *     reaction could technically resolve the recipient. But a *useful* assignment
 *     notification names the event ("You've been assigned to Smith Wedding as Lead
 *     Server"), and the event TITLE is the Event's OWN field — it is never on the
 *     `EventStaffAssigned` payload (the engine payload is `{...commandInput, result}`
 *     only; declared event fields are not auto-populated from `self.*`). Composing
 *     that message requires LOADING the Event, which a declarative reaction cannot
 *     do. The deal-lifecycle DealAssigned→Notification leg uses the same pattern
 *     (load the parent for its title before notifying).
 *   - Anchoring by the persisted EventStaff row (via `_subject.id`) also makes the
 *     leg robust to the dual emitter: `create` and `assign` carry slightly different
 *     payloads, but the post-mutation row always holds the final
 *     `eventId`/`staffMemberId`/`role`.
 *
 * Resolution: on `EventStaffAssigned`, load the assignment row for its authoritative
 * `staffMemberId`/`eventId`/`role`, opportunistically load the Event for its title,
 * and dispatch the governed `Notification.create` — `recipientEmployeeId` = the
 * assignment's `staffMemberId`, `correlationId` = the `eventId` (so the notification
 * is traceable back to the event).
 *
 * Idempotency: the dispatch key is `event-staff-notify:{tenant}:{eventStaffId}:{staffMemberId}`.
 * A re-delivered `EventStaffAssigned` (or the create-then-assign double-emit on the
 * same row) dedupes to a single notification; a genuine NEW assignment (a distinct
 * EventStaff row) gets a fresh key and notifies.
 *
 * KNOWN LIMITATION (documented, not silent): the recipient is `EventStaff.staffMemberId`
 * (a `StaffMember` id) used as `Notification.recipientEmployeeId` (conventionally a
 * `User`/employee id). StaffMember has no `User`/`employeeId` FK; the app already
 * relies on this `staffMemberId == employeeId` convention elsewhere (the staff page
 * joins `event_staff.staffMemberId = employees.id` by convention), so this leg
 * follows it. Also, the dispatched `Notification.create` runs as the SAME actor who
 * assigned the staff and is subject to Notification's default policy
 * (`user.role in ["manager", "admin"]`); an assigner with a lower-privilege role
 * (e.g. event_coordinator) yields a policy-denied dispatch reported via
 * `onDiagnostic` rather than a created row (the runtime has no per-call identity
 * override — same class as the deal-assign / event-created-client-interaction legs).
 *
 * Every skip path reports through `onDiagnostic` (default: console.warn) instead of
 * returning silently, so "an assignment that notified no one" is visible.
 */

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

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

export interface EventStaffAssignedNotifyDiagnostic {
  detail?: Record<string, unknown>;
  eventId?: string;
  eventStaffId?: string;
  reason: string;
  staffMemberId?: string;
  stage: string;
  tenantId?: string;
}

export interface EventStaffAssignedNotifyMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: EventStaffAssignedNotifyDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

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

const NOTIFICATION_TYPE = "event_staff_assigned";

const defaultDiagnostic = (diag: EventStaffAssignedNotifyDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[event-staff-notify:${diag.stage}] ${diag.reason}`, {
    eventStaffId: diag.eventStaffId,
    eventId: diag.eventId,
    staffMemberId: diag.staffMemberId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that notifies the assigned staff member when they are rostered
 * onto an event. Store/provider based so tests and production share the same
 * Manifest runtime boundary.
 */
export function createEventStaffAssignedNotifyMiddleware(
  options: EventStaffAssignedNotifyMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine EventStaff assignment — both `assign` and the
      // auto-bootstrap `create` emit EventStaffAssigned.
      if (
        !(
          ctx.entityName === "EventStaff" &&
          (ctx.command.name === "assign" || ctx.command.name === "create")
        )
      ) {
        return {};
      }

      const assigned = ctx.emittedEvents.filter(
        (event) => event.name === "EventStaffAssigned"
      );

      for (const event of assigned) {
        const payload = event.payload as EventStaffAssignedPayload | undefined;
        const tenantId = asNonEmptyString(
          (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
            ?.tenantId
        );
        // The assignment row id — the authoritative source for the row's fields,
        // robust to the create/assign payload differences.
        const eventStaffId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);

        if (!tenantId) {
          onDiagnostic({
            stage: "resolve",
            reason: "missing tenantId for assigned staff — cannot notify",
            eventStaffId,
          });
          continue;
        }

        // Load the persisted EventStaff row for authoritative fields; fall back to
        // the payload (assign/create params) if the row is not reachable.
        let row: EventStaffLike | undefined;
        if (eventStaffId) {
          const eventStaffStore = storeProvider("EventStaff");
          if (eventStaffStore) {
            row = (await eventStaffStore.getById(eventStaffId)) as
              | EventStaffLike
              | undefined;
          }
        }

        const staffMemberId =
          asNonEmptyString(row?.staffMemberId) ??
          asNonEmptyString(payload?.staffMemberId);
        const eventId =
          asNonEmptyString(row?.eventId) ?? asNonEmptyString(payload?.eventId);
        const role =
          asNonEmptyString(row?.role) ?? asNonEmptyString(payload?.role);

        if (!staffMemberId) {
          onDiagnostic({
            stage: "recipient",
            reason: "assignment carried no staffMemberId — no one to notify",
            eventStaffId,
            eventId,
            tenantId,
          });
          continue;
        }

        // Opportunistically enrich the message with the event title; a missing
        // Event row falls back to a generic message rather than blocking the notify.
        let eventTitle: string | undefined;
        if (eventId) {
          const eventStore = storeProvider("Event");
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
            // For a create the new id travels in the body, NOT as instanceId
            // (passing instanceId targets an existing instance and the row is
            // never persisted — mirrors schedule-notify / lead-deal creates).
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
            idempotencyKey: `event-staff-notify:${tenantId}:${eventStaffId ?? "x"}:${staffMemberId}`,
          }
        );

        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            reason: `Notification.create failed: ${result.error ?? "unknown"}`,
            eventStaffId,
            eventId,
            staffMemberId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: "assigned staff member notified",
          eventStaffId,
          eventId,
          staffMemberId,
          tenantId,
        });
      }

      return {};
    },
  };
}

function composeBody(eventTitle: string | undefined, role: string | undefined): string {
  const where = eventTitle ? ` for ${eventTitle}` : " for an upcoming event";
  const as = role ? ` as ${role}` : "";
  return `You've been assigned${as}${where}. Check your upcoming shifts.`;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
