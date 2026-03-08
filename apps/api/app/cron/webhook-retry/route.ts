/**
 * Webhook Retry Cron Job
 *
 * GET /cron/webhook-retry - Process pending webhook retries across all tenants
 *
 * Called by:
 * - Vercel Cron (automatic HTTP requests on a schedule)
 * - Manual invocation (with proper authentication)
 *
 * Authentication:
 * - Vercel Cron: Detected via x-vercel-cron header (set by Vercel infrastructure)
 * - Manual/External: Requires Authorization: Bearer <CRON_SECRET>
 */

import { database, type Prisma } from "@repo/database";
import {
  determineNextStatus,
  sendWebhook,
  shouldAutoDisable,
  type WebhookPayload,
} from "@repo/notifications";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Max function duration in seconds.
 *
 * Vercel plan limits:
 *   Hobby (free): max 60s, cron daily only, 2 crons
 *   Pro:          max 300s, cron any frequency, 40 crons
 *   Enterprise:   max 900s, cron any frequency, 100 crons
 *
 * Set to 60 for Hobby compatibility. Bump to 300 when on Pro.
 */
export const maxDuration = 60;

/**
 * Maximum retries to process per cron invocation.
 * Prevents one tenant from monopolizing the time budget.
 */
const MAX_RETRIES_PER_RUN = 100;

/**
 * Time budget for processing retries (ms).
 * Must be less than maxDuration to leave room for response serialization.
 */
const MAX_EXECUTION_MS = 50_000;

/**
 * Verify request is authenticated.
 *
 * Accepts either:
 * 1. x-vercel-cron: 1 header (from Vercel's cron infrastructure)
 * 2. Authorization: Bearer <CRON_SECRET> (for manual/external calls)
 */
const isAuthenticated = (
  request: Request
): { authorized: boolean; reason?: string } => {
  const authHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without auth for local testing
  if (process.env.NODE_ENV === "development") {
    return { authorized: true, reason: "development mode" };
  }

  // Method 1: Vercel Cron (header set by Vercel infrastructure)
  if (vercelCronHeader === "1" || vercelCronHeader === "true") {
    return { authorized: true, reason: "Vercel Cron" };
  }

  // Method 2: Bearer token (for manual/external calls)
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true, reason: "Bearer token verified" };
  }

  // No valid auth method
  if (!cronSecret) {
    log.error("[WebhookRetryCron] CRON_SECRET not configured");
    return {
      authorized: false,
      reason: "server misconfiguration: CRON_SECRET not set",
    };
  }

  return { authorized: false, reason: "invalid or missing authentication" };
};

/**
 * Process a single delivery retry.
 */
const processDelivery = async (
  delivery: Prisma.WebhookDeliveryLogGetPayload<object>
): Promise<{
  success: boolean;
  status: string;
  error?: string;
}> => {
  // Get the webhook
  const webhook = await database.outboundWebhook.findFirst({
    where: {
      tenantId: delivery.tenantId,
      id: delivery.webhookId,
      deletedAt: null,
    },
  });

  if (!webhook) {
    // Webhook was deleted, mark delivery as failed
    await database.webhookDeliveryLog.update({
      where: {
        tenantId_id: {
          tenantId: delivery.tenantId,
          id: delivery.id,
        },
      },
      data: {
        status: "failed",
        errorMessage: "Webhook configuration was deleted",
        failedAt: new Date(),
      },
    });

    return { success: false, status: "failed", error: "Webhook deleted" };
  }

  // Check if webhook is still active
  if (webhook.status !== "active") {
    await database.webhookDeliveryLog.update({
      where: {
        tenantId_id: {
          tenantId: delivery.tenantId,
          id: delivery.id,
        },
      },
      data: {
        status: "failed",
        errorMessage: `Webhook is ${webhook.status}`,
        failedAt: new Date(),
      },
    });

    return {
      success: false,
      status: "failed",
      error: `Webhook ${webhook.status}`,
    };
  }

  // Increment attempt number
  const newAttemptNumber = delivery.attemptNumber + 1;

  // Send webhook
  const payload = delivery.payload as unknown as WebhookPayload;

  const result = await sendWebhook(
    {
      url: webhook.url,
      secret: webhook.secret,
      apiKey: webhook.apiKey,
      timeoutMs: webhook.timeoutMs,
      customHeaders: webhook.customHeaders as Record<string, string> | null,
    },
    payload
  );

  // Determine next status
  const { status, nextRetryAt } = determineNextStatus(
    newAttemptNumber,
    webhook.retryCount,
    result
  );

  // Update delivery log
  await database.webhookDeliveryLog.update({
    where: {
      tenantId_id: {
        tenantId: delivery.tenantId,
        id: delivery.id,
      },
    },
    data: {
      status,
      attemptNumber: newAttemptNumber,
      httpResponseStatus: result.httpStatus,
      responseBody: result.responseBody,
      errorMessage: result.errorMessage,
      nextRetryAt,
      deliveredAt: status === "success" ? new Date() : null,
      failedAt: status === "failed" ? new Date() : null,
    },
  });

  // Move to DLQ if permanently failed
  if (status === "failed") {
    await database.webhookDeadLetterQueue.create({
      data: {
        tenantId: delivery.tenantId,
        webhookId: webhook.id,
        originalDeliveryId: delivery.id,
        eventType: delivery.eventType,
        entityType: delivery.entityType,
        entityId: delivery.entityId,
        payload: delivery.payload as unknown as Prisma.InputJsonValue,
        finalErrorMessage: result.errorMessage,
        totalAttempts: newAttemptNumber,
        originalUrl: webhook.url,
      },
    });
  }

  // Update webhook stats
  const updates: {
    lastSuccessAt?: Date;
    lastFailureAt?: Date;
    consecutiveFailures: number;
    status?: "active" | "inactive" | "disabled";
  } = {
    consecutiveFailures: result.success ? 0 : webhook.consecutiveFailures + 1,
  };

  if (result.success) {
    updates.lastSuccessAt = new Date();
  } else {
    updates.lastFailureAt = new Date();

    // Auto-disable if too many consecutive failures
    if (shouldAutoDisable(updates.consecutiveFailures)) {
      updates.status = "disabled";
    }
  }

  await database.outboundWebhook.update({
    where: {
      tenantId_id: {
        tenantId: webhook.tenantId,
        id: webhook.id,
      },
    },
    data: updates,
  });

  return { success: result.success, status };
};

