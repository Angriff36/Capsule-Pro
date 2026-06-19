/**
 * Async reaction handler for EventCreated → ClientInteraction.create.
 *
 * Deferred counterpart of {@link createEventCreatedClientInteractionMiddleware}.
 * When `EventCreated` fires, the middleware (with async enabled) ENQUEUES a job
 * instead of dispatching synchronously; this handler runs LATER in the worker,
 * reads clientId/title from the captured payload, checks for an existing
 * interaction correlated to the event (idempotency), and dispatches the
 * governed `ClientInteraction.create` attributed to the acting user
 * (`job.actorId`).
 *
 * The synchronous middleware sources the employee from
 * `ctx.runtimeContext.user.id`; the async handler sources it from
 * `job.actorId` (captured at enqueue time). Both fall back to `"system"` so the
 * `ClientInteraction.create` `employeeId != ""` guard always passes.
 *
 * Idempotency: one auto-logged interaction per event — both an explicit scan
 * (existing row with `correlationId === eventId`) and the dispatch key
 * `event-interaction:${tenantId}:${eventId}`. The worker is at-least-once;
 * these guards prevent duplicate timeline entries on redelivery.
 */

import { randomUUID } from "node:crypto";
import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const EVENT_CREATED_CLIENT_INTERACTION_REACTION =
  "eventCreatedClientInteraction";

interface InteractionLike {
  correlationId?: unknown;
  tenantId?: unknown;
}

interface EventCreatedPayload {
  clientId?: unknown;
  tenantId?: unknown;
  title?: unknown;
}

interface ManifestStore {
  getAll(): Promise<unknown[]>;
}

/**
 * Handler implementation. Exposed for direct unit testing.
 */
export const eventCreatedClientInteractionHandler: AsyncReactionHandler = async (
  ctx: AsyncReactionHandlerContext
): Promise<void> => {
  const { job, dispatchCommand, storeProvider, log } = ctx;
  const eventId = job.triggeringEvent.subjectId;
  const tenantId = job.tenantId;
  const payload = job.triggeringEvent.payload as
    | EventCreatedPayload
    | undefined;

  if (!eventId) {
    log.warn?.("eventCreatedClientInteraction: missing subjectId — skipping", {
      jobId: job.id,
    });
    return;
  }

  const clientId = asNonEmptyString(payload?.clientId);
  if (!clientId) {
    log.warn?.(
      "eventCreatedClientInteraction: no clientId — skipping CRM touch",
      { jobId: job.id, eventId }
    );
    return;
  }

  const interactionStore = storeProvider("ClientInteraction") as
    | ManifestStore
    | undefined;
  if (!interactionStore) {
    throw new Error("ClientInteraction store unavailable");
  }

  const existing = (await interactionStore.getAll()).find(
    (row) =>
      asNonEmptyString((row as InteractionLike).tenantId) === tenantId &&
      asNonEmptyString((row as InteractionLike).correlationId) === eventId
  );
  if (existing) {
    log.info?.("eventCreatedClientInteraction: already logged — skipping", {
      jobId: job.id,
      eventId,
    });
    return;
  }

  const employeeId = asNonEmptyString(job.actorId) ?? "system";
  const title = asNonEmptyString(payload?.title);
  const subject = title ? `New event booked: ${title}` : "New event booked";

  const interactionId = randomUUID();
  const result = await dispatchCommand(
    "create",
    {
      id: interactionId,
      tenantId,
      clientId,
      leadId: "",
      employeeId,
      interactionType: "note",
      interactionDate: Date.now(),
      subject,
      description: `Auto-logged CRM activity from event creation (event ${eventId}).`,
      followUpDate: null,
      correlationId: eventId,
    },
    {
      entityName: "ClientInteraction",
      correlationId: eventId,
      causationId: "EventCreated",
      idempotencyKey: `event-interaction:${tenantId}:${eventId}`,
    }
  );

  if (!result.success) {
    throw new Error(
      `ClientInteraction.create failed for event ${eventId}: ${result.error ?? "unknown"}`
    );
  }
};

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
