// src/queue.ts
import * as Sentry from "@repo/observability/sentry";
var DEFAULT_CONFIG = {
  rateLimitMinutes: 60,
  dedupMinutes: 30,
  maxRetries: 3,
  enabled: false
};
var InMemoryJobStore = class {
  jobs = /* @__PURE__ */ new Map();
  issueIndex = /* @__PURE__ */ new Map();
  async create(input) {
    const id = crypto.randomUUID();
    const now = /* @__PURE__ */ new Date();
    const job = {
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
      updatedAt: now
    };
    this.jobs.set(id, job);
    this.issueIndex.set(input.sentryIssueId, id);
    return job;
  }
  async update(id, input) {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job ${id} not found`);
    }
    const updated = {
      ...job,
      ...input,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.jobs.set(id, updated);
    return updated;
  }
  async getById(id) {
    return this.jobs.get(id) ?? null;
  }
  async getByIssueId(issueId) {
    const id = this.issueIndex.get(issueId);
    if (!id) {
      return null;
    }
    return this.jobs.get(id) ?? null;
  }
  async getRecentByIssueId(issueId, withinMinutes) {
    const job = await this.getByIssueId(issueId);
    if (!job) {
      return null;
    }
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1e3);
    if (job.createdAt >= cutoff) {
      return job;
    }
    return null;
  }
  async getNextPending() {
    for (const job of this.jobs.values()) {
      if (job.status === "queued") {
        return job;
      }
    }
    return null;
  }
  async getPendingJobs(limit) {
    const pending = [];
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
  async countRecentByIssueId(issueId, withinMinutes) {
    const job = await this.getRecentByIssueId(issueId, withinMinutes);
    return job ? 1 : 0;
  }
  // Test helper
  clear() {
    this.jobs.clear();
    this.issueIndex.clear();
  }
};
var SentryJobQueue = class {
  constructor(store, config = DEFAULT_CONFIG) {
    this.store = store;
    this.config = config;
  }
  store;
  config;
  /**
   * Check if we should process this alert or skip it
   * Returns null if should skip, otherwise returns the issue ID
   */
  async shouldProcessAlert(issueId) {
    if (!this.config.enabled) {
      return { canProcess: false, reason: "Sentry fixer is disabled" };
    }
    const recentJob = await this.store.getRecentByIssueId(
      issueId,
      this.config.dedupMinutes
    );
    if (recentJob) {
      if (recentJob.status === "queued" || recentJob.status === "running") {
        return {
          canProcess: false,
          reason: `Job already ${recentJob.status} for this issue`
        };
      }
      if (recentJob.status === "succeeded") {
        return {
          canProcess: false,
          reason: "Recent successful fix already applied"
        };
      }
    }
    const recentCount = await this.store.countRecentByIssueId(
      issueId,
      this.config.rateLimitMinutes
    );
    if (recentCount >= this.config.maxRetries) {
      return {
        canProcess: false,
        reason: `Rate limit exceeded: ${recentCount} jobs in last ${this.config.rateLimitMinutes} minutes`
      };
    }
    return { canProcess: true, reason: "OK" };
  }
  /**
   * Enqueue a new job
   */
  async enqueue(input) {
    return Sentry.startSpan(
      {
        name: "sentry-fixer.enqueue",
        op: "queue.publish",
        attributes: {
          "fixer.issue_id": input.sentryIssueId,
          "fixer.org": input.organizationSlug
        }
      },
      async () => {
        const check = await this.shouldProcessAlert(input.sentryIssueId);
        if (!check.canProcess) {
          Sentry.addBreadcrumb({
            category: "fixer.queue",
            message: `Enqueue skipped: ${check.reason}`,
            level: "info",
            data: { issueId: input.sentryIssueId, reason: check.reason }
          });
          throw new Error(`Cannot enqueue job: ${check.reason}`);
        }
        const job = await this.store.create({
          ...input,
          maxRetries: input.maxRetries ?? this.config.maxRetries
        });
        Sentry.addBreadcrumb({
          category: "fixer.queue",
          message: `Job enqueued: ${job.id}`,
          level: "info",
          data: { jobId: job.id, issueId: input.sentryIssueId }
        });
        return job;
      }
    );
  }
  /**
   * Mark job as running
   */
  async startJob(jobId) {
    Sentry.addBreadcrumb({
      category: "fixer.queue",
      message: `Job started: ${jobId}`,
      level: "info",
      data: { jobId }
    });
    return this.store.update(jobId, {
      status: "running",
      startedAt: /* @__PURE__ */ new Date()
    });
  }
  /**
   * Mark job as succeeded
   */
  async completeJob(jobId, result) {
    Sentry.addBreadcrumb({
      category: "fixer.queue",
      message: `Job succeeded: ${jobId} \u2192 PR #${result.prNumber}`,
      level: "info",
      data: { jobId, prNumber: result.prNumber, prUrl: result.prUrl }
    });
    return this.store.update(jobId, {
      status: "succeeded",
      branchName: result.branchName,
      prUrl: result.prUrl,
      prNumber: result.prNumber,
      completedAt: /* @__PURE__ */ new Date()
    });
  }
  /**
   * Mark job as failed
   */
  async failJob(jobId, error) {
    const job = await this.store.getById(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    const newRetryCount = job.retryCount + 1;
    const shouldRetry = newRetryCount < job.maxRetries;
    Sentry.addBreadcrumb({
      category: "fixer.queue",
      message: shouldRetry ? `Job failed, requeued (retry ${newRetryCount}/${job.maxRetries}): ${jobId}` : `Job failed permanently (${newRetryCount}/${job.maxRetries}): ${jobId}`,
      level: shouldRetry ? "warning" : "error",
      data: { jobId, retryCount: newRetryCount, error }
    });
    return this.store.update(jobId, {
      status: shouldRetry ? "queued" : "failed",
      errorMessage: error,
      retryCount: newRetryCount,
      completedAt: shouldRetry ? null : /* @__PURE__ */ new Date()
    });
  }
  /**
   * Cancel a job
   */
  async cancelJob(jobId, reason) {
    Sentry.addBreadcrumb({
      category: "fixer.queue",
      message: `Job cancelled: ${jobId} (${reason})`,
      level: "warning",
      data: { jobId, reason }
    });
    return this.store.update(jobId, {
      status: "cancelled",
      errorMessage: reason,
      completedAt: /* @__PURE__ */ new Date()
    });
  }
  /**
   * Get next pending job for processing
   */
  async getNextJob() {
    return this.store.getNextPending();
  }
  /**
   * Get job by ID
   */
  async getJob(id) {
    return this.store.getById(id);
  }
  /**
   * Get job by Sentry issue ID
   */
  async getJobByIssueId(issueId) {
    return this.store.getByIssueId(issueId);
  }
};
var createJobQueue = (config = {}) => new SentryJobQueue(new InMemoryJobStore(), {
  ...DEFAULT_CONFIG,
  ...config
});

export {
  InMemoryJobStore,
  SentryJobQueue,
  createJobQueue
};
//# sourceMappingURL=chunk-WUQNVOEQ.js.map