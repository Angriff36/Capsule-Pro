/**
 * Tests for Outbound Webhook Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the database module to avoid server-only import issues
vi.mock("@repo/database", () => ({
  webhook_delivery_status: {
    pending: "pending",
    success: "success",
    failed: "failed",
    retrying: "retrying",
  },
  webhook_event_type: {
    created: "created",
    updated: "updated",
    deleted: "deleted",
  },
  webhook_status: {
    active: "active",
    inactive: "inactive",
    disabled: "disabled",
  },
}));

import {
  generateSignature,
  buildWebhookPayload,
  calculateRetryDelay,
  sendWebhook,
  shouldTriggerWebhook,
  determineNextStatus,
  shouldAutoDisable,
  type WebhookPayload,
} from "../outbound-webhook-service";
import { webhook_delivery_status, webhook_event_type, webhook_status } from "@repo/database";

describe("generateSignature", () => {
  it("should generate HMAC-SHA256 signature with timestamp", () => {
    const secret = "test-secret";
    const payload = '{"test":"data"}';
    const timestamp = 1234567890;

    const signature = generateSignature(secret, payload, timestamp);

    expect(signature).toMatch(/^t=1234567890,v1=[a-f0-9]+$/);
  });

  it("should generate consistent signatures for same input", () => {
    const secret = "test-secret";
    const payload = '{"test":"data"}';
    const timestamp = 1234567890;

    const sig1 = generateSignature(secret, payload, timestamp);
    const sig2 = generateSignature(secret, payload, timestamp);

    expect(sig1).toBe(sig2);
  });

  it("should generate different signatures for different secrets", () => {
    const payload = '{"test":"data"}';
    const timestamp = 1234567890;

    const sig1 = generateSignature("secret1", payload, timestamp);
    const sig2 = generateSignature("secret2", payload, timestamp);

    expect(sig1).not.toBe(sig2);
  });
});

describe("buildWebhookPayload", () => {
  it("should build webhook payload with all required fields", () => {
    const eventType = webhook_event_type.created;
    const entityType = "event";
    const entityId = "event-123";
    const data = { name: "Test Event" };
    const tenantId = "tenant-123";

    const payload = buildWebhookPayload(eventType, entityType, entityId, data, tenantId);

    expect(payload).toMatchObject({
      eventType,
      entityType,
      entityId,
      data,
      tenantId,
    });
    expect(payload.id).toBeDefined();
    expect(payload.timestamp).toBeDefined();
  });

  it("should generate unique IDs for each payload", () => {
    const payload1 = buildWebhookPayload(
      webhook_event_type.created,
      "event",
      "1",
      {},
      "tenant"
    );
    const payload2 = buildWebhookPayload(
      webhook_event_type.created,
      "event",
      "2",
      {},
      "tenant"
    );

    expect(payload1.id).not.toBe(payload2.id);
  });
});

describe("calculateRetryDelay", () => {
  it("should calculate exponential backoff delays", () => {
    const baseDelay = 1000;
    const maxDelay = 30000;

    expect(calculateRetryDelay(1, baseDelay, maxDelay)).toBe(1000);
    expect(calculateRetryDelay(2, baseDelay, maxDelay)).toBe(2000);
    expect(calculateRetryDelay(3, baseDelay, maxDelay)).toBe(4000);
    expect(calculateRetryDelay(4, baseDelay, maxDelay)).toBe(8000);
    expect(calculateRetryDelay(5, baseDelay, maxDelay)).toBe(16000);
  });

  it("should cap at max delay", () => {
    const baseDelay = 1000;
    const maxDelay = 10000;

    // 2^10 = 1024 * 1000 = 1,024,000 > 10,000
    expect(calculateRetryDelay(10, baseDelay, maxDelay)).toBe(10000);
    expect(calculateRetryDelay(20, baseDelay, maxDelay)).toBe(10000);
  });
});

describe("sendWebhook", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should send webhook successfully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: () => Promise.resolve('{"success":true}'),
    });
    vi.stubGlobal("fetch", mockFetch);

    const webhook = {
      url: "https://example.com/webhook",
      secret: "test-secret",
      apiKey: null,
      timeoutMs: 30000,
      customHeaders: null,
    };

    const payload: WebhookPayload = {
      id: "test-id",
      eventType: webhook_event_type.created,
      entityType: "event",
      entityId: "event-123",
      timestamp: new Date().toISOString(),
      data: { name: "Test" },
      tenantId: "tenant-123",
    };

    const result = await sendWebhook(webhook, payload);

    expect(result.success).toBe(true);
    expect(result.httpStatus).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      webhook.url,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Webhook-Signature": expect.stringMatching(/^t=\d+,v1=[a-f0-9]+$/),
        }),
      })
    );
  });

  it("should return failure for non-200 responses", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: () => Promise.resolve("Server error"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const webhook = {
      url: "https://example.com/webhook",
      secret: null,
      apiKey: null,
      timeoutMs: 30000,
      customHeaders: null,
    };

    const payload: WebhookPayload = {
      id: "test-id",
      eventType: webhook_event_type.created,
      entityType: "event",
      entityId: "event-123",
      timestamp: new Date().toISOString(),
      data: {},
      tenantId: "tenant-123",
    };

    const result = await sendWebhook(webhook, payload);

    expect(result.success).toBe(false);
    expect(result.httpStatus).toBe(500);
    expect(result.errorMessage).toContain("500");
  });

  it("should handle timeout", async () => {
    const mockFetch = vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          setTimeout(() => reject(error), 100);
        })
    );
    vi.stubGlobal("fetch", mockFetch);

    const webhook = {
      url: "https://example.com/webhook",
      secret: null,
      apiKey: null,
      timeoutMs: 10, // Very short timeout
      customHeaders: null,
    };

    const payload: WebhookPayload = {
      id: "test-id",
      eventType: webhook_event_type.created,
      entityType: "event",
      entityId: "event-123",
      timestamp: new Date().toISOString(),
      data: {},
      tenantId: "tenant-123",
    };

    const result = await sendWebhook(webhook, payload);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("timed out");
  });
});

describe("shouldTriggerWebhook", () => {
  it("should return true for active webhook with matching filters", () => {
    const webhook = {
      status: webhook_status.active,
      eventTypeFilters: [webhook_event_type.created, webhook_event_type.updated],
      entityFilters: ["event"],
      deletedAt: null,
    };

    expect(shouldTriggerWebhook(webhook, webhook_event_type.created, "event")).toBe(true);
  });

  it("should return false for deleted webhook", () => {
    const webhook = {
      status: webhook_status.active,
      eventTypeFilters: [],
      entityFilters: [],
      deletedAt: new Date(),
    };

    expect(shouldTriggerWebhook(webhook, webhook_event_type.created, "event")).toBe(false);
  });

  it("should return false for inactive webhook", () => {
    const webhook = {
      status: webhook_status.inactive,
      eventTypeFilters: [],
      entityFilters: [],
      deletedAt: null,
    };

    expect(shouldTriggerWebhook(webhook, webhook_event_type.created, "event")).toBe(false);
  });

  it("should return false for non-matching event type", () => {
    const webhook = {
      status: webhook_status.active,
      eventTypeFilters: [webhook_event_type.created],
      entityFilters: [],
      deletedAt: null,
    };

    expect(shouldTriggerWebhook(webhook, webhook_event_type.deleted, "event")).toBe(false);
  });

  it("should return false for non-matching entity type", () => {
    const webhook = {
      status: webhook_status.active,
      eventTypeFilters: [],
      entityFilters: ["event"],
      deletedAt: null,
    };

    expect(shouldTriggerWebhook(webhook, webhook_event_type.created, "task")).toBe(false);
  });

  it("should return true when filters are empty (all events)", () => {
    const webhook = {
      status: webhook_status.active,
      eventTypeFilters: [],
      entityFilters: [],
      deletedAt: null,
    };

    expect(shouldTriggerWebhook(webhook, webhook_event_type.created, "event")).toBe(true);
    expect(shouldTriggerWebhook(webhook, webhook_event_type.updated, "task")).toBe(true);
  });
});

describe("determineNextStatus", () => {
  it("should return success for successful delivery", () => {
    const result = { success: true, httpStatus: 200 };
    const { status, nextRetryAt } = determineNextStatus(1, 3, result);

    expect(status).toBe(webhook_delivery_status.success);
    expect(nextRetryAt).toBeNull();
  });

  it("should return retrying for failed delivery with retries left", () => {
    const result = { success: false, errorMessage: "Failed" };
    const { status, nextRetryAt } = determineNextStatus(1, 3, result);

    expect(status).toBe(webhook_delivery_status.retrying);
    expect(nextRetryAt).not.toBeNull();
  });

  it("should return failed when max retries exceeded", () => {
    const result = { success: false, errorMessage: "Failed" };
    const { status, nextRetryAt } = determineNextStatus(3, 3, result);

    expect(status).toBe(webhook_delivery_status.failed);
    expect(nextRetryAt).toBeNull();
  });
});

describe("shouldAutoDisable", () => {
  it("should return true when consecutive failures >= threshold", () => {
    expect(shouldAutoDisable(5)).toBe(true);
    expect(shouldAutoDisable(10)).toBe(true);
  });

  it("should return false when consecutive failures < threshold", () => {
    expect(shouldAutoDisable(0)).toBe(false);
    expect(shouldAutoDisable(4)).toBe(false);
  });
});
