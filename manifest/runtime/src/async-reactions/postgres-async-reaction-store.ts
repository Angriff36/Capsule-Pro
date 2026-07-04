/**
 * Postgres-backed durable queue for async cross-entity reactions.
 *
 * Lives on the SAME singleton `pg.Pool` already used by the official Manifest
 * `PostgresOutboxStore` / `PostgresAuditSink` (`pg-pool.ts`) — per AGENTS.md
 * HARD RULE #2 (bias toward the official method) we do NOT introduce Redis or
 * Inngest. The queue is a separate table (`async_reaction_jobs`) so we don't
 * conflate "Manifest event delivery" (outbox) with "Capsule reaction dispatch"
 * (this queue).
 *
 * Concurrency contract: `claim()` uses `FOR UPDATE SKIP LOCKED`, so N concurrent
 * workers receive disjoint batches. Each claim updates `claimed_at` (now()),
 * `status = 'running'`, and bumps `attempts`. A worker that crashes leaves the
 * row in `running` with a stale `claimed_at`; `releaseStaleClaims()` resets
 * those rows to `pending` so they get re-picked (at-least-once — handlers MUST
 * be idempotent).
 *
 * Status lifecycle:
 *   pending → running → delivered   (terminal success)
 *                     → retry       (failure, attempts < max; next_attempt_at set)
 *                     → dead_letter (terminal failure; also inserted into async_reaction_dlq)
 *
 * @packageDocumentation
 */

import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import {
  DEFAULT_ASYNC_REACTION_POLICY,
  computeBackoffMs,
  type AsyncReactionJob,
  type AsyncReactionJobStatus,
  type AsyncReactionQueueOptions,
  type AsyncReactionStore,
  type TriggeringEventPayload,
} from "./types";

/**
 * Constructor options for {@link PostgresAsyncReactionStore}.
 */
export interface PostgresAsyncReactionStoreOptions extends AsyncReactionQueueOptions {
  /** The singleton pg.Pool from `pg-pool.ts`. */
  pool: Pool;
  /** Optional structured logger (default no-op). */
  log?: {
    info?: (message: string, meta?: Record<string, unknown>) => void;
    warn?: (message: string, meta?: Record<string, unknown>) => void;
    error?: (message: string, meta?: Record<string, unknown>) => void;
  };
  /**
   * Stale-claim threshold (ms). Claims older than this are eligible for
   * release by `releaseStaleClaims`. Default 5 minutes — generous enough that
   * a legitimately slow handler is not prematurely released.
   */
  staleClaimMs?: number;
}

/**
 * Row shape from the `async_reaction_jobs` table.
 */
interface JobRow {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  reaction_name: string;
  triggering_event: object;
  status: AsyncReactionJobStatus;
  attempts: number;
  max_attempts: number;
  initial_backoff_ms: number;
  max_backoff_ms: number;
  next_attempt_at: number;
  last_error: string | null;
  idempotency_key: string | null;
  correlation_id: string | null;
  causation_id: string | null;
  enqueued_at: number;
  delivered_at: number | null;
  dead_lettered_at: number | null;
}

/**
 * Persistent async-reaction job queue backed by Postgres.
 *
 * Thread-safe: safe for use across multiple worker processes. All mutations
 * are atomic (single statements); claim() takes a row-level lock.
 */
export class PostgresAsyncReactionStore implements AsyncReactionStore {
  private readonly pool: Pool;
  private readonly log: NonNullable<PostgresAsyncReactionStoreOptions["log"]>;
  private readonly staleClaimMs: number;
  private readonly defaultMaxAttempts: number;
  private readonly defaultInitialBackoffMs: number;
  private readonly defaultMaxBackoffMs: number;

  constructor(options: PostgresAsyncReactionStoreOptions) {
    this.pool = options.pool;
    this.log = {
      info: options.log?.info ?? (() => undefined),
      warn: options.log?.warn ?? (() => undefined),
      error: options.log?.error ?? (() => undefined),
    };
    this.staleClaimMs = options.staleClaimMs ?? 5 * 60_000;
    this.defaultMaxAttempts =
      options.maxAttempts ?? DEFAULT_ASYNC_REACTION_POLICY.maxAttempts;
    this.defaultInitialBackoffMs =
      options.initialBackoffMs ?? DEFAULT_ASYNC_REACTION_POLICY.initialBackoffMs;
    this.defaultMaxBackoffMs =
      options.maxBackoffMs ?? DEFAULT_ASYNC_REACTION_POLICY.maxBackoffMs;
  }

