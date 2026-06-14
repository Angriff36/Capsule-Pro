/**
 * EventCancelled → child-entity cascade-cleanup middleware.
 *
 * Implements the Event-lifecycle propagation "when an event is cancelled, undo
 * the downstream commitments it created" (IMPLEMENTATION_PLAN P1, Event
 * lifecycle → EventCancelled cascade). Before this, `EventCancelled`
 * (Event.cancel) had ZERO consumers: cancelling an event left its staff still
 * assigned, its catering orders open, its prep lists live, its draft/sent
 * invoices billable, and its collection cases active — every downstream record
 * had to be cleaned up by hand (or silently rotted).
 *
 * WHY middleware and not a reaction (the crux): each leg is a 1:N fan-out —
 * one cancelled Event has MANY EventStaff / CateringOrder / PrepList / Invoice /
 * CollectionCase rows, resolved by `eventId`. A declarative `on EventCancelled
 * run X.cancel` reaction resolves exactly ONE target instance, so it
 * structurally cannot reach the set (same reason as prep-list-seed /
 * prep-inventory-demand / prep-list-completed-consume). Middleware loads the
 * children from the store and dispatches one governed cancel/unassign/void/close
 * per row.
 *
 * Each leg is GUARD-SAFE and IDEMPOTENT: a child is only dispatched when its
 * current status still satisfies the target command's guard, so a re-emitted
 * `EventCancelled` (or a partially-completed cascade) skips already-handled rows
 * rather than spamming guard failures. Every skip/failure reports through
 * `onDiagnostic` (default console.warn) — never silently.
 *
 * Inventory reservations held by the event's prep lists are released by the
 * sibling `prep-list-cancelled-release-reservation` middleware: the PrepList.cancel
 * this cascade dispatches re-enters `runCommand` (the engine's dispatch is
 * re-entrant), emits `PrepListCancelled`, and that middleware releases each
 * item's reserved quantity. So the inventory leg auto-chains off the prep-list
 * leg here — it is not duplicated in this file.
 *
 * KNOWN LIMITATION (documented, not silent): every dispatched command runs as
 * the SAME actor that cancelled the event and is subject to that target entity's
 * policy. Cancelling an event is an admin/manager action in practice, so the
 * common case passes; if a lower-privilege actor cancels an event, a
 * policy-restricted leg (e.g. Invoice.voidInvoice) is denied and that child is
 * skipped with a diagnostic rather than voided. Elevating the dispatch identity
 * is out of scope (the runtime has no per-call user override).
 */

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

