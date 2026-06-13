import { a as SentryIssueAlertPayload, S as SentryFixJobStatus } from './types-CZP2VeKg.js';
import 'zod';

/**
 * Job record interface - matches Prisma model
 */
interface SentryFixJobRecord {
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
interface CreateJobInput {
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
interface UpdateJobInput {
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
interface JobQueueConfig {
    /** Deduplication window in minutes - skip duplicate alerts */
    dedupMinutes: number;
    /** Whether the fixer is enabled */
    enabled: boolean;
    /** Maximum retries per job */
    maxRetries: number;
    /** Rate limit window in minutes - prevent multiple jobs for same issue */
    rateLimitMinutes: number;
}
/**
 * Job queue interface - abstracts database operations
 * Implementations can use Prisma, in-memory storage, etc.
 */
interface JobQueueStore {
    countRecentByIssueId(issueId: string, withinMinutes: number): Promise<number>;
    create(input: CreateJobInput): Promise<SentryFixJobRecord>;
    getById(id: string): Promise<SentryFixJobRecord | null>;
    getByIssueId(issueId: string): Promise<SentryFixJobRecord | null>;
    getNextPending(): Promise<SentryFixJobRecord | null>;
    getPendingJobs(limit: number): Promise<SentryFixJobRecord[]>;
    getRecentByIssueId(issueId: string, withinMinutes: number): Promise<SentryFixJobRecord | null>;
    update(id: string, input: UpdateJobInput): Promise<SentryFixJobRecord>;
}
/**
 * In-memory job store for testing/development
 */
declare class InMemoryJobStore implements JobQueueStore {
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
declare class SentryJobQueue {
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
declare const createJobQueue: (config?: Partial<JobQueueConfig>) => SentryJobQueue;

export { type CreateJobInput, InMemoryJobStore, type JobQueueConfig, type JobQueueStore, type SentryFixJobRecord, SentryJobQueue, type UpdateJobInput, createJobQueue };