  /**
   * Enqueue a reaction job. The job becomes eligible for a worker claim
   * immediately (`next_attempt_at = now`).
   *
   * Safe to call from inside the synchronous `runCommand` path (a single
   * INSERT, no transaction coordination required).
   */
  async enqueue(input: {
    tenantId: string;
    actorId?: string | null;
    reactionName: string;
    triggeringEvent: TriggeringEventPayload;
    idempotencyKey?: string;
    correlationId?: string;
    causationId?: string;
    policy?: AsyncReactionQueueOptions;
  }): Promise<AsyncReactionJob> {
    const now = Date.now();
    const job: AsyncReactionJob = {
      id: randomUUID(),
      tenantId: input.tenantId,
      actorId: input.actorId ?? null,
      reactionName: input.reactionName,
      triggeringEvent: input.triggeringEvent,
      status: "pending",
      attempts: 0,
      maxAttempts: input.policy?.maxAttempts ?? this.defaultMaxAttempts,
      initialBackoffMs:
        input.policy?.initialBackoffMs ?? this.defaultInitialBackoffMs,
      maxBackoffMs: input.policy?.maxBackoffMs ?? this.defaultMaxBackoffMs,
      nextAttemptAt: now,
      lastError: null,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      ...(input.causationId ? { causationId: input.causationId } : {}),
      enqueuedAt: now,
    };

    await this.pool.query(
      `INSERT INTO async_reaction_jobs
         (id, tenant_id, actor_id, reaction_name, triggering_event,
          status, attempts, max_attempts, initial_backoff_ms, max_backoff_ms,
          next_attempt_at, last_error, idempotency_key, correlation_id,
          causation_id, enqueued_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        job.id,
        job.tenantId,
        job.actorId,
        job.reactionName,
        JSON.stringify(job.triggeringEvent),
        job.status,
        job.attempts,
        job.maxAttempts,
        job.initialBackoffMs,
        job.maxBackoffMs,
        job.nextAttemptAt,
        job.lastError,
        job.idempotencyKey ?? null,
        job.correlationId ?? null,
        job.causationId ?? null,
        job.enqueuedAt,
      ]
    );

    return job;
  }

  /**
   * Claim up to `batchSize` jobs eligible for a worker attempt.
   *
   * Picks up BOTH `pending` (first attempt) and `retry` (subsequent attempt
   * whose backoff has elapsed) jobs whose `next_attempt_at` has passed. Uses
   * `FOR UPDATE SKIP LOCKED` so concurrent workers receive disjoint batches.
   * Each claimed row is atomically moved to `running`, has `attempts` bumped,
   * and `claimed_at` stamped.
   */
  async claim(batchSize: number): Promise<AsyncReactionJob[]> {
    const now = Date.now();
    const result = await this.pool.query<JobRow>(
      `UPDATE async_reaction_jobs
         SET status = 'running',
             attempts = attempts + 1,
             claimed_at = to_timestamp($1 / 1000.0)
       WHERE id IN (
         SELECT id FROM async_reaction_jobs
          WHERE status IN ('pending', 'retry')
            AND next_attempt_at <= $1
          ORDER BY next_attempt_at ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      [now, batchSize]
    );

    if (result.rows.length === 0) {
      return [];
    }
    return result.rows.map(rowToJob);
  }

  /**
   * Mark a job as successfully delivered (terminal).
   */
  async markDelivered(jobId: string): Promise<void> {
    const now = Date.now();
    await this.pool.query(
      `UPDATE async_reaction_jobs
          SET status = 'delivered',
              delivered_at = to_timestamp($1 / 1000.0),
              last_error = NULL
        WHERE id = $2`,
      [now, jobId]
    );
  }

  /**
   * Mark a job as failed and either schedule a retry or move it to the DLQ.
   *
   * - Retry: `status = 'retry'`, `next_attempt_at = now + backoff`. The row
   *   becomes eligible for the next `claim()` once that timestamp elapses.
   * - DLQ:  `status = 'dead_letter'`, `dead_lettered_at = now`. A copy is
   *   inserted into `async_reaction_dlq` for inspection + alerting.
   *
   * The decision is made from `job.attempts` vs `job.maxAttempts` — the worker
   * passes the post-increment attempt count from the claimed row.
   */
  async markFailed(
    jobId: string,
    errorMessage: string,
    onDeadLettered?: (job: AsyncReactionJob) => void
  ): Promise<"retry" | "dead_letter"> {
    const claimed = await this.pool.query<JobRow>(
      `SELECT * FROM async_reaction_jobs WHERE id = $1 FOR UPDATE`,
      [jobId]
    );
    if (claimed.rows.length === 0) {
      this.log.warn?.("markFailed: job not found", { jobId });
      return "retry";
    }
    const row = claimed.rows[0]!;
    const job = rowToJob(row);
    const exhausted = job.attempts >= job.maxAttempts;

    if (exhausted) {
      const now = Date.now();
      await this.pool.query(
        `UPDATE async_reaction_jobs
            SET status = 'dead_letter',
                dead_lettered_at = to_timestamp($1 / 1000.0),
                last_error = $2
          WHERE id = $3`,
        [now, truncate(errorMessage, 4000), jobId]
      );
      await this.pool.query(
        `INSERT INTO async_reaction_dlq
            (id, tenant_id, actor_id, reaction_name, triggering_event,
             attempts, max_attempts, last_error, idempotency_key,
             correlation_id, causation_id, enqueued_at, dead_lettered_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          job.id,
          job.tenantId,
          job.actorId,
          job.reactionName,
          JSON.stringify(job.triggeringEvent),
          job.attempts,
          job.maxAttempts,
          truncate(errorMessage, 4000),
          job.idempotencyKey ?? null,
          job.correlationId ?? null,
          job.causationId ?? null,
          job.enqueuedAt,
          now,
        ]
      );
      this.log.error?.("async reaction moved to DLQ", {
        jobId,
        reactionName: job.reactionName,
        attempts: job.attempts,
        error: errorMessage,
      });
      try {
        onDeadLettered?.(job);
      } catch {
        // Alerting must never break the queue path.
      }
      return "dead_letter";
    }

    // Retry: schedule next attempt with exponential backoff.
    const backoffMs = computeBackoffMs(
      job.attempts,
      job.initialBackoffMs,
      job.maxBackoffMs
    );
    const nextAttemptAt = Date.now() + backoffMs;
    await this.pool.query(
      `UPDATE async_reaction_jobs
          SET status = 'retry',
              next_attempt_at = $1,
              last_error = $2
        WHERE id = $3`,
      [nextAttemptAt, truncate(errorMessage, 4000), jobId]
    );
    this.log.warn?.("async reaction scheduled for retry", {
      jobId,
      reactionName: job.reactionName,
      attempt: job.attempts,
      nextAttemptInMs: backoffMs,
      error: errorMessage,
    });
    return "retry";
  }

  /**
   * Reset `running` jobs whose `claimed_at` is older than the stale threshold
   * back to `pending` so they are re-picked by the next claim. Call this
   * BEFORE `claim()` if there is any chance a prior worker crashed mid-job.
   *
   * The released row keeps its bumped `attempts` count (the failed attempt is
   * counted against the retry budget — preventing infinite redelivery of a
   * permanently-failing handler).
   */
  async releaseStaleClaims(): Promise<number> {
    const cutoff = Date.now() - this.staleClaimMs;
    const result = await this.pool.query(
      `UPDATE async_reaction_jobs
          SET status = 'pending',
              next_attempt_at = $1,
              claimed_at = NULL
        WHERE status = 'running'
          AND claimed_at IS NOT NULL
          AND (EXTRACT(EPOCH FROM claimed_at) * 1000) < $1`,
      [cutoff]
    );
    const released = result.rowCount ?? 0;
    if (released > 0) {
      this.log.warn?.("released stale async reaction claims", { released });
    }
    return released;
  }

  /**
   * Count jobs by status. Useful for ops dashboards + smoke tests.
   */
  async countByStatus(status: AsyncReactionJobStatus): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM async_reaction_jobs WHERE status = $1`,
      [status]
    );
    return Number.parseInt(result.rows[0]?.count ?? "0", 10);
  }
}

function rowToJob(row: JobRow): AsyncReactionJob {
  const triggeringEvent =
    typeof row.triggering_event === "string"
      ? (JSON.parse(row.triggering_event) as TriggeringEventPayload)
      : (row.triggering_event as TriggeringEventPayload);
  const job: AsyncReactionJob = {
    id: row.id,
    tenantId: row.tenant_id,
    actorId: row.actor_id,
    reactionName: row.reaction_name,
    triggeringEvent,
    status: row.status,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    initialBackoffMs: row.initial_backoff_ms,
    maxBackoffMs: row.max_backoff_ms,
    nextAttemptAt: Number(row.next_attempt_at),
    lastError: row.last_error,
    ...(row.idempotency_key ? { idempotencyKey: row.idempotency_key } : {}),
    ...(row.correlation_id ? { correlationId: row.correlation_id } : {}),
    ...(row.causation_id ? { causationId: row.causation_id } : {}),
    enqueuedAt: Number(row.enqueued_at),
  };
  if (row.delivered_at != null) {
    job.deliveredAt = Number(row.delivered_at);
  }
  if (row.dead_lettered_at != null) {
    job.deadLetteredAt = Number(row.dead_lettered_at);
  }
  return job;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}