export interface EventCancelledCascadeDiagnostic {
  childEntity?: string;
  childId?: string;
  detail?: Record<string, unknown>;
  eventId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface EventCancelledCascadeMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: EventCancelledCascadeDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface ChildRow {
  amountPaid?: unknown;
  eventId?: unknown;
  id?: unknown;
  orderStatus?: unknown;
  status?: unknown;
  tenantId?: unknown;
}

/**
 * One cascade leg = one child entity + the governed command to run on each of
 * its rows linked to the cancelled event, plus the guard-safe eligibility test
 * and the command input builder.
 */
interface CascadeLeg {
  /** Builds the dispatched command input (reason / resolution). */
  buildInput: (reason: string) => Record<string, unknown>;
  /** Governed command to dispatch on each eligible child. */
  command: string;
  /** Whether this child row still satisfies the target command's guard. */
  eligible: (row: ChildRow) => boolean;
  /** IR entity name (store key + dispatch entityName). */
  entity: string;
  /** Short label for idempotency keys + diagnostics. */
  label: string;
}

const VOIDABLE_INVOICE_STATUSES = new Set(["DRAFT", "SENT", "VIEWED", "OVERDUE"]);
const OPEN_COLLECTION_STATUSES = new Set(["ACTIVE", "IN_PROGRESS", "DISPUTED"]);

const CASCADE_LEGS: CascadeLeg[] = [
  {
    // EventStaff.unassign(reason) — guard: status in [assigned, confirmed].
    entity: "EventStaff",
    command: "unassign",
    label: "unassign-staff",
    eligible: (row) => {
      const status = asNonEmptyString(row.status);
      return status === "assigned" || status === "confirmed";
    },
    buildInput: (reason) => ({ reason }),
  },
  {
    // CateringOrder.cancel(reason) — guard: orderStatus not completed/cancelled.
    // NOTE: status field is `orderStatus`, not `status`.
    entity: "CateringOrder",
    command: "cancel",
    label: "cancel-catering",
    eligible: (row) => {
      const status = asNonEmptyString(row.orderStatus);
      return status !== undefined && status !== "completed" && status !== "cancelled";
    },
    buildInput: (reason) => ({ reason }),
  },
  {
    // PrepList.cancel(reason) — guard: status != completed. Also skip already
    // cancelled (idempotency). Releasing reservations is handled downstream by
    // the prep-list-cancelled-release-reservation middleware (auto-chains).
    entity: "PrepList",
    command: "cancel",
    label: "cancel-preplist",
    eligible: (row) => {
      const status = asNonEmptyString(row.status);
      return status !== undefined && status !== "completed" && status !== "cancelled";
    },
    buildInput: (reason) => ({ reason }),
  },
  {
    // Invoice.voidInvoice(reason) — guard: status in [DRAFT,SENT,VIEWED,OVERDUE]
    // AND amountPaid == 0. Paid / partially-paid invoices are NOT voided here
    // (they need a refund/credit flow, not a void).
    entity: "Invoice",
    command: "voidInvoice",
    label: "void-invoice",
    eligible: (row) => {
      const status = asNonEmptyString(row.status);
      return (
        status !== undefined &&
        VOIDABLE_INVOICE_STATUSES.has(status) &&
        asNumber(row.amountPaid) === 0
      );
    },
    buildInput: (reason) => ({ reason }),
  },
  {
    // CollectionCase.close(resolution) — guard: status in
    // [ACTIVE,IN_PROGRESS,DISPUTED]. Param is `resolution`, not `reason`.
    entity: "CollectionCase",
    command: "close",
    label: "close-collection",
    eligible: (row) => {
      const status = asNonEmptyString(row.status);
      return status !== undefined && OPEN_COLLECTION_STATUSES.has(status);
    },
    buildInput: (reason) => ({ resolution: reason }),
  },
];

const defaultDiagnostic = (diag: EventCancelledCascadeDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[event-cancel-cascade:${diag.stage}] ${diag.reason}`, {
    eventId: diag.eventId,
    tenantId: diag.tenantId,
    childEntity: diag.childEntity,
    childId: diag.childId,
    ...diag.detail,
  });
};

export function createEventCancelledCascadeMiddleware(
  options: EventCancelledCascadeMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const cancelledEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "EventCancelled" &&
          ctx.entityName === "Event" &&
          ctx.command.name === "cancel"
      );

      for (const event of cancelledEvents) {
        const payload = event.payload as
          | { reason?: unknown; tenantId?: unknown }
          | undefined;

        // The event id is the engine-stamped source instance id — the declared
        // `eventId` event field is NOT auto-populated from self.* (mirrors how
        // EventCreated→BattleBoard reads payload.result.id, not payload.eventId).
        const eventId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(eventId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `EventCancelled missing ${eventId ? "tenantId" : "eventId"}`,
            eventId,
            tenantId,
          });
          continue;
        }

        // `reason` IS an Event.cancel input param, so it rides the payload.
        const reason = asNonEmptyString(payload?.reason) ?? "Event cancelled";

        for (const leg of CASCADE_LEGS) {
          const store = storeProvider(leg.entity);
          if (!store) {
            onDiagnostic({
              stage: "stores",
              reason: `${leg.entity} store unavailable — ${leg.label} skipped`,
              eventId,
              tenantId,
              childEntity: leg.entity,
            });
            continue;
          }

          const rows = (await store.getAll())
            .map((row) => row as ChildRow)
            .filter(
              (row) =>
                asNonEmptyString(row.tenantId) === tenantId &&
                asNonEmptyString(row.eventId) === eventId &&
                leg.eligible(row)
            );

          for (const row of rows) {
            const childId = asNonEmptyString(row.id);
            if (!childId) {
              continue;
            }

            const result = await dispatchCommand(leg.command, leg.buildInput(reason), {
              entityName: leg.entity,
              instanceId: childId,
              correlationId: eventId,
              causationId: "EventCancelled",
              idempotencyKey: `event-cancel:${tenantId}:${eventId}:${leg.label}:${childId}`,
            });

            if (result.emittedEvents) {
              ctx.emittedEvents.push(...result.emittedEvents);
            }
            if (!result.success) {
              // Guard rejection (e.g. policy-denied void) or store error —
              // surfaced, not fatal. The remaining children/legs still run.
              onDiagnostic({
                stage: "dispatch",
                reason: `${leg.entity}.${leg.command} failed for ${childId}: ${result.error ?? "unknown"}`,
                eventId,
                tenantId,
                childEntity: leg.entity,
                childId,
              });
              continue;
            }

            onDiagnostic({
              stage: "done",
              reason: `${leg.entity}.${leg.command} applied for cancelled event`,
              eventId,
              tenantId,
              childEntity: leg.entity,
              childId,
            });
          }
        }
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Coerce Decimal-as-string / number money fields to a number (default 0). */
function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