/**
 * GET /cron/webhook-retry
 *
 * Process webhook retries across all tenants.
 * Called automatically by Vercel Cron on a schedule.
 */
export const GET = async (request: Request): Promise<Response> => {
  const startTime = Date.now();

  // GATE 1: Authentication (fail closed)
  const auth = isAuthenticated(request);
  if (!auth.authorized) {
    log.warn("[WebhookRetryCron] Authentication failed", {
      reason: auth.reason,
    });
    return NextResponse.json(
      { ok: false, error: "Unauthorized", reason: auth.reason },
      { status: 401 }
    );
  }

  log.info("[WebhookRetryCron] Starting retry processing", {
    reason: auth.reason,
  });

  // Find all deliveries ready for retry across all tenants
  const deliveries = await database.webhookDeliveryLog.findMany({
    where: {
      status: "retrying",
      nextRetryAt: { lte: new Date() },
    },
    take: MAX_RETRIES_PER_RUN,
    orderBy: { nextRetryAt: "asc" }, // Process oldest first
  });

  if (deliveries.length === 0) {
    log.info("[WebhookRetryCron] No deliveries to retry");
    return NextResponse.json({
      ok: true,
      processed: 0,
      succeeded: 0,
      failed: 0,
      elapsedMs: Date.now() - startTime,
    });
  }

  log.info("[WebhookRetryCron] Found deliveries to retry", {
    count: deliveries.length,
  });

  const results: Array<{
    deliveryId: string;
    tenantId: string;
    success: boolean;
    status: string;
    error?: string;
  }> = [];

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    // Check time budget
    const elapsed = Date.now() - startTime;
    if (elapsed > MAX_EXECUTION_MS) {
      log.info("[WebhookRetryCron] Time budget exhausted", {
        elapsedMs: elapsed,
        maxMs: MAX_EXECUTION_MS,
        processed,
      });
      break;
    }

    try {
      const result = await processDelivery(delivery);
      results.push({
        deliveryId: delivery.id,
        tenantId: delivery.tenantId,
        ...result,
      });

      processed++;
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      log.error("[WebhookRetryCron] Error processing delivery", {
        deliveryId: delivery.id,
        tenantId: delivery.tenantId,
        error: errorMessage,
      });

      results.push({
        deliveryId: delivery.id,
        tenantId: delivery.tenantId,
        success: false,
        status: "error",
        error: errorMessage,
      });

      processed++;
      failed++;
    }
  }

  const elapsedMs = Date.now() - startTime;
  log.info("[WebhookRetryCron] Completed", {
    processed,
    succeeded,
    failed,
    elapsedMs,
  });

  return NextResponse.json({
    ok: true,
    processed,
    succeeded,
    failed,
    elapsedMs,
    results: results.slice(0, 20), // Limit results in response
  });
};
