// src/prisma-store.ts
var PrismaJobStore = class {
  prisma;
  constructor(prisma) {
    this.prisma = prisma;
  }
  async create(input) {
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
        payloadSnapshot: input.payloadSnapshot,
        maxRetries: input.maxRetries ?? 3,
        status: "queued"
      }
    });
    return this.toRecord(job);
  }
  async update(id, input) {
    const job = await this.prisma.sentryFixJob.update({
      where: { id },
      data: {
        ...input,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    return this.toRecord(job);
  }
  async getById(id) {
    const job = await this.prisma.sentryFixJob.findUnique({
      where: { id }
    });
    return job ? this.toRecord(job) : null;
  }
  async getByIssueId(issueId) {
    const job = await this.prisma.sentryFixJob.findUnique({
      where: { sentryIssueId: issueId }
    });
    return job ? this.toRecord(job) : null;
  }
  async getRecentByIssueId(issueId, withinMinutes) {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1e3);
    const job = await this.prisma.sentryFixJob.findFirst({
      where: {
        sentryIssueId: issueId,
        createdAt: { gte: cutoff }
      },
      orderBy: { createdAt: "desc" }
    });
    return job ? this.toRecord(job) : null;
  }
  async getNextPending() {
    const job = await this.prisma.sentryFixJob.findFirst({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" }
    });
    return job ? this.toRecord(job) : null;
  }
  async getPendingJobs(limit) {
    const jobs = await this.prisma.sentryFixJob.findMany({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
      take: limit
    });
    return jobs.map(this.toRecord);
  }
  async countRecentByIssueId(issueId, withinMinutes) {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1e3);
    return this.prisma.sentryFixJob.count({
      where: {
        sentryIssueId: issueId,
        createdAt: { gte: cutoff }
      }
    });
  }
  /**
   * Convert Prisma model to SentryFixJobRecord
   */
  toRecord(job) {
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
      payloadSnapshot: job.payloadSnapshot,
      branchName: job.branchName,
      prUrl: job.prUrl,
      prNumber: job.prNumber,
      errorMessage: job.errorMessage,
      retryCount: job.retryCount,
      maxRetries: job.maxRetries,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };
  }
};
var createPrismaJobStore = (prisma) => {
  return new PrismaJobStore(prisma);
};
export {
  PrismaJobStore,
  createPrismaJobStore
};
//# sourceMappingURL=prisma-store.js.map