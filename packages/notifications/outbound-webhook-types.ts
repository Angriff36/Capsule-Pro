/** Webhook domain types (formerly from @repo/database). */

export const webhook_delivery_status = {
  pending: "pending",
  success: "success",
  failed: "failed",
  retrying: "retrying",
} as const;

export type webhook_delivery_status =
  (typeof webhook_delivery_status)[keyof typeof webhook_delivery_status];

export const webhook_status = {
  active: "active",
  inactive: "inactive",
  disabled: "disabled",
} as const;

export type webhook_status =
  (typeof webhook_status)[keyof typeof webhook_status];

export type webhook_event_type = string;

export const webhook_event_type = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
} as const;

export interface OutboundWebhook {
  apiKey: string | null;
  customHeaders: unknown;
  deletedAt: Date | null;
  entityFilters: string[];
  eventTypeFilters: webhook_event_type[];
  secret: string | null;
  status: webhook_status;
  timeoutMs: number | null;
  url: string;
}

export interface WebhookDeliveryLog {
  attemptNumber: number;
  createdAt: Date;
  errorMessage: string | null;
  httpStatus: number | null;
  id: string;
  nextRetryAt: Date | null;
  responseBody: string | null;
  status: webhook_delivery_status;
  webhookId: string;
}
