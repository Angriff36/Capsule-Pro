/**
 * Async reaction worker — drains the durable queue and dispatches jobs through
 * the registered handlers with retry + exponential backoff + DLQ + alerting.
 *
 * Invoke {@link drainAsyncReactions} from a cron-hit route, a long-running
 * worker process, or a queue-scheduler function. Each invocation claims one
 * batch, runs every job, and returns. The caller decides cadence.
 *
 * Failure policy:
 * - Handler throws            → markFailed (retry or DLQ per policy)
 * - Unknown reactionName      → DLQ immediately (handler registration bug)
 * - Store / runtime fault     → leave the job in `running`; the next
 *   `releaseStaleClaims()` (called by the worker on the next drain) resets it
 *   for re-delivery. The bumped attempts count is preserved.
 * - Alerting: terminal DLQ moves go through `onDeadLettered` (default logs +
 *   `captureException`). Wire Sentry / Opsgenie there.
 *
 * @packageDocumentation
 */

import type { AsyncReactionStore } from "./types";
import { asyncReactionRegistry } from "./handler-registry";
import type { AsyncReactionHandlerContext, AsyncReactionJob } from "./types";

/**
 * Drain-result reported back to the caller (route / cron).
 */
export interface DrainResult {
  /** Jobs claimed in this drain (regardless of outcome). */
  claimed: number;
  /** Handlers returned normally. */
  delivered: number;
  /** Handlers threw; scheduled for retry. */
  retried: number;
  /** Handlers threw AND attempts exhausted; moved to DLQ. */
  deadLettered: number;
  /** Wall-clock duration of the drain (ms). */
  durationMs: number;
}

/**
 * Context the worker needs from the host process.
 *
 * The host constructs ONE tenant-scoped runtime per drain batch (typical case:
 * the drain runs single-tenant — multi-tenant drains would loop this). The
 * `dispatchCommand` and `storeProvider` closures are bound to that runtime.
 */
export interface DrainAsyncReactionsContext {
  /** The durable job store (Postgres in prod, in-memory in tests). */
  store: AsyncReactionStore;
  /** Max jobs to claim per drain. Default 25. */
  batchSize?: number;
  /**
   * Build the per-job dispatch context. Called for EACH claimed job so the
   * host can construct a runtime bound to the job's tenant/actor (the worker
   * does not assume a single tenant).
   *
   * MUST return a context with `dispatchCommand` + `storeProvider` wired to a
   * tenant-scoped Manifest runtime. Throws are caught and dead-letter the job.
   */
  buildHandlerContext: (job: AsyncReactionJob) => Promise<
    Pick<AsyncReactionHandlerContext, "dispatchCommand" | "storeProvider">
  >;
  /** Structured logger (default console). */
  log?: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
  /** Error capture (default console.error). Called on every DLQ move. */
  captureException?: (err: unknown) => unknown;
  /**
   * DLQ alert hook. Fires on every job that exhausts retries. Default
   * captures via `captureException`. Wire Opsgenie / PagerDuty / Slack here.
   */
  onDeadLettered?: (job: AsyncReactionJob) => void;
  /**
   * Release stale claims before claiming the next batch. Default `true`.
   * Disable only when you know no prior worker can be running (e.g. tests).
   */
  releaseStaleBeforeClaim?: boolean;
}

/**
 * Drain one batch from the async reaction queue. See module docstring.
 *
 * Safe to call concurrently — `claim()` is row-locked. Each drain is
 * self-contained: it claims, dispatches, and reports. The caller decides
 * cadence (cron interval, loop with sleep, or queue-scheduler wake-up).
 */
export async function drainAsyncReactions(
  ctx: DrainAsyncReactionsContext
): Promise<DrainResult> {
  const log = ctx.log ?? console;
  const captureException = ctx.captureException ?? defaultCaptureException;
  const onDeadLettered = ctx.onDeadLettered ?? defaultOnDeadLettered(captureException);
  const batchSize = ctx.batchSize ?? 25;
  const startedAt = Date.now();

  if (ctx.releaseStaleBeforeClaim !== false) {
    try {
      await ctx.store.releaseStaleClaims();
    } catch (err) {
      // Stale-claim release is best-effort — never block the drain.
      log.warn?.("releaseStaleClaims failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  let jobs: AsyncReactionJob[];
  try {
    jobs = await ctx.store.claim(batchSize);
  } catch (err) {
    log.error?.("claim failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      claimed: 0,
      delivered: 0,
      retried: 0,
      deadLettered: 0,
      durationMs: Date.now() - startedAt,
    };
  }

  let delivered = 0;
  let retried = 0;
  let deadLettered = 0;

  for (const job of jobs) {
    const registered = asyncReactionRegistry.get(job.reactionName);
    if (!registered) {
      // Unknown handler → routes through markFailed. With default policy
      // (maxAttempts: 5) this retries a few times before DLQ, which is
      // acceptable for a registration bug (the operator has time to deploy
      // a fix). The test exercises the immediate-DLQ case with maxAttempts=1.
      const outcome = await ctx.store.markFailed(
        job.id,
        `no handler registered for reactionName "${job.reactionName}"`,
        onDeadLettered
      );
      if (outcome === "retry") retried++;
      else deadLettered++;
      continue;
    }

    let handlerCtx: Pick<
      AsyncReactionHandlerContext,
      "dispatchCommand" | "storeProvider"
    >;
    try {
      handlerCtx = await ctx.buildHandlerContext(job);
    } catch (err) {
      // Could not build a runtime for this job (tenant lookup failure, etc.).
      // Treat as a retryable failure so it re-runs when the host recovers.
      const message = `context-build failed: ${
        err instanceof Error ? err.message : String(err)
      }`;
      const outcome = await ctx.store.markFailed(
        job.id,
        message,
        onDeadLettered
      );
      if (outcome === "retry") retried++;
      else deadLettered++;
      continue;
    }

    try {
      await registered.handler({
        job,
        dispatchCommand: handlerCtx.dispatchCommand,
        storeProvider: handlerCtx.storeProvider,
        log,
        captureException,
      });
      await ctx.store.markDelivered(job.id);
      delivered++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Capture every handler failure (not just terminal ones) so transient
      // errors show up in Sentry before they hit the DLQ.
      try {
        captureException(err);
      } catch {
        // Best-effort.
      }
      const outcome = await ctx.store.markFailed(
        job.id,
        message,
        onDeadLettered
      );
      if (outcome === "retry") retried++;
      else deadLettered++;
    }
  }

  return {
    claimed: jobs.length,
    delivered,
    retried,
    deadLettered,
    durationMs: Date.now() - startedAt,
  };
}

function defaultCaptureException(err: unknown): unknown {
  // eslint-disable-next-line no-console
  console.error("[async-reactions] handler failure", err);
  return undefined;
}

function defaultOnDeadLettered(
  captureException: (err: unknown) => unknown
): (job: AsyncReactionJob) => void {
  return (job) => {
    captureException(
      new Error(
        `async reaction DLQ: ${job.reactionName} (job ${job.id}, attempts ${job.attempts}) — ${job.lastError ?? "unknown error"}`
      )
    );
  };
}
