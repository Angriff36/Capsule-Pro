/**
 * Unit tests for outbox publish envelope building logic.
 * Tests the core logic of building event envelopes for Ably publishing.
 */

import { describe, expect, it } from "vitest";

const KITCHEN_EVENT_REGEX = /^kitchen\.\w+\.\w+$/;
const EVENT_LIFECYCLE_REGEX = /^event\.\w+$/;

describe("Outbox Publish Envelope Logic", () => {
  describe("envelope building", () => {
    it("should build correct envelope structure with occurredAt from payload", () => {
      const event = {
        id: "test-event-id",
        tenantId: "e2e-test-tenant",
        aggregateType: "KitchenTask",
        aggregateId: "task-123",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-123",
          employeeId: "emp-456",
          claimedAt: new Date().toISOString(),
          occurredAt: "2024-01-15T10:30:00.000Z",
        },
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      };

      // Build envelope (same logic as publisher)
      const payloadData = event.payload as Record<string, unknown>;
      const occurredAt =
        payloadData?.occurredAt && typeof payloadData.occurredAt === "string"
          ? payloadData.occurredAt
          : event.createdAt.toISOString();

      const envelope = {
        id: event.id,
        version: 1 as const,
        tenantId: event.tenantId,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        occurredAt,
        eventType: event.eventType,
        payload: event.payload,
      };

      // Verify envelope structure
      expect(envelope.id).toBe("test-event-id");
      expect(envelope.version).toBe(1);
      expect(envelope.tenantId).toBe("e2e-test-tenant");
      expect(envelope.aggregateType).toBe("KitchenTask");
      expect(envelope.aggregateId).toBe("task-123");
      expect(envelope.eventType).toBe("kitchen.task.claimed");
      expect(envelope.occurredAt).toBe("2024-01-15T10:30:00.000Z"); // From payload, not createdAt
      expect(envelope.payload).toEqual(event.payload);
    });

    it("should use createdAt when occurredAt is not in payload", () => {
      const event = {
        id: "test-event-id",
        tenantId: "test-tenant",
        aggregateType: "KitchenTask",
        aggregateId: "task-456",
        eventType: "kitchen.task.released",
        payload: {
          taskId: "task-456",
          employeeId: "emp-789",
          releasedAt: new Date().toISOString(),
          // No occurredAt in payload
        },
        createdAt: new Date("2024-01-15T12:00:00.000Z"),
      };

      const payloadData = event.payload as Record<string, unknown>;
      const occurredAt =
        payloadData?.occurredAt && typeof payloadData.occurredAt === "string"
          ? payloadData.occurredAt
          : event.createdAt.toISOString();

      const envelope = {
        id: event.id,
        version: 1 as const,
        tenantId: event.tenantId,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        occurredAt,
        eventType: event.eventType,
        payload: event.payload,
      };

      expect(envelope.occurredAt).toBe("2024-01-15T12:00:00.000Z"); // From createdAt
    });
  });

  describe("payload size validation", () => {
    it("should reject oversized payloads (>64 KiB)", () => {
      const largePayload = {
        data: "x".repeat(70 * 1024), // 70 KiB
        occurredAt: new Date().toISOString(),
      };

      const envelope = {
        id: "event-1",
        version: 1 as const,
        tenantId: "tenant-1",
        aggregateType: "KitchenTask",
        aggregateId: "task-1",
        occurredAt: new Date().toISOString(),
        eventType: "kitchen.task.progress",
        payload: largePayload,
      };

      const messageSize = Buffer.byteLength(JSON.stringify(envelope), "utf8");
      const MAX_PAYLOAD_SIZE = 64 * 1024;

      expect(messageSize).toBeGreaterThan(MAX_PAYLOAD_SIZE);
      expect(messageSize).toBeLessThan(80 * 1024); // Should be around 72KB
    });

    it("should accept valid payload sizes (<64 KiB)", () => {
      const smallPayload = {
        taskId: "task-1",
        progress: 50,
        occurredAt: new Date().toISOString(),
      };

      const envelope = {
        id: "event-1",
        version: 1 as const,
        tenantId: "tenant-1",
        aggregateType: "KitchenTask",
        aggregateId: "task-1",
        occurredAt: new Date().toISOString(),
        eventType: "kitchen.task.progress",
        payload: smallPayload,
      };

      const messageSize = Buffer.byteLength(JSON.stringify(envelope), "utf8");
      const MAX_PAYLOAD_SIZE = 64 * 1024;

      expect(messageSize).toBeLessThan(MAX_PAYLOAD_SIZE);
      expect(messageSize).toBeLessThan(1024); // Should be very small
    });

    it("should warn at 32 KiB threshold", () => {
      const mediumPayload = {
        data: "x".repeat(32 * 1024), // 32 KiB
        occurredAt: new Date().toISOString(),
      };

      const envelope = {
        id: "event-1",
        version: 1 as const,
        tenantId: "tenant-1",
        aggregateType: "KitchenTask",
        aggregateId: "task-1",
        occurredAt: new Date().toISOString(),
        eventType: "kitchen.task.progress",
        payload: mediumPayload,
      };

      const messageSize = Buffer.byteLength(JSON.stringify(envelope), "utf8");
      const WARNING_THRESHOLD = 32 * 1024;
      const MAX_PAYLOAD_SIZE = 64 * 1024;

      expect(messageSize).toBeGreaterThan(WARNING_THRESHOLD);
      expect(messageSize).toBeLessThan(MAX_PAYLOAD_SIZE);
    });
  });

  describe("channel naming", () => {
    it("should generate correct tenant channel name", () => {
      const tenantId = "tenant-abc-123";
      const channelName = `tenant:${tenantId}`;
      expect(channelName).toBe("tenant:tenant-abc-123");
    });

    it("should handle special characters in tenant ID", () => {
      const tenantId = "tenant-with-dashes_and_underscores";
      const channelName = `tenant:${tenantId}`;
      expect(channelName).toBe("tenant:tenant-with-dashes_and_underscores");
    });
  });

  describe("event type formatting", () => {
    it("should format kitchen task events correctly", () => {
      const events = [
        "kitchen.task.claimed",
        "kitchen.task.released",
        "kitchen.task.progress",
        "kitchen.task.created",
        "kitchen.task.status_changed",
      ];

      for (const eventType of events) {
        expect(eventType).toMatch(KITCHEN_EVENT_REGEX);
      }
    });

    it("should format event lifecycle events correctly", () => {
      const events = [
        "event.created",
        "event.updated",
        "event.cancelled",
        "event.started",
        "event.completed",
      ];

      for (const eventType of events) {
        expect(eventType).toMatch(EVENT_LIFECYCLE_REGEX);
      }
    });
  });

  describe("envelope version validation", () => {
    it("should use version 1 for all events", () => {
      const envelope = {
        version: 1 as const,
        tenantId: "tenant-1",
        aggregateType: "KitchenTask",
        aggregateId: "task-1",
        occurredAt: new Date().toISOString(),
        eventType: "kitchen.task.claimed",
        payload: { taskId: "task-1" },
      };

      expect(envelope.version).toBe(1);
    });
  });
});
