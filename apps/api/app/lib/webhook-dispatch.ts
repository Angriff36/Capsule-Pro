/**
 * Webhook Auto-Dispatch Helper
 *
 * Fire-and-forget webhook dispatch for domain mutations.
 * Looks up active webhooks for the tenant, filters by event/entity type,
 * delivers payloads, logs results, and auto-disables failing webhooks.
 *
 * All errors are caught internally — this never propagates to the caller.
 */

import { database, type Prisma, type webhook_event_type } from "@repo/database";
import {
  buildWebhookPayload,
  determineNextStatus,
  sendWebhook,
  shouldAutoDisable,
  shouldTriggerWebhook,
} from "@repo/notifications";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";

interface DispatchWebhooksParams {
  tenantId: string;
  entityType: string;
  entityId: string;
  action: webhook_event_type;
  data: Record<string, unknown>;
}

export async function dispatchWebhooks({
  tenantId,
  entityType,
  entityId,
  action,
  data,
}: DispatchWebhooksParams): Promise<void> {
  try {
    const webhooks = await database.outboundWebhook.findMany({
      where: { tenantId },
    });

    if (webhooks.length === 0) {
      return;
    }

    const matchingWebhooks = webhooks.filter((webhook) =>
      shouldTriggerWebhook(webhook, action, entityType)
    );

    if (matchingWebhooks.length === 0) {
      return;
    }

    const payload = buildWebhookPayload(
      action,
      entityType,
      entityId,
      data,
      tenantId
    );

    await Promise.allSettled(
      matchingWebhooks.map(async (webhook) => {
        try {
          const result = await sendWebhook(webhook, payload);

          const { status, nextRetryAt } = determineNextStatus(
            1,
            webhook.retryCount,
            result
          );

          await database.webhookDeliveryLog.create({
            data: {
              tenantId,
              webhookId: webhook.id,
              eventType: action,
              entityType,
              entityId,
              payload: payload as unknown as Prisma.InputJsonValue,
              status,
              attemptNumber: 1,
              httpResponseStatus: result.httpStatus ?? null,
              responseBody: result.responseBody ?? null,
              errorMessage: result.errorMessage ?? null,
              nextRetryAt,
              deliveredAt: result.success ? new Date() : null,
              failedAt: result.success ? null : new Date(),
            },
          });

          // Update webhook stats
          const consecutiveFailures = result.success
            ? 0
            : webhook.consecutiveFailures + 1;

          const updateData: Prisma.OutboundWebhookUpdateInput = {
            lastTriggeredAt: new Date(),
            consecutiveFailures,
            ...(result.success
              ? { lastSuccessAt: new Date() }
              : { lastFailureAt: new Date() }),
          };

          if (shouldAutoDisable(consecutiveFailures)) {
            updateData.status = "disabled";
            log.warn(
              "[webhook-dispatch] Auto-disabling webhook after consecutive failures",
              {
                webhookId: webhook.id,
                consecutiveFailures,
                tenantId,
              }
            );
          }

          await database.outboundWebhook.update({
            where: { tenantId_id: { tenantId, id: webhook.id } },
            data: updateData,
          });
        } catch (innerError) {
          log.error("[webhook-dispatch] Error delivering to single webhook", {
            webhookId: webhook.id,
            tenantId,
            error: innerError,
          });
          captureException(innerError);
        }
      })
    );
  } catch (error) {
    log.error("[webhook-dispatch] Error in dispatchWebhooks", {
      tenantId,
      entityType,
      entityId,
      action,
      error,
    });
    captureException(error);
  }
}
