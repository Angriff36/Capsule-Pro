/**
 * In-memory async reaction store — for tests and dev environments without a DB.
 *
 * Mirrors the Postgres-backed store's contract so handlers + the worker can be
 * exercised deterministically without a database. NOT for production — jobs
 * vanish on process restart.
 *
 * @packageDocumentation
 */

import { randomUUID } from "node:crypto";
import type {
  AsyncReactionJob,
  AsyncReactionJobStatus,
  AsyncReactionQueueOptions,
  AsyncReactionStore,
  TriggeringEventPayload,
} from "./types";
import { computeBackoffMs } from "./types";
import { DEFAULT_ASYNC_REACTION_POLICY } from "./types";

export interface InMemoryAsyncReactionStoreOptions
  extends AsyncReactionQueueOptions {
  /** Inject a deterministic clock (tests). Default `Date.now`. */
  now?: () => number;
}

interface InMemoryJobRow {
  job: AsyncReactionJob;
  claimedAt?: number;
}

/**
 * In-memory analogue of {@link PostgresAsyncReactionStore}. Same public
 * surface; claims use a JS Set to approximate `FOR UPDATE SKIP LOCKED`.
 */
export class InMemoryAsyncReactionStore implements AsyncReactionStore {
  private rows = new Map<string, InMemoryJobRow>();
  private now: () => number;
  private readonly defaultMaxAttempts: number;
  private readonly defaultInitialBackoffMs: number;
  private readonly defaultMaxBackoffMs: number;

  constructor(options: InMemoryAsyncReactionStoreOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.defaultMaxAttempts =
      options.maxAttempts ?? DEFAULT_ASYNC_REACTION_POLICY.maxAttempts;
    this.defaultInitialBackoffMs =
      options.initialBackoffMs ?? DEFAULT_ASYNC_REACTION_POLICY.initialBackoffMs;
    this.defaultMaxBackoffMs =
      options.maxBackoffMs ?? DEFAULT_ASYNC_REACTION_POLICY.maxBackoffMs;
  }

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
    const now = this.now();
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
    this.rows.set(job.id, { job });
    return job;
  }

  async claim(batchSize: number): Promise<AsyncReactionJob[]> {
    const now = this.now();
    const claimed: AsyncReactionJob[] = [];
    for (const [id, row] of this.rows) {
      if (claimed.length >= batchSize) break;
      // Pick up BOTH first-attempt (`pending`) and retried (`retry`) jobs
      // whose backoff has elapsed. Mirrors the Postgres store's
      // `status IN ('pending', 'retry')` filter.
      if (
        (row.job.status === "pending" || row.job.status === "retry") &&
        row.job.nextAttemptAt <= now
      ) {
        row.job.attempts += 1;
        row.job.status = "running";
        row.claimedAt = now;
        claimed.push({ ...row.job });
      }
      void id;
    }
    return claimed;
  }

  async markDelivered(jobId: string): Promise<void> {
    const row = this.rows.get(jobId);
    if (!row) return;
    row.job.status = "delivered";
    row.job.deliveredAt = this.now();
    row.job.lastError = null;
    delete row.claimedAt;
  }

  async markFailed(
    jobId: string,
    errorMessage: string,
    onDeadLettered?: (job: AsyncReactionJob) => void
  ): Promise<"retry" | "dead_letter"> {
    const row = this.rows.get(jobId);
    if (!row) return "retry";
    const exhausted = row.job.attempts >= row.job.maxAttempts;
    if (exhausted) {
      row.job.status = "dead_letter";
      row.job.deadLetteredAt = this.now();
      row.job.lastError = errorMessage;
      delete row.claimedAt;
      try {
        onDeadLettered?.({ ...row.job });
      } catch {
        // best-effort
      }
      return "dead_letter";
    }
    const backoffMs = computeBackoffMs(
      row.job.attempts,
      row.job.initialBackoffMs,
      row.job.maxBackoffMs
    );
    row.job.status = "retry";
    row.job.nextAttemptAt = this.now() + backoffMs;
    row.job.lastError = errorMessage;
    delete row.claimedAt;
    return "retry";
  }

  async releaseStaleClaims(staleMs = 5 * 60_000): Promise<number> {
    const cutoff = this.now() - staleMs;
    let released = 0;
    for (const row of this.rows.values()) {
      if (row.job.status === "running" && (row.claimedAt ?? 0) < cutoff) {
        row.job.status = "pending";
        row.job.nextAttemptAt = this.now();
        delete row.claimedAt;
        released++;
      }
    }
    return released;
  }

  async countByStatus(status: AsyncReactionJobStatus): Promise<number> {
    let n = 0;
    for (const row of this.rows.values()) {
      if (row.job.status === status) n++;
    }
    return n;
  }

  /** Test helper: snapshot a job by id. */
  peek(jobId: string): AsyncReactionJob | undefined {
    const row = this.rows.get(jobId);
    return row ? { ...row.job } : undefined;
  }

  /** Test helper: advance the deterministic clock. */
  advanceTime(byMs: number): void {
    const prev = this.now;
    this.now = () => prev() + byMs;
  }
}
