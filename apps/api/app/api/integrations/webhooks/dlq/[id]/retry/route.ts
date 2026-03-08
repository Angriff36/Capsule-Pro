/**
 * Webhook DLQ Retry API
 *
 * POST /api/integrations/webhooks/dlq/[id]/retry - Retry a DLQ entry
 *
 * Manually retry a failed webhook delivery from the dead letter queue.
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { sendWebhook, type WebhookPayload } from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RetryRequest {
  overrideUrl?: string; // Optionally override the webhook URL
}

/**
 * Retry a DLQ entry
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { id } = await params;
    const body: RetryRequest = await request.json().catch(() => ({}));

    // Get the DLQ entry
    const dlqEntry = await database.webhookDeadLetterQueue.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
    });

    if (!dlqEntry) {
      return NextResponse.json({ error: "DLQ entry not found" }, { status: 404 });
    }

    // Check if already resolved
    if (dlqEntry.resolvedAt) {
      return NextResponse.json(
        { error: "DLQ entry already resolved" },
        { status: 400 }
      );
    }

    // Get the webhook configuration (may be null if deleted)
    let webhook = null;
    if (dlqEntry.webhookId) {
      webhook = await database.outboundWebhook.findFirst({
        where: {
          tenantId,
          id: dlqEntry.webhookId,
          deletedAt: null,
        },
      });
    }

    // Determine URL to use
    const targetUrl = body.overrideUrl || (webhook?.url ?? dlqEntry.originalUrl);

    // If webhook was deleted and no override URL, require explicit URL
    if (!dlqEntry.webhookId && !body.overrideUrl) {
      return NextResponse.json(
        { error: "Original webhook was deleted. Please provide an override URL." },
        { status: 400 }
      );
    }

    if (!targetUrl) {
      return NextResponse.json(
        { error: "No target URL available" },
        { status: 400 }
      );
    }

    // Create a new delivery log for this retry (only if webhook exists)
    let deliveryLogId: string | null = null;
    if (dlqEntry.webhookId) {
      const deliveryLog = await database.webhookDeliveryLog.create({
        data: {
          tenantId,
          webhookId: dlqEntry.webhookId,
          eventType: dlqEntry.eventType,
          entityType: dlqEntry.entityType,
          entityId: dlqEntry.entityId,
          payload: dlqEntry.payload as unknown as Prisma.InputJsonValue,
          status: "pending",
          attemptNumber: dlqEntry.totalAttempts + 1,
        },
      });
      deliveryLogId = deliveryLog.id;
    }

    // Send the webhook
    const payload = dlqEntry.payload as unknown as WebhookPayload;

    const result = await sendWebhook(
      {
        url: targetUrl,
        secret: webhook?.secret ?? null,
        apiKey: webhook?.apiKey ?? null,
        timeoutMs: webhook?.timeoutMs ?? 30000,
        customHeaders: webhook?.customHeaders as Record<string, string> | null,
      },
      payload
    );

    // Update delivery log (if created)
    if (deliveryLogId) {
      await database.webhookDeliveryLog.update({
        where: {
          tenantId_id: {
            tenantId,
            id: deliveryLogId,
          },
        },
        data: {
          status: result.success ? "success" : "failed",
          httpResponseStatus: result.httpStatus,
          responseBody: result.responseBody,
          errorMessage: result.errorMessage,
          deliveredAt: result.success ? new Date() : null,
          failedAt: result.success ? null : new Date(),
        },
      });
    }

    // Update DLQ entry
    const updatedDlqEntry = await database.webhookDeadLetterQueue.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        retriedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: userId,
        resolution: result.success
          ? "Successfully retried"
          : `Retry failed: ${result.errorMessage}`,
        ...(result.success && { resolvedAt: new Date() }),
      },
    });

    // Update webhook stats if webhook exists
    if (webhook) {
      await database.outboundWebhook.update({
        where: {
          tenantId_id: {
            tenantId,
            id: webhook.id,
          },
        },
        data: result.success
          ? {
              lastSuccessAt: new Date(),
              consecutiveFailures: 0,
              // Re-enable if was disabled
              ...(webhook.status === "disabled" && { status: "active" }),
            }
          : {
              lastFailureAt: new Date(),
              consecutiveFailures: { increment: 1 },
            },
      });
    }

    return NextResponse.json({
      success: result.success,
      dlqEntry: updatedDlqEntry,
      deliveryLogId,
      httpStatus: result.httpStatus,
      errorMessage: result.errorMessage,
    });
  } catch (error) {
    console.error("Error retrying DLQ entry:", error);
    return NextResponse.json(
      { error: "Failed to retry DLQ entry" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
