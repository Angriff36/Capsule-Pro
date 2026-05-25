import type { SentryFixJobStatus, SentryIssueAlertPayload } from "./types.js";
/**
 * Job record interface - matches Prisma model
 */
export interface SentryFixJobRecord {
    id: string;
    sentryIssueId: string;
    sentryEventId: string | null;
    organizationSlug: string;
    projectSlug: string;
    environment: string | null;
    release: string | null;
    issueTitle: string;
    issueUrl: string;
    status: SentryFixJobStatus;
    payloadSnapshot: SentryIssueAlertPayload;
    branchName: string | null;
    prUrl: string | null;
    prNumber: number | null;
    errorMessage: string | null;
    retryCount: number;
    maxRetries: number;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Job creation input
 */
export interface CreateJobInput {
    sentryIssueId: string;
    sentryEventId: string | null;
    organizationSlug: string;
    projectSlug: string;
    environment: string | null;
    release: string | null;
    issueTitle: string;
    issueUrl: string;
    payloadSnapshot: SentryIssueAlertPayload;
    maxRetries?: number;
}
/**
 * Job update input
 */
export interface UpdateJobInput {
    status?: SentryFixJobStatus;
    branchName?: string;
    prUrl?: string;
    prNumber?: number;
    errorMessage?: string;
    retryCount?: number;
    startedAt?: Date | null;
    completedAt?: Date | null;
}
/**
 * Job queue configuration
 */
export interface JobQueueConfig {
    /** Rate limit window in minutes - prevent multiple jobs for same issue */
    rateLimitMinutes: number;
    /** Deduplication window in minutes - skip duplicate alerts */
    dedupMinutes: number;
    /** Maximum retries per job */
    maxRetries: number;
    /** Whether the fixer is enabled */
    enabled: boolean;
}
/**
 * Job queue interface - abstracts database operations
 * Implementations can use Prisma, in-memory storage, etc.
 */
export interface JobQueueStore {
    create(input: CreateJobInput): Promise<SentryFixJobRecord>;
    update(id: string, input: UpdateJobInput): Promise<SentryFixJobRecord>;
    getById(id: string): Promise<SentryFixJobRecord | null>;
    getByIssueId(issueId: string): Promise<SentryFixJobRecord | null>;
    getRecentByIssueId(issueId: string, withinMinutes: number): Promise<SentryFixJobRecord | null>;
    getNextPending(): Promise<SentryFixJobRecord | null>;
    getPendingJobs(limit: number): Promise<SentryFixJobRecord[]>;
    countRecentByIssueId(issueId: string, withinMinutes: number): Promise<number>;
}
/**
 * In-memory job store for testing/development
 */
export declare class InMemoryJobStore implements JobQueueStore {
    private readonly jobs;
    private readonly issueIndex;
    create(input: CreateJobInput): Promise<SentryFixJobRecord>;
    update(id: string, input: UpdateJobInput): Promise<SentryFixJobRecord>;
    getById(id: string): Promise<SentryFixJobRecord | null>;
    getByIssueId(issueId: string): Promise<SentryFixJobRecord | null>;
    getRecentByIssueId(issueId: string, withinMinutes: number): Promise<SentryFixJobRecord | null>;
    getNextPending(): Promise<SentryFixJobRecord | null>;
    getPendingJobs(limit: number): Promise<SentryFixJobRecord[]>;
    countRecentByIssueId(issueId: string, withinMinutes: number): Promise<number>;
    clear(): void;
}
/**
 * Job queue manager
 * Handles deduplication, rate limiting, and job lifecycle
 */
export declare class SentryJobQueue {
    private readonly store;
    private readonly config;
    constructor(store: JobQueueStore, config?: JobQueueConfig);
    /**
     * Check if we should process this alert or skip it
     * Returns null if should skip, otherwise returns the issue ID
     */
    shouldProcessAlert(issueId: string): Promise<{
        canProcess: boolean;
        reason: string;
    }>;
    /**
     * Enqueue a new job
     */
    enqueue(input: CreateJobInput): Promise<SentryFixJobRecord>;
    /**
     * Mark job as running
     */
    startJob(jobId: string): Promise<SentryFixJobRecord>;
    /**
     * Mark job as succeeded
     */
    completeJob(jobId: string, result: {
        branchName: string;
        prUrl: string;
        prNumber: number;
    }): Promise<SentryFixJobRecord>;
    /**
     * Mark job as failed
     */
    failJob(jobId: string, error: string): Promise<SentryFixJobRecord>;
    /**
     * Cancel a job
     */
    cancelJob(jobId: string, reason: string): Promise<SentryFixJobRecord>;
    /**
     * Get next pending job for processing
     */
    getNextJob(): Promise<SentryFixJobRecord | null>;
    /**
     * Get job by ID
     */
    getJob(id: string): Promise<SentryFixJobRecord | null>;
    /**
     * Get job by Sentry issue ID
     */
    getJobByIssueId(issueId: string): Promise<SentryFixJobRecord | null>;
}
/**
 * Create a job queue with the default in-memory store
 */
export declare const createJobQueue: (config?: Partial<JobQueueConfig>) => SentryJobQueue;
//# sourceMappingURL=queue.d.ts.map