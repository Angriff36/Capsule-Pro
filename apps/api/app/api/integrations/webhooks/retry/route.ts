/**
 * Webhook Retry API
 *
 * POST /api/integrations/webhooks/retry - Retry pending/failed deliveries
 *
 * This endpoint can be called by a cron job to process retries for webhooks
 * that are scheduled for retry (nextRetryAt <= now).
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  determineNextStatus,
  sendWebhook,
  shouldAutoDisable,
  type WebhookPayload,
} from "@repo/notifications";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { toJson } from "@/lib/prisma-utils";

// Valid statuses
const VALID_DELIVERY_STATUSES = [
  "pending",
  "success",
  "failed",
  "retrying",
] as const;
type DeliveryStatus = (typeof VALID_DELIVERY_STATUSES)[number];

interface RetryDeliveriesRequest {
  deliveryLogId?: string; // Retry specific delivery
  maxRetries?: number;
}

/**
 * Retry pending/failed webhook deliveries
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const body: RetryDeliveriesRequest = await request.json();
    const maxRetries = body.maxRetries || 50; // Limit concurrent retries

    // Find deliveries that need retry
    let deliveries;

    if (body.deliveryLogId) {
      // Retry specific delivery
      deliveries = await database.webhookDeliveryLog.findMany({
        where: {
          tenantId,
          id: body.deliveryLogId,
          NOT: { status: "success" },
        },
        take: 1,
      });
    } else {
      // Find all deliveries ready for retry
      deliveries = await database.webhookDeliveryLog.findMany({
        where: {
          tenantId,
          status: "retrying",
          nextRetryAt: { lte: new Date() },
        },
        take: maxRetries,
      });
    }

    if (deliveries.length === 0) {
      return NextResponse.json({
        retried: 0,
        results: [],
      });
    }

    const results: Array<{
      deliveryLogId: string;
      success: boolean;
      attemptNumber: number;
      finalStatus: DeliveryStatus;
    }> = [];

    // Preload the distinct outbound webhooks in one query — collapses a
    // per-delivery outboundWebhook.findFirst N+1 into 1 findMany + Map lookup
    // (same read-preload shape as cron/webhook-retry, #8c). All deliveries
    // share the resolved tenantId, so the preload keys on (tenantId, id IN).
    const distinctWebhookIds = [...new Set(deliveries.map((d) => d.webhookId))];
    const webhookRows = await database.outboundWebhook.findMany({
      where: { tenantId, id: { in: distinctWebhookIds }, deletedAt: null },
    });
    const webhooksById = new Map<string, (typeof webhookRows)[number]>(
      webhookRows.map((w) => [w.id, w])
    );

    // Process each delivery
    for (const delivery of deliveries) {
      const webhook = webhooksById.get(delivery.webhookId);

      if (!webhook) {
        // Webhook was deleted, mark delivery as failed
        await database.webhookDeliveryLog.update({
          where: {
            tenantId_id: {
              tenantId,
              id: delivery.id,
            },
          },
          data: {
            status: "failed",
            errorMessage: "Webhook configuration was deleted",
            failedAt: new Date(),
          },
        });

        results.push({
          deliveryLogId: delivery.id,
          success: false,
          attemptNumber: delivery.attemptNumber,
          finalStatus: "failed",
        });
        continue;
      }

      // Check if webhook is still active
      if (webhook.status !== "active") {
        await database.webhookDeliveryLog.update({
          where: {
            tenantId_id: {
              tenantId,
              id: delivery.id,
            },
          },
          data: {
            status: "failed",
            errorMessage: `Webhook is ${webhook.status}`,
            failedAt: new Date(),
          },
        });

        results.push({
          deliveryLogId: delivery.id,
          success: false,
          attemptNumber: delivery.attemptNumber,
          finalStatus: "failed",
        });
        continue;
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
            tenantId,
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
            tenantId,
            webhookId: webhook.id,
            originalDeliveryId: delivery.id,
            eventType: delivery.eventType,
            entityType: delivery.entityType,
            entityId: delivery.entityId,
            payload: toJson(delivery.payload),
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
        consecutiveFailures: result.success
          ? 0
          : webhook.consecutiveFailures + 1,
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
            tenantId,
            id: webhook.id,
          },
        },
        data: updates,
      });

      // Feed the updated stats back into the Map so a later delivery to the
      // SAME webhook observes the new consecutiveFailures (and a tripped
      // auto-disable) — the prior per-delivery findFirst re-read the just-
      // updated row. Only these two fields affect cross-delivery behavior;
      // url/secret/retryCount/etc. are immutable webhook config.
      webhooksById.set(webhook.id, {
        ...webhook,
        consecutiveFailures: updates.consecutiveFailures,
        ...(updates.status ? { status: updates.status } : {}),
      });

      results.push({
        deliveryLogId: delivery.id,
        success: result.success,
        attemptNumber: newAttemptNumber,
        finalStatus: status as DeliveryStatus,
      });
    }

    return NextResponse.json({
      retried: deliveries.length,
      results,
    });
  } catch (error) {
    captureException(error);
    log.error("Error retrying webhooks:", error);
    return NextResponse.json(
      { error: "Failed to retry webhooks" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
