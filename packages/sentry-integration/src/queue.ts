import * as Sentry from "@repo/observability/sentry";
import type { SentryFixJobStatus, SentryIssueAlertPayload } from "./types.js";

/**
 * Job record interface - matches Prisma model
 */
export interface SentryFixJobRecord {
  branchName: string | null;
  completedAt: Date | null;
  createdAt: Date;
  environment: string | null;
  errorMessage: string | null;
  id: string;
  issueTitle: string;
  issueUrl: string;
  maxRetries: number;
  organizationSlug: string;
  payloadSnapshot: SentryIssueAlertPayload;
  prNumber: number | null;
  projectSlug: string;
  prUrl: string | null;
  release: string | null;
  retryCount: number;
  sentryEventId: string | null;
  sentryIssueId: string;
  startedAt: Date | null;
  status: SentryFixJobStatus;
  updatedAt: Date;
}

/**
 * Job creation input
 */
export interface CreateJobInput {
  environment: string | null;
  issueTitle: string;
  issueUrl: string;
  maxRetries?: number;
  organizationSlug: string;
  payloadSnapshot: SentryIssueAlertPayload;
  projectSlug: string;
  release: string | null;
  sentryEventId: string | null;
  sentryIssueId: string;
}

/**
 * Job update input
 */
export interface UpdateJobInput {
  branchName?: string;
  completedAt?: Date | null;
  errorMessage?: string;
  prNumber?: number;
  prUrl?: string;
  retryCount?: number;
  startedAt?: Date | null;
  status?: SentryFixJobStatus;
}

/**
 * Job queue configuration
 */
export interface JobQueueConfig {
  /** Deduplication window in minutes - skip duplicate alerts */
  dedupMinutes: number;
  /** Whether the fixer is enabled */
  enabled: boolean;
  /** Maximum retries per job */
  maxRetries: number;
  /** Rate limit window in minutes - prevent multiple jobs for same issue */
  rateLimitMinutes: number;
}

const DEFAULT_CONFIG: JobQueueConfig = {
  rateLimitMinutes: 60,
  dedupMinutes: 30,
  maxRetries: 3,
  enabled: false,
};

/**
 * Job queue interface - abstracts database operations
 * Implementations can use Prisma, in-memory storage, etc.
 */
export interface JobQueueStore {
  countRecentByIssueId(issueId: string, withinMinutes: number): Promise<number>;
  create(input: CreateJobInput): Promise<SentryFixJobRecord>;
  getById(id: string): Promise<SentryFixJobRecord | null>;
  getByIssueId(issueId: string): Promise<SentryFixJobRecord | null>;
  getNextPending(): Promise<SentryFixJobRecord | null>;
  getPendingJobs(limit: number): Promise<SentryFixJobRecord[]>;
  getRecentByIssueId(
    issueId: string,
    withinMinutes: number
  ): Promise<SentryFixJobRecord | null>;
  update(id: string, input: UpdateJobInput): Promise<SentryFixJobRecord>;
}

/**
 * In-memory job store for testing/development
 */
export class InMemoryJobStore implements JobQueueStore {
  private readonly jobs: Map<string, SentryFixJobRecord> = new Map();
  private readonly issueIndex: Map<string, string> = new Map();

