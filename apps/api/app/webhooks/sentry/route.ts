import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { createPrismaJobStore } from "@repo/sentry-integration/prisma-store";
import type { JobQueueConfig } from "@repo/sentry-integration/queue";
import { SentryJobQueue } from "@repo/sentry-integration/queue";
import type { SentryIssueAlertPayload } from "@repo/sentry-integration/webhook";
import {
  extractSentryHeaders,
  isIssueAlertWebhook,
  parseSentryIssue,
  parseSentryWebhookPayload,
  verifySentrySignature,
} from "@repo/sentry-integration/webhook";
import { NextResponse } from "next/server";

/**
 * Sentry webhook endpoint for Issue Alert notifications
 *
 * This endpoint receives webhook notifications from Sentry when
 * issue alerts are triggered. It validates the webhook signature,
 * parses the payload, and enqueues a fix job.
 *
 * Configuration:
 * - SENTRY_WEBHOOK_SECRET: Client secret from Sentry internal integration
 * - SENTRY_FIXER_ENABLED: Enable/disable the fixer pipeline
 * - SENTRY_FIXER_RATE_LIMIT_MINUTES: Rate limit window
 * - SENTRY_FIXER_DEDUP_MINUTES: Deduplication window
 */

// Configuration from environment
const getConfig = (): JobQueueConfig => ({
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

// Create job queue with Prisma store
const createJobQueue = () => {
  const store = createPrismaJobStore(database);
  return new SentryJobQueue(store, getConfig());
};

export const POST = async (request: Request): Promise<Response> => {
  const webhookSecret = process.env.SENTRY_WEBHOOK_SECRET;

  // Check if webhook is configured
  if (!webhookSecret) {
    log.warn("[SentryWebhook] SENTRY_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { message: "Webhook not configured", ok: false },
      { status: 503 }
    );
  }

  // Extract headers
  const headers = extractSentryHeaders(request.headers);

  log.info("[SentryWebhook] Received webhook", {
    resource: headers.sentryHookResource,
    requestId: headers.requestId,
  });

  // Get raw body for signature verification
  const rawBody = await request.text();

  // Verify signature
  if (!headers.sentryHookSignature) {
    log.warn("[SentryWebhook] Missing signature header");
    return NextResponse.json(
      { message: "Missing signature", ok: false },
      { status: 401 }
    );
  }

  const isValid = verifySentrySignature(
    rawBody,
    headers.sentryHookSignature,
    webhookSecret
  );

  if (!isValid) {
    log.warn("[SentryWebhook] Invalid signature", {
      requestId: headers.requestId,
    });
    return NextResponse.json(
      { message: "Invalid signature", ok: false },
      { status: 401 }
    );
  }

  // Check if this is an issue alert
  if (!isIssueAlertWebhook(headers.sentryHookResource)) {
    log.info("[SentryWebhook] Ignoring non-issue-alert webhook", {
      resource: headers.sentryHookResource,
    });
    return NextResponse.json(
      { message: "Ignored - not an issue alert", ok: true },
      { status: 200 }
    );
  }

  // Parse payload
  let payload: SentryIssueAlertPayload | undefined;
  try {
    payload = parseSentryWebhookPayload(JSON.parse(rawBody));
  } catch (error) {
    log.error("[SentryWebhook] Failed to parse payload", { error });
    return NextResponse.json(
      { message: "Invalid payload", ok: false },
      { status: 400 }
    );
  }

  // Parse issue details
  const issue = parseSentryIssue(payload);

  log.info("[SentryWebhook] Processing issue alert", {
    issueId: issue.issueId,
    title: issue.title,
    environment: issue.environment,
  });

  // Check if fixer is enabled
  const config = getConfig();
  if (!config.enabled) {
    log.info("[SentryWebhook] Fixer disabled, skipping job creation");
    return NextResponse.json(
      { message: "Fixer disabled - alert received", ok: true },
      { status: 200 }
    );
  }

  // Enqueue job
  try {
    const jobQueue = createJobQueue();

    const check = await jobQueue.shouldProcessAlert(issue.issueId);
    if (!check.canProcess) {
      log.info("[SentryWebhook] Skipping job", {
        issueId: issue.issueId,
        reason: check.reason,
      });
      return NextResponse.json(
        { message: check.reason, ok: true, skipped: true },
        { status: 200 }
      );
    }

    const job = await jobQueue.enqueue({
      sentryIssueId: issue.issueId,
      sentryEventId: issue.eventId,
      organizationSlug: issue.organizationSlug,
      projectSlug: issue.projectSlug,
      environment: issue.environment,
      release: issue.release,
      issueTitle: issue.title,
      issueUrl: issue.issueUrl,
      payloadSnapshot: payload,
    });

    log.info("[SentryWebhook] Job enqueued", {
      jobId: job.id,
      issueId: issue.issueId,
    });

    return NextResponse.json(
      {
        message: "Job enqueued",
        ok: true,
        jobId: job.id,
      },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("[SentryWebhook] Failed to enqueue job", { error: message });

    return NextResponse.json(
      { message: "Failed to enqueue job", ok: false, error: message },
      { status: 500 }
    );
  }
};

/**
 * GET endpoint for health check
 */
export const GET = (): Response => {
  const configured = !!process.env.SENTRY_WEBHOOK_SECRET;
  const enabled = process.env.SENTRY_FIXER_ENABLED === "true";

  return NextResponse.json({
    ok: true,
    configured,
    enabled,
    message: configured
      ? "Sentry webhook endpoint is configured"
      : "Sentry webhook endpoint is not configured",
  });
};
