import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { createPrismaJobStore } from "@repo/sentry-integration/prisma-store";
import type { JobQueueConfig } from "@repo/sentry-integration/queue";
import { SentryJobQueue } from "@repo/sentry-integration/queue";
import {
  createJobRunner,
  type JobRunnerConfig,
} from "@repo/sentry-integration/runner";
import {
  createSlackNotifier,
  type SlackConfig,
} from "@repo/sentry-integration/slack";
import { parseSentryIssue } from "@repo/sentry-integration/webhook";
import { NextResponse } from "next/server";

/**
 * Sentry Fix Job Processor Endpoint
 *
 * This endpoint processes queued Sentry fix jobs. It is called by:
 * - Vercel Cron (automatic HTTP requests on a schedule)
 * - Manual invocation (with proper authentication)
 *
 * IMPORTANT: Vercel Cron jobs are just HTTP requests. They are NOT magically
 * authenticated. Anyone who discovers this endpoint URL can call it unless
 * we enforce authentication. This endpoint MUST require a secret token.
 *
 * Security Model (fail closed):
 * 1. MUST have CRON_SECRET env var set (except in development)
 * 2. MUST receive Authorization: Bearer <CRON_SECRET> header
 * 3. MUST have SENTRY_FIXER_ENABLED=true to do any work
 *
 * Without all three gates passing, this endpoint returns an error and does nothing.
 */

/**
 * Verify request is authenticated via CRON_SECRET.
 *
 * This is the ONLY authentication mechanism we trust.
 * We do NOT trust x-vercel-cron header - it can be spoofed.
 */
const isAuthenticated = (
  request: Request
): { authorized: boolean; reason?: string } => {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without auth for local testing
  if (process.env.NODE_ENV === "development") {
    if (!cronSecret) {
      return {
        authorized: true,
        reason: "development mode, no secret required",
      };
    }
    // In development WITH a secret set, still require it
    if (authHeader === `Bearer ${cronSecret}`) {
      return { authorized: true, reason: "development mode, secret verified" };
    }
    return { authorized: false, reason: "invalid or missing secret" };
  }

  // Production: CRON_SECRET is MANDATORY
  if (!cronSecret) {
    // Fail closed - if no secret is configured, reject ALL requests
    // This forces proper configuration before deployment
    log.error(
      "[SentryWorker] CRON_SECRET not configured - rejecting all requests"
    );
    return {
      authorized: false,
      reason: "server misconfiguration: CRON_SECRET not set",
    };
  }

  // Require exact Bearer token match
  if (authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true };
  }

  return { authorized: false, reason: "invalid or missing secret" };
};

// Configuration from environment
const getQueueConfig = (): JobQueueConfig => ({
  enabled: process.env.SENTRY_FIXER_ENABLED === "true",
  rateLimitMinutes: Number.parseInt(
    process.env.SENTRY_FIXER_RATE_LIMIT_MINUTES ?? "60",
    10
  ),
  dedupMinutes: Number.parseInt(
    process.env.SENTRY_FIXER_DEDUP_MINUTES ?? "30",
    10
  ),
  maxRetries: Number.parseInt(process.env.SENTRY_FIXER_MAX_RETRIES ?? "3", 10),
});

const getRunnerConfig = (): Partial<JobRunnerConfig> => ({
  repoOwner: process.env.GITHUB_REPO_OWNER,
  repoName: process.env.GITHUB_REPO_NAME,
  githubToken: process.env.GITHUB_TOKEN,
  baseBranch: process.env.GITHUB_BASE_BRANCH ?? "main",
  runTests: process.env.SENTRY_FIXER_RUN_TESTS !== "false",
  testCommand: process.env.SENTRY_FIXER_TEST_COMMAND ?? "pnpm test",
});

const getSlackConfig = (): SlackConfig => ({
  botToken: process.env.SLACK_BOT_TOKEN,
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  channelId: process.env.SLACK_CHANNEL_ID,
});

// Create job queue with Prisma store
const createJobQueue = () => {
  const store = createPrismaJobStore(database);
  return new SentryJobQueue(store, getQueueConfig());
};

/**
 * Process a single job from the queue.
 *
 * This function assumes all gates (auth + enabled) have already passed.
 */
