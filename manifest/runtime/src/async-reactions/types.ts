/**
 * Async durable queue types for cross-entity reactions.
 *
 * A reaction job is a deferred cross-entity propagation: when a governed command
 * emits an event that should trigger a slow / 1:N fan-out reaction (e.g. battle
 * board sync, inventory restock), the runtime ENQUEUES a job instead of running
 * the dispatch synchronously inside `runCommand`. A worker drains the queue
 * with retry + exponential backoff and routes terminal failures to a
 * dead-letter queue with alerting.
 *
 * Constitution alignment:
 * - §6 (canonical write path): the worker dispatches via the SAME governed
 *   `engine.runCommand` — async reactions remain governed, never direct writes.
 * - §11 (operational log): job lifecycle (attempts, errors, DLQ moves) is
 *   observable in the `async_reaction_jobs` / `async_reaction_dlq` tables.
 * - §15 (act, don't re-decide): the durable queue ships on the existing
 *   Postgres pool (the official-method bias from AGENTS.md HARD RULE #2);
 *   no new Redis / Inngest infrastructure is introduced.
 *
 * @packageDocumentation
 */

/**
 * Lifecycle status for an async reaction job.
 *
 * - `pending`     — enqueued, waiting for a worker claim
 * - `running`     — claimed by a worker (claimed_at set); not yet delivered
 * - `delivered`   — handler returned successfully (terminal)
 * - `retry`       — handler failed but attempts < maxAttempts; scheduled via next_attempt_at
 * - `dead_letter` — attempts exhausted; moved to the DLQ table for inspection + alerting
 */
export type AsyncReactionJobStatus =
  | "pending"
  | "running"
  | "delivered"
  | "retry"
  | "dead_letter";

/**
 * Full triggering event payload carried with every reaction job.
 *
 * Captured at enqueue time from the parent command's `MiddlewareContext` so the
 * worker has everything it needs to replay the dispatch without re-entering the
 * original command. The `subject` (engine-stamped source instance id) and the
 * raw `payload` together reconstruct the same view the synchronous middleware
 * had at after-emit.
 */
export interface TriggeringEventPayload {
  /** Semantic event name (e.g. "EventUpdated", "ShipmentItemReceived"). */
  name: string;
  /** Engine-stamped source instance id — the originating entity's id. */
  subjectId?: string;
  /** Source entity name when known (e.g. "Event", "ShipmentItem"). */
  subjectEntity?: string;
  /** Declared event payload (commandInput + result). */
  payload: Record<string, unknown>;
}

/**
 * A unit of deferred reaction work, persisted in `async_reaction_jobs`.
 *
 * The handler resolves the dispatch from `triggeringEvent` + `reactionName`;
 * the worker never has to re-derive intent from the original middleware.
 */
export interface AsyncReactionJob {
  /** Stable job id (uuid). Used as the dedup token under `idempotencyKey`. */
  id: string;
  /** Tenant the reaction runs under (governed dispatch is tenant-scoped). */
  tenantId: string;
  /** Acting user id (carried through for audit attribution). */
  actorId: string | null;
  /**
   * Registered handler key (e.g. "eventUpdatedBoardSync"). The worker looks
   * up {@link AsyncReactionHandler} by this name from the registry.
   */
  reactionName: string;
  /** Full triggering event payload (subject id + declared fields). */
  triggeringEvent: TriggeringEventPayload;
  status: AsyncReactionJobStatus;
  /** Number of times the job has been claimed by a worker. */
  attempts: number;
  /** Maximum delivery attempts before DLQ routing. Default 5. */
  maxAttempts: number;
  /** Base retry delay (ms). Default 1000 (1s); doubles each retry. */
  initialBackoffMs: number;
  /** Cap on retry delay (ms). Default 60000 (60s). */
  maxBackoffMs: number;
  /** When the next worker claim may pick up the job (epoch ms). */
  nextAttemptAt: number;
  /** Last error message (set on every failure). */
  lastError: string | null;
  /** Optional idempotency key forwarded to the governed dispatch. */
  idempotencyKey?: string;
  /** Correlation id linking the reaction back to its triggering cascade. */
  correlationId?: string;
  /** Causation id (typically the triggering event name). */
  causationId?: string;
  /** Wall-clock enqueue time (epoch ms). */
  enqueuedAt: number;
  /** Wall-clock delivery time (epoch ms, set on terminal success). */
  deliveredAt?: number;
  /** Wall-clock DLQ time (epoch ms, set on terminal failure). */
  deadLetteredAt?: number;
}

