import type { PrismaClient } from "@repo/database";
import type {
  CreateJobInput,
  JobQueueStore,
  SentryFixJobRecord,
  UpdateJobInput,
} from "./queue.js";
import type { SentryIssueAlertPayload } from "./types.js";

/**
 * Prisma-based job store for persistent queue
 */
export class PrismaJobStore implements JobQueueStore {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(input: CreateJobInput): Promise<SentryFixJobRecord> {
    const job = await this.prisma.sentryFixJob.create({
      data: {
        sentryIssueId: input.sentryIssueId,
        sentryEventId: input.sentryEventId,
        organizationSlug: input.organizationSlug,
        projectSlug: input.projectSlug,
        environment: input.environment,
        release: input.release,
        issueTitle: input.issueTitle,
        issueUrl: input.issueUrl,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payloadSnapshot: input.payloadSnapshot as any,
        maxRetries: input.maxRetries ?? 3,
        status: "queued",
      },
    });

    return this.toRecord(job);
  }

  async update(id: string, input: UpdateJobInput): Promise<SentryFixJobRecord> {
    const job = await this.prisma.sentryFixJob.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });

    return this.toRecord(job);
  }

  async getById(id: string): Promise<SentryFixJobRecord | null> {
    const job = await this.prisma.sentryFixJob.findUnique({
      where: { id },
    });

    return job ? this.toRecord(job) : null;
  }

  async getByIssueId(issueId: string): Promise<SentryFixJobRecord | null> {
    const job = await this.prisma.sentryFixJob.findUnique({
      where: { sentryIssueId: issueId },
    });

    return job ? this.toRecord(job) : null;
  }

  async getRecentByIssueId(
    issueId: string,
    withinMinutes: number
  ): Promise<SentryFixJobRecord | null> {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);

    const job = await this.prisma.sentryFixJob.findFirst({
      where: {
        sentryIssueId: issueId,
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: "desc" },
    });

    return job ? this.toRecord(job) : null;
  }

  async getNextPending(): Promise<SentryFixJobRecord | null> {
    const job = await this.prisma.sentryFixJob.findFirst({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
    });

    return job ? this.toRecord(job) : null;
  }

  async getPendingJobs(limit: number): Promise<SentryFixJobRecord[]> {
    const jobs = await this.prisma.sentryFixJob.findMany({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return jobs.map(this.toRecord);
  }

  async countRecentByIssueId(
    issueId: string,
    withinMinutes: number
  ): Promise<number> {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);

    return this.prisma.sentryFixJob.count({
      where: {
        sentryIssueId: issueId,
        createdAt: { gte: cutoff },
      },
    });
  }

  /**
   * Convert Prisma model to SentryFixJobRecord
   */
  private toRecord(
    job: Awaited<ReturnType<typeof this.prisma.sentryFixJob.findFirst>> &
      NonNullable<unknown>
  ): SentryFixJobRecord {
    return {
      id: job.id,
      sentryIssueId: job.sentryIssueId,
      sentryEventId: job.sentryEventId,
      organizationSlug: job.organizationSlug,
      projectSlug: job.projectSlug,
      environment: job.environment,
      release: job.release,
      issueTitle: job.issueTitle,
      issueUrl: job.issueUrl,
      status: job.status,
      payloadSnapshot:
        job.payloadSnapshot as unknown as SentryIssueAlertPayload,
      branchName: job.branchName,
      prUrl: job.prUrl,
      prNumber: job.prNumber,
      errorMessage: job.errorMessage,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}

/**
 * Create a Prisma-backed job store
 */
export const createPrismaJobStore = (prisma: PrismaClient): PrismaJobStore => {
  return new PrismaJobStore(prisma);
};
