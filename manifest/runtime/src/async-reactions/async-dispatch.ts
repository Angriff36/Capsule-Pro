/**
 * Bridge between synchronous middleware and the async reaction queue.
 *
 * The pattern: every cross-entity reaction middleware loads a source entity
 * and dispatches governed commands. To convert one to async, we keep the
 * middleware in place (it has access to `ctx.emittedEvents` / `ctx.instanceId`
 * at after-emit time) but route the dispatch through this bridge. When an
 * async queue + handler are configured for the reaction name, the bridge
 * ENQUEUES a job (with the triggering event payload captured from `ctx`) and
 * returns immediately — the worker runs the handler later. When no queue is
 * configured (e.g. tests, dev without DB, or reactions not yet opted-in), the
 * bridge falls back to the synchronous dispatch — preserving today's behavior.
 *
 * This means:
 * - Existing middleware keep working unchanged when the queue is absent.
 * - Opting a reaction into async = wiring `asyncDispatch` in the factory for
 *   that one middleware. No middleware code changes.
 * - The 18 remaining migrations are each a 3-line factory edit (no middleware
 *   rewrite, no test rewrite, no IR change).
 *
 * @packageDocumentation
 */

import type {
  AsyncReactionQueueOptions,
  TriggeringEventPayload,
} from "./types";
import type { PostgresAsyncReactionStore } from "./postgres-async-reaction-store";

/**
 * A captured view of one emitted event relevant to an async reaction.
 *
 * Built from the synchronous middleware's `MiddlewareContext` so the worker
 * has the same subject id + payload the middleware would have dispatched on.
 */
export interface CapturedTriggeringEvent {
  /** Semantic event name (e.g. "EventUpdated"). */
  name: string;
  /** Engine-stamped source instance id. */
  subjectId?: string;
  /** Source entity name. */
  subjectEntity?: string;
  /** Declared event payload (engine's `{ ...commandInput, result }`). */
  payload: Record<string, unknown>;
}

/**
 * Context the bridge needs from a middleware at enqueue time.
 *
 * Cheap to build — a middleware already has all of this in its
 * `MiddlewareContext`. The bridge never touches `ctx.emittedEvents` directly;
 * the middleware filters + captures the events it cares about (preserving the
 * per-middleware trigger logic).
 */
export interface AsyncDispatchContext {
  tenantId: string;
  actorId?: string | null;
  /** The triggering event(s) the middleware filtered for. */
  triggeringEvents: CapturedTriggeringEvent[];
}

/**
 * The async-dispatch bridge. Middleware call this INSTEAD of their
 * `dispatchCommand` when an async reaction is configured.
 *
 * Returns `enqueued: N` (the number of jobs enqueued) for telemetry. The
 * caller (middleware) returns immediately after — no synchronous dispatch.
 */
export type AsyncDispatch = (
  ctx: AsyncDispatchContext,
  reactionName: string,
  options?: {
    idempotencyKey?: string;
    correlationId?: string;
    causationId?: string;
    policy?: AsyncReactionQueueOptions;
  }
) => Promise<{ enqueued: number }>;

/**
 * Build an async-dispatch bridge bound to a durable queue. Returns `undefined`
 * when no queue is configured — callers fall back to synchronous dispatch.
 *
 * @param store  The Postgres-backed queue (from the factory). `undefined` in
 *               test / no-DB contexts.
 */
export function createAsyncDispatch(
  store: PostgresAsyncReactionStore | undefined
): AsyncDispatch | undefined {
  if (!store) return undefined;

  return async (ctx, reactionName, options = {}) => {
    let enqueued = 0;
    for (const captured of ctx.triggeringEvents) {
      const triggeringEvent: TriggeringEventPayload = {
        name: captured.name,
        subjectId: captured.subjectId,
        subjectEntity: captured.subjectEntity,
        payload: captured.payload,
      };
      await store.enqueue({
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        reactionName,
        triggeringEvent,
        ...(options.idempotencyKey
          ? { idempotencyKey: options.idempotencyKey }
          : {}),
        ...(options.correlationId
          ? { correlationId: options.correlationId }
          : {}),
        ...(options.causationId ? { causationId: options.causationId } : {}),
        ...(options.policy ? { policy: options.policy } : {}),
      });
      enqueued++;
    }
    return { enqueued };
  };
}