const processJob = async (): Promise<{
  processed: boolean;
  jobId?: string;
  success?: boolean;
  error?: string;
}> => {
  const jobQueue = createJobQueue();
  const job = await jobQueue.getNextJob();

  if (!job) {
    return { processed: false };
  }

  log.info("[SentryWorker] Processing job", {
    jobId: job.id,
    issueId: job.sentryIssueId,
  });

  // Mark job as running (prevents concurrent processing)
  await jobQueue.startJob(job.id);

  try {
    // Parse issue from payload
    const issue = parseSentryIssue(job.payloadSnapshot);

    // Check runner config
    const runnerConfig = getRunnerConfig();
    if (
      !(
        runnerConfig.githubToken &&
        runnerConfig.repoOwner &&
        runnerConfig.repoName
      )
    ) {
      throw new Error("GitHub configuration incomplete");
    }

    // Create runner and execute
    const runner = createJobRunner({
      githubToken: runnerConfig.githubToken,
      repoOwner: runnerConfig.repoOwner,
      repoName: runnerConfig.repoName,
      baseBranch: runnerConfig.baseBranch,
      runTests: runnerConfig.runTests,
      testCommand: runnerConfig.testCommand,
    });

    const result = await runner.execute(job, issue);

    if (result.success) {
      // Mark job as completed
      await jobQueue.completeJob(job.id, {
        branchName: result.branchName ?? undefined,
        prUrl: result.prUrl ?? undefined,
        prNumber: result.prNumber ?? undefined,
      });

      // Send Slack notification
      const slackConfig = getSlackConfig();
      if (slackConfig.webhookUrl || slackConfig.botToken) {
        const slack = createSlackNotifier(slackConfig);
        await slack.notifyPRCreated({
          prUrl: result.prUrl ?? "",
          prNumber: result.prNumber ?? 0,
          issueTitle: issue.title,
          issueUrl: issue.issueUrl,
          branchName: result.branchName ?? "",
          environment: issue.environment,
        });
      }

      log.info("[SentryWorker] Job completed successfully", {
        jobId: job.id,
        prUrl: result.prUrl,
      });

      return { processed: true, jobId: job.id, success: true };
    }
    // Mark job as failed
    await jobQueue.failJob(job.id, result.error ?? "Unknown error");

    // Send Slack notification for final failures
    if (job.retryCount + 1 >= job.maxRetries) {
      const slackConfig = getSlackConfig();
      if (slackConfig.webhookUrl || slackConfig.botToken) {
        const slack = createSlackNotifier(slackConfig);
        await slack.notifyFixFailed({
          issueTitle: issue.title,
          issueUrl: issue.issueUrl,
          errorMessage: result.error ?? "Unknown error",
          retryCount: job.retryCount + 1,
          maxRetries: job.maxRetries,
        });
      }
    }

    log.warn("[SentryWorker] Job failed", {
      jobId: job.id,
      error: result.error,
      retryCount: job.retryCount + 1,
      maxRetries: job.maxRetries,
    });

    return {
      processed: true,
      jobId: job.id,
      success: false,
      error: result.error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Mark job as failed
    await jobQueue.failJob(job.id, message);

    log.error("[SentryWorker] Job error", { jobId: job.id, error: message });

    return { processed: true, jobId: job.id, success: false, error: message };
  }
};

/**
 * POST /api/sentry-fixer/process
 *
 * Process queued Sentry fix jobs.
 *
 * Authentication:
 * - Requires Authorization: Bearer <CRON_SECRET> header
 * - CRON_SECRET must be set in environment (except in development)
 *
 * Behavior:
 * - If SENTRY_FIXER_ENABLED != true: returns 503 (service unavailable)
 * - If auth fails: returns 401 (unauthorized)
 * - Otherwise: processes up to ?batch=N jobs (default 1, max 5)
 */
export const POST = async (request: Request): Promise<Response> => {
  // GATE 1: Authentication (fail closed)
  // This MUST be the first check - no work happens without auth
  const auth = isAuthenticated(request);
  if (!auth.authorized) {
    log.warn("[SentryWorker] Authentication failed", { reason: auth.reason });
    return NextResponse.json(
      { ok: false, error: "Unauthorized", reason: auth.reason },
      { status: 401 }
    );
  }

  // GATE 2: Feature flag (explicitly enabled)
  // This prevents accidental execution even if auth passes
  const queueConfig = getQueueConfig();
  if (!queueConfig.enabled) {
    log.info(
      "[SentryWorker] Fixer disabled - SENTRY_FIXER_ENABLED is not 'true'"
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Service unavailable",
        message:
          "Sentry fixer is disabled. Set SENTRY_FIXER_ENABLED=true to enable.",
        enabled: false,
      },
      { status: 503 }
    );
  }

  // All gates passed - process jobs
  const url = new URL(request.url);
  const batch = Number.parseInt(url.searchParams.get("batch") ?? "1", 10);
  const limit = Math.min(batch, 5); // Max 5 jobs per request

  const results: Array<{
    processed: boolean;
    jobId?: string;
    success?: boolean;
    error?: string;
  }> = [];

  for (let i = 0; i < limit; i++) {
    const result = await processJob();
    results.push(result);

    // Stop if no more jobs to process
    if (!result.processed) {
      break;
    }
  }

  const processed = results.filter((r) => r.processed);
  const succeeded = processed.filter((r) => r.success);
  const failed = processed.filter((r) => !r.success);

  return NextResponse.json({
    ok: true,
    processed: processed.length,
    succeeded: succeeded.length,
    failed: failed.length,
    results: results.map((r) => ({
      jobId: r.jobId,
      success: r.success,
      error: r.error,
    })),
  });
};

/**
 * GET /api/sentry-fixer/process
 *
 * Health check endpoint. Returns configuration status without processing jobs.
 *
 * Note: This endpoint is intentionally public for monitoring purposes.
 * It does not expose secrets or perform any mutations.
 */
export const GET = async (): Promise<Response> => {
  const queueConfig = getQueueConfig();
  const runnerConfig = getRunnerConfig();
  const slackConfig = getSlackConfig();

  // Check if CRON_SECRET is configured (without exposing it)
  const hasCronSecret = !!process.env.CRON_SECRET;

  return NextResponse.json({
    ok: true,
    enabled: queueConfig.enabled,
    secured: hasCronSecret || process.env.NODE_ENV === "development",
    configured: {
      github: !!(
        runnerConfig.githubToken &&
        runnerConfig.repoOwner &&
        runnerConfig.repoName
      ),
      slack: !!(slackConfig.webhookUrl || slackConfig.botToken),
    },
    config: {
      rateLimitMinutes: queueConfig.rateLimitMinutes,
      dedupMinutes: queueConfig.dedupMinutes,
      maxRetries: queueConfig.maxRetries,
      runTests: runnerConfig.runTests,
    },
  });
};
