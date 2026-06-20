/**
 * Shared async-path helper for cross-entity reaction middleware.
 *
 * Each after-emit middleware that opts into the async durable queue follows
 * the SAME pattern (proven by the two pilot middleware,
 * `event-updated-board-sync` + `shipment-item-received-inventory-restock`):
 *
 *   1. Filter `ctx.emittedEvents` for the trigger event name(s).
 *   2. Resolve the subject id (`event.subject?.id` or `ctx.instanceId`).
 *   3. Resolve tenantId + actorId from the runtime context.
 *   4. Build a {@link CapturedTriggeringEvent}[] and call `asyncEnqueue`.
 *   5. Return early — the worker runs the load+dispatch LATER.
 *
 * This helper extracts that pattern. A middleware conversion becomes:
 *
 * ```ts
 * if (asyncEnqueue) {
 *   return captureTriggeringEvents({
 *     asyncEnqueue,
 *     ctx,
 *     events: triggers,
 *     reactionName: MY_REACTION,
 *     // optional: dedupeBySubject, idempotencyKey
 *   }).then(() => ({}));
 * }
 * ```
 *
 * Variations the helper supports (mirroring the pilots):
 * - `dedupeBySubject`: the board-sync pilot dedupes by eventId (one Event can
 *   emit EventUpdated/DateUpdated/LocationUpdated in a single command, and the
 *   worker dispatches per-board — multiple jobs for the same event would
 *   duplicate work). Default `false` (most reactions fire once per command).
 * - `idempotencyKey` / `buildIdempotencyKey`: the shipment-restock pilot passes
 *   a per-line idempotency key so worker at-least-once redelivery cannot
 *   double-count stock. Default: no idempotency key (reaction is naturally
 *   idempotent, e.g. an overwrite sync).
 *
 * @packageDocumentation
 */

import type { MiddlewareContext } from "@angriff36/manifest";
import type { AsyncDispatch } from "./async-dispatch";
import type { CapturedTriggeringEvent } from "./async-dispatch";

/** Minimal structural view of an EmittedEvent — avoids importing engine internals. */
interface EmittedEventLike {
  name: string;
  payload?: unknown;
  subject?: { id?: unknown } | null;
}

/**
 * Build the captured triggering event list and enqueue them as a single
 * reaction. Returns the number of jobs enqueued (0 when nothing was captured
 * or tenantId could not be resolved).
 *
 * The caller is expected to have already filtered `ctx.emittedEvents` for the
 * event name(s) it cares about — pass that filtered list as `events`.
 */
export async function captureTriggeringEvents(options: {
  /** The async dispatch bridge (required — caller already checked it's set). */
  asyncEnqueue: AsyncDispatch;
  /** The middleware context (source of tenantId/actorId/instanceId/entityName). */
  ctx: MiddlewareContext;
  /** Pre-filtered emitted events the reaction should fire on. */
  events: EmittedEventLike[];
  /** Registered reaction name (matches a handler in {@link asyncReactionRegistry}). */
  reactionName: string;
  /** Dedupe captured events by subjectId (default: false). */
  dedupeBySubject?: boolean;
  /** Static idempotency key forwarded to the worker. */
  idempotencyKey?: string;
  /** Build an idempotency key from the first captured subjectId. */
  buildIdempotencyKey?: (firstSubjectId: string) => string;
  /** Forwarded correlation id. */
  correlationId?: string;
  /** Forwarded causation id. */
  causationId?: string;
}): Promise<{ enqueued: number }> {
  const {
    asyncEnqueue,
    ctx,
    events,
    reactionName,
    dedupeBySubject = false,
    idempotencyKey,
    buildIdempotencyKey,
    correlationId,
    causationId,
  } = options;

  const tenantId = resolveTenantId(ctx);
  if (!tenantId) {
    return { enqueued: 0 };
  }

  const triggeringEvents: CapturedTriggeringEvent[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    const subjectId =
      asNonEmptyString(event.subject?.id) ?? asNonEmptyString(ctx.instanceId);
    if (!subjectId) continue;
    if (dedupeBySubject) {
      if (seen.has(subjectId)) continue;
      seen.add(subjectId);
    }
    triggeringEvents.push({
      name: event.name,
      subjectId,
      subjectEntity: ctx.entityName,
      payload: ((event.payload as Record<string, unknown> | undefined) ??
        {}) as Record<string, unknown>,
    });
  }

  if (triggeringEvents.length === 0) {
    return { enqueued: 0 };
  }

  const dispatchOptions: {
    idempotencyKey?: string;
    correlationId?: string;
    causationId?: string;
  } = {};
  if (idempotencyKey) {
    dispatchOptions.idempotencyKey = idempotencyKey;
  } else if (buildIdempotencyKey) {
    dispatchOptions.idempotencyKey = buildIdempotencyKey(
      triggeringEvents[0]?.subjectId ?? ""
    );
  }
  if (correlationId) dispatchOptions.correlationId = correlationId;
  if (causationId) dispatchOptions.causationId = causationId;

  return asyncEnqueue(
    {
      tenantId,
      actorId: resolveActorId(ctx),
      triggeringEvents,
    },
    reactionName,
    dispatchOptions
  );
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function resolveTenantId(ctx: MiddlewareContext): string | undefined {
  const fromUser = (
    ctx.runtimeContext.user as { tenantId?: unknown } | undefined
  )?.tenantId;
  return asNonEmptyString(fromUser);
}

function resolveActorId(ctx: MiddlewareContext): string | null {
  const fromUser = (ctx.runtimeContext.user as { id?: unknown } | undefined)
    ?.id;
  return asNonEmptyString(fromUser) ?? null;
}