  async create(input: CreateJobInput): Promise<SentryFixJobRecord> {
    const id = crypto.randomUUID();
    const now = new Date();
    const job: SentryFixJobRecord = {
      id,
      sentryIssueId: input.sentryIssueId,
      sentryEventId: input.sentryEventId,
      organizationSlug: input.organizationSlug,
      projectSlug: input.projectSlug,
      environment: input.environment,
      release: input.release,
      issueTitle: input.issueTitle,
      issueUrl: input.issueUrl,
      status: "queued",
      payloadSnapshot: input.payloadSnapshot,
      branchName: null,
      prUrl: null,
      prNumber: null,
      errorMessage: null,
      retryCount: 0,
      maxRetries: input.maxRetries ?? 3,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(id, job);
    this.issueIndex.set(input.sentryIssueId, id);
    return job;
  }

  async update(id: string, input: UpdateJobInput): Promise<SentryFixJobRecord> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }
    const updated = {
      ...job,
      ...input,
      updatedAt: new Date(),
    };
    this.jobs.set(id, updated);
    return updated;
  }

  async getById(id: string): Promise<SentryFixJobRecord | null> {
    return this.jobs.get(id) ?? null;
  }

  async getByIssueId(issueId: string): Promise<SentryFixJobRecord | null> {
    const id = this.issueIndex.get(issueId);
    if (!id) {
      return null;
    }
    return this.jobs.get(id) ?? null;
  }

  async getRecentByIssueId(
    issueId: string,
    withinMinutes: number
  ): Promise<SentryFixJobRecord | null> {
    const job = await this.getByIssueId(issueId);
    if (!job) {
      return null;
    }
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
    if (job.createdAt >= cutoff) {
      return job;
    }
    return null;
  }

  async getNextPending(): Promise<SentryFixJobRecord | null> {
    for (const job of this.jobs.values()) {
      if (job.status === "queued") {
        return job;
      }
    }
    return null;
  }

  async getPendingJobs(limit: number): Promise<SentryFixJobRecord[]> {
    const pending: SentryFixJobRecord[] = [];
    for (const job of this.jobs.values()) {
      if (job.status === "queued") {
        pending.push(job);
        if (pending.length >= limit) {
          break;
        }
      }
    }
    return pending;
  }

  async countRecentByIssueId(
    issueId: string,
    withinMinutes: number
  ): Promise<number> {
    const job = await this.getRecentByIssueId(issueId, withinMinutes);
    return job ? 1 : 0;
  }

  // Test helper
  clear(): void {
    this.jobs.clear();
    this.issueIndex.clear();
  }
}

/**
 * Job queue manager
 * Handles deduplication, rate limiting, and job lifecycle
 */
export class SentryJobQueue {
  private readonly store: JobQueueStore;
  private readonly config: JobQueueConfig;

  constructor(store: JobQueueStore, config: JobQueueConfig = DEFAULT_CONFIG) {
    this.store = store;
    this.config = config;
  }

  /**
   * Check if we should process this alert or skip it
   * Returns null if should skip, otherwise returns the issue ID
   */
  async shouldProcessAlert(
    issueId: string
  ): Promise<{ canProcess: boolean; reason: string }> {
    if (!this.config.enabled) {
      return { canProcess: false, reason: "Sentry fixer is disabled" };
    }

    // Check for recent jobs for this issue (deduplication)
    const recentJob = await this.store.getRecentByIssueId(
      issueId,
      this.config.dedupMinutes
    );
    if (recentJob) {
      // If there's a recent job that's still running, skip
      if (recentJob.status === "queued" || recentJob.status === "running") {
        return {
          canProcess: false,
          reason: `Job already ${recentJob.status} for this issue`,
        };
      }
      // If there's a recent successful job, skip
      if (recentJob.status === "succeeded") {
        return {
          canProcess: false,
          reason: "Recent successful fix already applied",
        };
      }
    }

    // Check rate limit (count all jobs in the rate limit window)
    const recentCount = await this.store.countRecentByIssueId(
      issueId,
      this.config.rateLimitMinutes
    );
    if (recentCount >= this.config.maxRetries) {
      return {
        canProcess: false,
        reason: `Rate limit exceeded: ${recentCount} jobs in last ${this.config.rateLimitMinutes} minutes`,
      };
    }

    return { canProcess: true, reason: "OK" };
  }

