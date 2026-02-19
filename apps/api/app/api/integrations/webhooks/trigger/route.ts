/**
 * Webhook Trigger API
 *
 * POST /api/integrations/webhooks/trigger - Trigger webhooks for an entity event
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  buildWebhookPayload,
  sendWebhook,
  shouldTriggerWebhook,
  determineNextStatus,
  shouldAutoDisable,
} from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// Valid event types
const VALID_EVENT_TYPES = ["created", "updated", "deleted"] as const;
type WebhookEventType = (typeof VALID_EVENT_TYPES)[number];

interface TriggerWebhookRequest {
  eventType: WebhookEventType;
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
}

/**
 * Trigger webhooks for an entity event
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

    const body: TriggerWebhookRequest = await request.json();

    // Validate required fields
    if (!body.eventType || !body.entityType || !body.entityId) {
      return NextResponse.json(
        { error: "eventType, entityType, and entityId are required" },
        { status: 400 },
      );
    }

    // Validate event type
    if (!VALID_EVENT_TYPES.includes(body.eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    // Get all active webhooks
    const webhooks = await database.outboundWebhook.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
    });

    // Filter webhooks that should receive this event
    const triggeredWebhooks = webhooks.filter((webhook) =>
      shouldTriggerWebhook(
        {
          status: webhook.status as "active" | "inactive" | "disabled",
          eventTypeFilters: webhook.eventTypeFilters as WebhookEventType[],
          entityFilters: webhook.entityFilters as string[],
          deletedAt: webhook.deletedAt,
        },
        body.eventType as "created" | "updated" | "deleted",
        body.entityType
      )
    );

    if (triggeredWebhooks.length === 0) {
      return NextResponse.json({
        triggered: 0,
        results: [],
      });
    }

    // Build payload
    const payload = buildWebhookPayload(
      body.eventType as "created" | "updated" | "deleted",
      body.entityType,
      body.entityId,
      body.data,
      tenantId
    );

    const results: Array<{
      webhookId: string;
      webhookName: string;
      success: boolean;
      deliveryLogId: string;
    }> = [];

    // Send webhooks and log results
    for (const webhook of triggeredWebhooks) {
      // Create delivery log
      const deliveryLog = await database.webhookDeliveryLog.create({
        data: {
          tenantId,
          webhookId: webhook.id,
          eventType: body.eventType as "created" | "updated" | "deleted",
          entityType: body.entityType,
          entityId: body.entityId,
          payload: payload as unknown as Record<string, unknown>,
          status: "pending",
          attemptNumber: 1,
        },
      });

      const deliveryLogId = deliveryLog.id;

      // Send webhook
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
      const { status, nextRetryAt } = determineNextStatus(1, webhook.retryCount, result);

      // Update delivery log
      await database.webhookDeliveryLog.update({
        where: {
          tenantId_id: {
            tenantId,
            id: deliveryLogId,
          },
        },
        data: {
          status,
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
        lastTriggeredAt: Date;
        lastSuccessAt?: Date;
        lastFailureAt?: Date;
        consecutiveFailures: number;
        status?: string;
      } = {
        lastTriggeredAt: new Date(),
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
        webhookId: webhook.id,
        webhookName: webhook.name,
        success: result.success,
        deliveryLogId,
      });
    }

    return NextResponse.json({
      triggered: triggeredWebhooks.length,
      results,
    });
  } catch (error) {
    console.error("Error triggering webhooks:", error);
    return NextResponse.json({ error: "Failed to trigger webhooks" }, { status: 500 });
  }
}

export const runtime = "nodejs";
