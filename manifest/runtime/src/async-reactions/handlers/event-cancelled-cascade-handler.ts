/**
 * Async reaction handler for event-cancelled child-entity cascade cleanup.
 *
 * Deferred counterpart of {@link createEventCancelledCascadeMiddleware}. When
 * `EventCancelled` fires, the middleware (with async enabled) ENQUEUES a job
 * instead of dispatching synchronously; this handler runs LATER in the worker,
 * loads each child entity (EventStaff, CateringOrder, PrepList, Invoice,
 * CollectionCase) linked to the cancelled event, and dispatches the per-leg
 * governed command (unassign / cancel / voidInvoice / close) on every eligible
 * row.
 *
 * The load + filter + dispatch logic is duplicated here verbatim from the
 * synchronous middleware (same CASCADE_LEGS, same eligibility predicates, same
 * input builders, same idempotency key shape). The two paths are intentionally
 * independent: the middleware reads `ctx.emittedEvents` and the engine-stamped
 * `event.subject?.id`, while the handler only has the {@link TriggeringEventPayload}
 * captured at enqueue time.
 *
 * Idempotency: per (tenant, event, leg, child) — every dispatch carries
 * `event-cancel:${tenantId}:${eventId}:${leg.label}:${childId}`. The cascade is
 * guard-safe (only rows still satisfying the target command's guard dispatch),
 * so a partially-completed re-run skips already-handled rows. The worker is
 * at-least-once; these keys are load-bearing.
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const EVENT_CANCELLED_CASCADE_REACTION = "eventCancelledCascade";

interface ChildRow {
  amountPaid?: unknown;
  eventId?: unknown;
  id?: unknown;
  orderStatus?: unknown;
  status?: unknown;
  tenantId?: unknown;
}

interface ManifestStore {
  getAll(): Promise<unknown[]>;
}

interface CascadeLeg {
  buildInput: (reason: string) => Record<string, unknown>;
  command: string;
  eligible: (row: ChildRow) => boolean;
  entity: string;
  label: string;
}

const VOIDABLE_INVOICE_STATUSES = new Set(["DRAFT", "SENT", "VIEWED", "OVERDUE"]);
const OPEN_COLLECTION_STATUSES = new Set(["ACTIVE", "IN_PROGRESS", "DISPUTED"]);

const CASCADE_LEGS: CascadeLeg[] = [
  {
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

/**
 * Handler implementation. Exposed for direct unit testing.
 */
export const eventCancelledCascadeHandler: AsyncReactionHandler = async (
  ctx: AsyncReactionHandlerContext
): Promise<void> => {
  const { job, dispatchCommand, storeProvider, log } = ctx;
  const eventId = job.triggeringEvent.subjectId;
  const tenantId = job.tenantId;
  if (!eventId) {
    log.warn?.("eventCancelledCascade: missing subjectId — skipping", {
      jobId: job.id,
    });
    return;
  }

  const payload = job.triggeringEvent.payload as { reason?: unknown } | undefined;
  const reason = asNonEmptyString(payload?.reason) ?? "Event cancelled";

  let dispatches = 0;
  let failures = 0;

  for (const leg of CASCADE_LEGS) {
    const store = storeProvider(leg.entity) as ManifestStore | undefined;
    if (!store) {
      throw new Error(`${leg.entity} store unavailable`);
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
      if (!childId) continue;

      dispatches++;
      const result = await dispatchCommand(leg.command, leg.buildInput(reason), {
        entityName: leg.entity,
        instanceId: childId,
        correlationId: eventId,
        causationId: "EventCancelled",
        idempotencyKey: `event-cancel:${tenantId}:${eventId}:${leg.label}:${childId}`,
      });
      if (!result.success) {
        failures++;
        log.warn?.("eventCancelledCascade: leg dispatch failed", {
          jobId: job.id,
          entity: leg.entity,
          command: leg.command,
          childId,
          error: result.error ?? "unknown",
        });
      }
    }
  }

  if (dispatches > 0 && failures === dispatches) {
    throw new Error(
      `cascade failed for all ${failures} eligible child(ren): ${job.id}`
    );
  }
};

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

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
