/**
 * Outbound Webhook Delivery Service
 *
 * Handles sending webhooks to external systems with:
 * - Exponential backoff retry logic
 * - HMAC signature generation for payload verification
 * - Delivery logging and status tracking
 * - Auto-disable after consecutive failures
 */

import { createHmac } from "node:crypto";
import type { OutboundWebhook, WebhookDeliveryLog } from "@repo/database";
import {
  webhook_delivery_status,
  type webhook_event_type,
  webhook_status,
} from "@repo/database";

export interface WebhookPayload {
  id: string;
  eventType: webhook_event_type;
  entityType: string;
  entityId: string;
  timestamp: string;
  data: Record<string, unknown>;
  tenantId: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  httpStatus?: number;
  responseBody?: string;
  errorMessage?: string;
}

export interface WebhookConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
  maxConsecutiveFailures: number;
}

const DEFAULT_CONFIG: WebhookConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30_000,
  timeoutMs: 30_000,
  maxConsecutiveFailures: 5,
};

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateSignature(
  secret: string,
  payload: string,
  timestamp: number
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Build webhook payload object
 */
export function buildWebhookPayload(
  eventType: webhook_event_type,
  entityType: string,
  entityId: string,
  data: Record<string, unknown>,
  tenantId: string
): WebhookPayload {
  return {
    id: crypto.randomUUID(),
    eventType,
    entityType,
    entityId,
    timestamp: new Date().toISOString(),
    data,
    tenantId,
  };
}

/**
 * Calculate delay for retry with exponential backoff
 */
export function calculateRetryDelay(
  attemptNumber: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  // Exponential backoff: delay = baseDelay * 2^(attempt-1)
  const delay = baseDelayMs * 2 ** (attemptNumber - 1);
  // Cap at max delay
  return Math.min(delay, maxDelayMs);
}

/**
 * Send webhook to external URL
 */
export async function sendWebhook(
  webhook: Pick<
    OutboundWebhook,
    "url" | "secret" | "apiKey" | "timeoutMs" | "customHeaders"
  >,
  payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-ID": payload.id,
    "X-Webhook-Event": `${payload.entityType}.${payload.eventType}`,
    "X-Webhook-Timestamp": timestamp.toString(),
  };

  // Add signature if secret is configured
  if (webhook.secret) {
    headers["X-Webhook-Signature"] = generateSignature(
      webhook.secret,
      body,
      timestamp
    );
  }

  // Add API key if configured
  if (webhook.apiKey) {
    headers.Authorization = `Bearer ${webhook.apiKey}`;
  }

  // Add custom headers
  if (webhook.customHeaders && typeof webhook.customHeaders === "object") {
    const customHeaders = webhook.customHeaders as Record<string, string>;
    for (const [key, value] of Object.entries(customHeaders)) {
      if (typeof value === "string") {
        headers[key] = value;
      }
    }
  }

  const controller = new AbortController();
  const timeoutMs = webhook.timeoutMs || DEFAULT_CONFIG.timeoutMs;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text();

    if (response.ok) {
      return {
        success: true,
        httpStatus: response.status,
        responseBody: responseBody.slice(0, 10_000), // Limit response size
      };
    }

    return {
      success: false,
      httpStatus: response.status,
      responseBody: responseBody.slice(0, 10_000),
      errorMessage: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          errorMessage: `Request timed out after ${timeoutMs}ms`,
        };
      }
      return {
        success: false,
        errorMessage: error.message,
      };
    }

    return {
      success: false,
      errorMessage: "Unknown error occurred",
    };
  }
}

/**
 * Check if webhook should be triggered based on filters
 */
export function shouldTriggerWebhook(
  webhook: Pick<
    OutboundWebhook,
    "status" | "eventTypeFilters" | "entityFilters" | "deletedAt"
  >,
  eventType: webhook_event_type,
  entityType: string
): boolean {
  // Skip deleted webhooks
  if (webhook.deletedAt) {
    return false;
  }

  // Skip inactive or disabled webhooks
  if (webhook.status !== webhook_status.active) {
    return false;
  }

  // Check event type filter (empty array means all events)
  if (
    webhook.eventTypeFilters.length > 0 &&
    !webhook.eventTypeFilters.includes(eventType)
  ) {
    return false;
  }

  // Check entity type filter (empty array means all entities)
  if (
    webhook.entityFilters.length > 0 &&
    !webhook.entityFilters.includes(entityType)
  ) {
    return false;
  }

  return true;
}

/**
 * Determine next delivery status based on result
 */
export function determineNextStatus(
  currentAttempt: number,
  maxRetries: number,
  result: WebhookDeliveryResult
): {
  status: webhook_delivery_status;
  nextRetryAt: Date | null;
} {
  if (result.success) {
    return {
      status: webhook_delivery_status.success,
      nextRetryAt: null,
    };
  }

  // Check if we should retry
  if (currentAttempt < maxRetries) {
    const delay = calculateRetryDelay(
      currentAttempt + 1,
      DEFAULT_CONFIG.initialDelayMs,
      DEFAULT_CONFIG.maxDelayMs
    );
    return {
      status: webhook_delivery_status.retrying,
      nextRetryAt: new Date(Date.now() + delay),
    };
  }

  // No more retries
  return {
    status: webhook_delivery_status.failed,
    nextRetryAt: null,
  };
}

/**
 * Check if webhook should be auto-disabled
 */
export function shouldAutoDisable(consecutiveFailures: number): boolean {
  return consecutiveFailures >= DEFAULT_CONFIG.maxConsecutiveFailures;
}

export type {
  OutboundWebhook as OutboundWebhookType,
  WebhookDeliveryLog as WebhookDeliveryLogType,
};
