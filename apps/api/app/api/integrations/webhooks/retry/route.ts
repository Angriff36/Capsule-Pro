/**
 * Webhook Retry API
 *
 * POST /api/integrations/webhooks/retry - Retry pending/failed deliveries
 *
 * This endpoint can be called by a cron job to process retries for webhooks
 * that are scheduled for retry (nextRetryAt <= now).
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import {
  sendWebhook,
  determineNextStatus,
  shouldAutoDisable,
  type WebhookPayload,
} from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// Valid statuses
const VALID_DELIVERY_STATUSES = ["pending", "success", "failed", "retrying"] as const;
type DeliveryStatus = (typeof VALID_DELIVERY_STATUSES)[number];

interface RetryDeliveriesRequest {
  maxRetries?: number;
  deliveryLogId?: string; // Retry specific delivery
}

/**
 * Retry pending/failed webhook deliveries
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
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

    // Process each delivery
    for (const delivery of deliveries) {
      // Get the webhook
      const webhook = await database.outboundWebhook.findFirst({
        where: {
          tenantId,
          id: delivery.webhookId,
          deletedAt: null,
        },
      });

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
      const payload = delivery.payload as WebhookPayload;

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
      const { status, nextRetryAt } = determineNextStatus(newAttemptNumber, webhook.retryCount, result);

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

      // Update webhook stats
      const updates: {
        lastSuccessAt?: Date;
        lastFailureAt?: Date;
        consecutiveFailures: number;
        status?: string;
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
            tenantId,
            id: webhook.id,
          },
        },
        data: updates,
      });

      results.push({
        deliveryLogId: delivery.id,
        success: result.success,
        attemptNumber: newAttemptNumber,
        finalStatus: status,
      });
    }

    return NextResponse.json({
      retried: deliveries.length,
      results,
    });
  } catch (error) {
    console.error("Error retrying webhooks:", error);
    return NextResponse.json({ error: "Failed to retry webhooks" }, { status: 500 });
  }
}

export const runtime = "nodejs";
