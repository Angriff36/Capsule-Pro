import { PrismaClient } from '@repo/database';
import { JobQueueStore, CreateJobInput, SentryFixJobRecord, UpdateJobInput } from './queue.js';
import './types-CETBS6t6.js';
import 'zod';

/**
 * Prisma-based job store for persistent queue
 */
declare class PrismaJobStore implements JobQueueStore {
    private readonly prisma;
    constructor(prisma: PrismaClient);
    create(input: CreateJobInput): Promise<SentryFixJobRecord>;
    update(id: string, input: UpdateJobInput): Promise<SentryFixJobRecord>;
    getById(id: string): Promise<SentryFixJobRecord | null>;
    getByIssueId(issueId: string): Promise<SentryFixJobRecord | null>;
    getRecentByIssueId(issueId: string, withinMinutes: number): Promise<SentryFixJobRecord | null>;
    getNextPending(): Promise<SentryFixJobRecord | null>;
    getPendingJobs(limit: number): Promise<SentryFixJobRecord[]>;
    countRecentByIssueId(issueId: string, withinMinutes: number): Promise<number>;
    /**
     * Convert Prisma model to SentryFixJobRecord
     */
    private toRecord;
}
/**
 * Create a Prisma-backed job store
 */
declare const createPrismaJobStore: (prisma: PrismaClient) => PrismaJobStore;

export { PrismaJobStore, createPrismaJobStore };