/**
 * A handler that performs the deferred governed dispatch for one reaction.
 *
 * Implementations MUST be idempotent — the worker provides at-least-once
 * delivery, so the same job may run more than once (a crash between handler
 * success and `markDelivered`, or a stale-claim release, will redeliver).
 *
 * Handlers receive a {@link AsyncReactionHandlerContext} that exposes:
 * - `dispatchCommand`  — the governed `engine.runCommand` (re-entered; tenant +
 *   actor context already wired by the runtime the worker constructs).
 * - `storeProvider`    — the runtime's store provider (load source entities).
 * - `log`              — structured logger.
 * - `captureException` — error capture (e.g. Sentry) for handler-level faults.
 *
 * Throw to signal failure; the worker records the message and applies retry
 * policy. Return normally to signal success.
 */
export type AsyncReactionHandler = (
  ctx: AsyncReactionHandlerContext
) => Promise<void>;

/**
 * Context handed to every {@link AsyncReactionHandler} at execution time.
 */
export interface AsyncReactionHandlerContext {
  /** The job being executed. */
  job: AsyncReactionJob;
  /**
   * Governed command dispatch — re-enters `engine.runCommand`. The worker
   * constructs a tenant-scoped runtime once per drain batch and passes this
   * bound dispatch function so handlers don't need to know about the engine.
   */
  dispatchCommand: (
    commandName: string,
    input: Record<string, unknown>,
    options: {
      entityName?: string;
      instanceId?: string;
      correlationId?: string;
      causationId?: string;
      idempotencyKey?: string;
    }
  ) => Promise<{ success: boolean; error?: string; emittedEvents?: unknown[] }>;
  /**
   * Manifest store provider bound to the worker's runtime. Used to load
   * source entities by id (the same pattern as the synchronous middleware).
   */
  storeProvider: (entityName: string) => unknown;
  /** Structured logger. */
  log: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
  /** Error capture (e.g. Sentry.captureException). */
  captureException: (err: unknown) => unknown;
}

/**
 * Configuration for an async reaction queue.
 */
export interface AsyncReactionQueueOptions {
  /** Max delivery attempts per job. Default 5. */
  maxAttempts?: number;
  /** Base retry delay (ms). Default 1000. */
  initialBackoffMs?: number;
  /** Cap on retry delay (ms). Default 60000. */
  maxBackoffMs?: number;
}

/**
 * Default retry policy used when a job is enqueued without overrides.
 */
export const DEFAULT_ASYNC_REACTION_POLICY = {
  maxAttempts: 5,
  initialBackoffMs: 1000,
  maxBackoffMs: 60_000,
} as const satisfies Required<AsyncReactionQueueOptions>;

/**
 * Compute the next retry delay using exponential backoff with the configured
 * cap. Pure function — exported for tests.
 *
 * @param attempt 1-based attempt count AFTER the failure (i.e. the retry will
 *   be attempt N+1).
 */
export function computeBackoffMs(
  attempt: number,
  initialBackoffMs: number,
  maxBackoffMs: number
): number {
  // attempt = 1 → 2^0 = 1x; attempt = 2 → 2^1 = 2x; … capped at maxBackoffMs.
  const exponent = Math.max(0, attempt - 1);
  const raw = initialBackoffMs * 2 ** exponent;
  return Math.min(raw, maxBackoffMs);
}

/**
 * Structural contract every async reaction store implements (Postgres-backed
 * for production, in-memory for tests). Used as the parameter type by
 * {@link drainAsyncReactions} so the worker accepts either implementation.
 *
 * Modeled on the Manifest `OutboxStore` interface — `enqueue` / `claim` /
 * `markDelivered` / `markFailed` — with the addition of `releaseStaleClaims`
 * (crash recovery) and `countByStatus` (ops dashboards).
 */
export interface AsyncReactionStore {
  enqueue(input: {
    tenantId: string;
    actorId?: string | null;
    reactionName: string;
    triggeringEvent: TriggeringEventPayload;
    idempotencyKey?: string;
    correlationId?: string;
    causationId?: string;
    policy?: AsyncReactionQueueOptions;
  }): Promise<AsyncReactionJob>;
  claim(batchSize: number): Promise<AsyncReactionJob[]>;
  markDelivered(jobId: string): Promise<void>;
  /**
   * Mark a job as failed. Returns `"retry"` when the job was scheduled for
   * another attempt, `"dead_letter"` when retries were exhausted and the job
   * was moved to the DLQ.
   */
  markFailed(
    jobId: string,
    errorMessage: string,
    onDeadLettered?: (job: AsyncReactionJob) => void
  ): Promise<"retry" | "dead_letter">;
  releaseStaleClaims(): Promise<number>;
  countByStatus(status: AsyncReactionJobStatus): Promise<number>;
}