  /**
   * Enqueue a new job
   */
  async enqueue(input: CreateJobInput): Promise<SentryFixJobRecord> {
    return Sentry.startSpan(
      {
        name: "sentry-fixer.enqueue",
        op: "queue.publish",
        attributes: {
          "fixer.issue_id": input.sentryIssueId,
          "fixer.org": input.organizationSlug,
        },
      },
      async () => {
        const check = await this.shouldProcessAlert(input.sentryIssueId);
        if (!check.canProcess) {
          Sentry.addBreadcrumb({
            category: "fixer.queue",
            message: `Enqueue skipped: ${check.reason}`,
            level: "info",
            data: { issueId: input.sentryIssueId, reason: check.reason },
          });
          throw new Error(`Cannot enqueue job: ${check.reason}`);
        }

        const job = await this.store.create({
          ...input,
          maxRetries: input.maxRetries ?? this.config.maxRetries,
        });
        Sentry.addBreadcrumb({
          category: "fixer.queue",
          message: `Job enqueued: ${job.id}`,
          level: "info",
          data: { jobId: job.id, issueId: input.sentryIssueId },
        });
        return job;
      }
    );
  }

  /**
   * Mark job as running
   */
  async startJob(jobId: string): Promise<SentryFixJobRecord> {
    Sentry.addBreadcrumb({
      category: "fixer.queue",
      message: `Job started: ${jobId}`,
      level: "info",
      data: { jobId },
    });
    return this.store.update(jobId, {
      status: "running",
      startedAt: new Date(),
    });
  }

  /**
   * Mark job as succeeded
   */
  async completeJob(
    jobId: string,
    result: { branchName: string; prUrl: string; prNumber: number }
  ): Promise<SentryFixJobRecord> {
    Sentry.addBreadcrumb({
      category: "fixer.queue",
      message: `Job succeeded: ${jobId} → PR #${result.prNumber}`,
      level: "info",
      data: { jobId, prNumber: result.prNumber, prUrl: result.prUrl },
    });
    return this.store.update(jobId, {
      status: "succeeded",
      branchName: result.branchName,
      prUrl: result.prUrl,
      prNumber: result.prNumber,
      completedAt: new Date(),
    });
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: string): Promise<SentryFixJobRecord> {
    const job = await this.store.getById(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const newRetryCount = job.retryCount + 1;
    const shouldRetry = newRetryCount < job.maxRetries;

    Sentry.addBreadcrumb({
      category: "fixer.queue",
      message: shouldRetry
        ? `Job failed, requeued (retry ${newRetryCount}/${job.maxRetries}): ${jobId}`
        : `Job failed permanently (${newRetryCount}/${job.maxRetries}): ${jobId}`,
      level: shouldRetry ? "warning" : "error",
      data: { jobId, retryCount: newRetryCount, error },
    });

    return this.store.update(jobId, {
      status: shouldRetry ? "queued" : "failed",
      errorMessage: error,
      retryCount: newRetryCount,
      completedAt: shouldRetry ? null : new Date(),
    });
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, reason: string): Promise<SentryFixJobRecord> {
    Sentry.addBreadcrumb({
      category: "fixer.queue",
      message: `Job cancelled: ${jobId} (${reason})`,
      level: "warning",
      data: { jobId, reason },
    });
    return this.store.update(jobId, {
      status: "cancelled",
      errorMessage: reason,
      completedAt: new Date(),
    });
  }

  /**
   * Get next pending job for processing
   */
  async getNextJob(): Promise<SentryFixJobRecord | null> {
    return this.store.getNextPending();
  }

  /**
   * Get job by ID
   */
  async getJob(id: string): Promise<SentryFixJobRecord | null> {
    return this.store.getById(id);
  }

  /**
   * Get job by Sentry issue ID
   */
  async getJobByIssueId(issueId: string): Promise<SentryFixJobRecord | null> {
    return this.store.getByIssueId(issueId);
  }
}

/**
 * Create a job queue with the default in-memory store
 */
export const createJobQueue = (
  config: Partial<JobQueueConfig> = {}
): SentryJobQueue =>
  new SentryJobQueue(new InMemoryJobStore(), {
    ...DEFAULT_CONFIG,
    ...config,
  });
