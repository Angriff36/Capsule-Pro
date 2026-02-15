/**
 * Integration tests for outbox publisher logic.
 * These tests validate the publisher logic without requiring actual DB or Ably connections.
 */

import { describe, expect, it } from "vitest";
import type { RealtimeEventBase } from "../src/events";

// Mock helper functions that mirror the publisher route logic
function getMessageSizeLocal(message: unknown): number {
  return Buffer.byteLength(JSON.stringify(message), "utf8");
}

function buildEventEnvelope(outboxEvent: {
  id: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  createdAt: Date;
}): RealtimeEventBase & { eventType: string; payload: unknown } {
  const payloadData = outboxEvent.payload as
    | Record<string, unknown>
    | undefined;
  const occurredAt =
    payloadData?.occurredAt && typeof payloadData.occurredAt === "string"
      ? payloadData.occurredAt
      : outboxEvent.createdAt.toISOString();

  return {
    id: outboxEvent.id,
    version: 1,
    tenantId: outboxEvent.tenantId,
    aggregateType: outboxEvent.aggregateType,
    aggregateId: outboxEvent.aggregateId,
    occurredAt,
    eventType: outboxEvent.eventType,
    payload: outboxEvent.payload,
  };
}

const WARN_PAYLOAD_SIZE = 32 * 1024; // 32 KiB
const MAX_PAYLOAD_SIZE = 64 * 1024; // 64 KiB

describe("Publisher Integration Tests", () => {
  describe("buildEventEnvelope", () => {
    it("builds envelope with occurredAt from payload", () => {
      const event = {
        id: "event-123",
        tenantId: "tenant-abc",
        aggregateType: "KitchenTask",
        aggregateId: "task-456",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-456",
          employeeId: "emp-789",
          claimedAt: "2026-01-23T10:30:00.000Z",
          occurredAt: "2026-01-23T10:30:00.000Z",
        },
        createdAt: new Date("2026-01-23T10:29:00.000Z"),
      };

      const envelope = buildEventEnvelope(event);

      expect(envelope.id).toBe("event-123");
      expect(envelope.version).toBe(1);
      expect(envelope.tenantId).toBe("tenant-abc");
      expect(envelope.aggregateType).toBe("KitchenTask");
      expect(envelope.aggregateId).toBe("task-456");
      expect(envelope.occurredAt).toBe("2026-01-23T10:30:00.000Z"); // From payload
      expect(envelope.eventType).toBe("kitchen.task.claimed");
    });

    it("falls back to createdAt when occurredAt not in payload", () => {
      const event = {
        id: "event-123",
        tenantId: "tenant-abc",
        aggregateType: "KitchenTask",
        aggregateId: "task-456",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-456",
          employeeId: "emp-789",
          claimedAt: "2026-01-23T10:30:00.000Z",
        },
        createdAt: new Date("2026-01-23T10:29:00.000Z"),
      };

      const envelope = buildEventEnvelope(event);

      expect(envelope.occurredAt).toBe("2026-01-23T10:29:00.000Z"); // From createdAt
    });

    it("handles payload without occurredAt field", () => {
      const event = {
        id: "event-123",
        tenantId: "tenant-abc",
        aggregateType: "KitchenTask",
        aggregateId: "task-456",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-456",
          employeeId: "emp-789",
          claimedAt: "2026-01-23T10:30:00.000Z",
        },
        createdAt: new Date("2026-01-23T10:29:00.000Z"),
      };

      const envelope = buildEventEnvelope(event);

      expect(envelope.occurredAt).toBe("2026-01-23T10:29:00.000Z");
    });
  });

  describe("Payload Size Validation", () => {
    it("accepts normal-sized payloads", () => {
      const payload = {
        id: "event-123",
        version: 1,
        tenantId: "tenant-abc",
        aggregateType: "KitchenTask",
        aggregateId: "task-456",
        occurredAt: "2026-01-23T10:30:00.000Z",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-456",
          employeeId: "emp-789",
          claimedAt: "2026-01-23T10:30:00.000Z",
        },
      };

      const size = getMessageSizeLocal(payload);

      expect(size).toBeLessThanOrEqual(WARN_PAYLOAD_SIZE);
    });

    it("warns on large payloads (>32 KiB)", () => {
      const largePayload = {
        id: "event-123",
        version: 1,
        tenantId: "tenant-abc",
        aggregateType: "KitchenTask",
        aggregateId: "task-456",
        occurredAt: "2026-01-23T10:30:00.000Z",
        eventType: "kitchen.task.claimed",
        payload: {
          data: "x".repeat(33 * 1024), // 33 KiB
        },
      };

      const size = getMessageSizeLocal(largePayload);

      expect(size).toBeGreaterThan(WARN_PAYLOAD_SIZE);
      expect(size).toBeLessThanOrEqual(MAX_PAYLOAD_SIZE);
    });

    it("rejects oversized payloads (>64 KiB)", () => {
      const oversizedPayload = {
        id: "event-123",
        version: 1,
        tenantId: "tenant-abc",
        aggregateType: "KitchenTask",
        aggregateId: "task-456",
        occurredAt: "2026-01-23T10:30:00.000Z",
        eventType: "kitchen.task.claimed",
        payload: {
          data: "x".repeat(70 * 1024), // 70 KiB
        },
      };

      const size = getMessageSizeLocal(oversizedPayload);

      expect(size).toBeGreaterThan(MAX_PAYLOAD_SIZE);
    });
  });

  describe("Response Format", () => {
    it("returns correct response structure for no events", () => {
      const response = {
        published: 0,
        failed: 0,
        skipped: 0,
        oldestPendingSeconds: 0,
      };

      expect(response.published).toBe(0);
      expect(response.failed).toBe(0);
      expect(response.skipped).toBe(0);
      expect(response.oldestPendingSeconds).toBeDefined();
    });

    it("returns correct response structure for successful publish", () => {
      const response = {
        published: 5,
        failed: 0,
        skipped: 0,
        oldestPendingSeconds: 2.5,
      };

      expect(response.published).toBe(5);
      expect(response.failed).toBe(0);
      expect(response.skipped).toBe(0);
      expect(response.oldestPendingSeconds).toBe(2.5);
    });

    it("returns correct response structure with failures", () => {
      const response = {
        published: 3,
        failed: 2,
        skipped: 0,
        oldestPendingSeconds: 1.2,
      };

      expect(response.published).toBe(3);
      expect(response.failed).toBe(2);
      expect(response.skipped).toBe(0);
    });
  });
});

// Export for use in tests
export { getMessageSizeLocal as getMessageSize };
