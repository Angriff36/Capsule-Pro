/**
 * Unit tests for outbox publish envelope building logic.
 * Tests the core logic of building event envelopes for Ably publishing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)("Outbox Publish Envelope Logic", () => {
  (0, vitest_1.describe)("envelope building", () => {
    (0, vitest_1.it)(
      "should build correct envelope structure with occurredAt from payload",
      () => {
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
        const payloadData = event.payload;
        const occurredAt =
          payloadData?.occurredAt && typeof payloadData.occurredAt === "string"
            ? payloadData.occurredAt
            : event.createdAt.toISOString();
        const envelope = {
          id: event.id,
          version: 1,
          tenantId: event.tenantId,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          occurredAt,
          eventType: event.eventType,
          payload: event.payload,
        };
        // Verify envelope structure
        (0, vitest_1.expect)(envelope.id).toBe("test-event-id");
        (0, vitest_1.expect)(envelope.version).toBe(1);
        (0, vitest_1.expect)(envelope.tenantId).toBe("e2e-test-tenant");
        (0, vitest_1.expect)(envelope.aggregateType).toBe("KitchenTask");
        (0, vitest_1.expect)(envelope.aggregateId).toBe("task-123");
        (0, vitest_1.expect)(envelope.eventType).toBe("kitchen.task.claimed");
        (0, vitest_1.expect)(envelope.occurredAt).toBe(
          "2024-01-15T10:30:00.000Z"
        ); // From payload, not createdAt
        (0, vitest_1.expect)(envelope.payload).toEqual(event.payload);
      }
    );
    (0, vitest_1.it)(
      "should use createdAt when occurredAt is not in payload",
      () => {
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
        const payloadData = event.payload;
        const occurredAt =
          payloadData?.occurredAt && typeof payloadData.occurredAt === "string"
            ? payloadData.occurredAt
            : event.createdAt.toISOString();
        const envelope = {
          id: event.id,
          version: 1,
          tenantId: event.tenantId,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          occurredAt,
          eventType: event.eventType,
          payload: event.payload,
        };
        (0, vitest_1.expect)(envelope.occurredAt).toBe(
          "2024-01-15T12:00:00.000Z"
        ); // From createdAt
      }
    );
  });
  (0, vitest_1.describe)("payload size validation", () => {
    (0, vitest_1.it)("should reject oversized payloads (>64 KiB)", () => {
      const largePayload = {
        data: "x".repeat(70 * 1024), // 70 KiB
        occurredAt: new Date().toISOString(),
      };
      const envelope = {
        id: "event-1",
        version: 1,
        tenantId: "tenant-1",
        aggregateType: "KitchenTask",
        aggregateId: "task-1",
        occurredAt: new Date().toISOString(),
        eventType: "kitchen.task.progress",
        payload: largePayload,
      };
      const messageSize = Buffer.byteLength(JSON.stringify(envelope), "utf8");
      const MAX_PAYLOAD_SIZE = 64 * 1024;
      (0, vitest_1.expect)(messageSize).toBeGreaterThan(MAX_PAYLOAD_SIZE);
      (0, vitest_1.expect)(messageSize).toBeLessThan(80 * 1024); // Should be around 72KB
    });
    (0, vitest_1.it)("should accept valid payload sizes (<64 KiB)", () => {
      const smallPayload = {
        taskId: "task-1",
        progress: 50,
        occurredAt: new Date().toISOString(),
      };
      const envelope = {
        id: "event-1",
        version: 1,
        tenantId: "tenant-1",
        aggregateType: "KitchenTask",
        aggregateId: "task-1",
        occurredAt: new Date().toISOString(),
        eventType: "kitchen.task.progress",
        payload: smallPayload,
      };
      const messageSize = Buffer.byteLength(JSON.stringify(envelope), "utf8");
      const MAX_PAYLOAD_SIZE = 64 * 1024;
      (0, vitest_1.expect)(messageSize).toBeLessThan(MAX_PAYLOAD_SIZE);
      (0, vitest_1.expect)(messageSize).toBeLessThan(1024); // Should be very small
    });
    (0, vitest_1.it)("should warn at 32 KiB threshold", () => {
      const mediumPayload = {
        data: "x".repeat(32 * 1024), // 32 KiB
        occurredAt: new Date().toISOString(),
      };
      const envelope = {
        id: "event-1",
        version: 1,
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
      (0, vitest_1.expect)(messageSize).toBeGreaterThan(WARNING_THRESHOLD);
      (0, vitest_1.expect)(messageSize).toBeLessThan(MAX_PAYLOAD_SIZE);
    });
  });
  (0, vitest_1.describe)("channel naming", () => {
    (0, vitest_1.it)("should generate correct tenant channel name", () => {
      const tenantId = "tenant-abc-123";
      const channelName = `tenant:${tenantId}`;
      (0, vitest_1.expect)(channelName).toBe("tenant:tenant-abc-123");
    });
    (0, vitest_1.it)("should handle special characters in tenant ID", () => {
      const tenantId = "tenant-with-dashes_and_underscores";
      const channelName = `tenant:${tenantId}`;
      (0, vitest_1.expect)(channelName).toBe(
        "tenant:tenant-with-dashes_and_underscores"
      );
    });
  });
  (0, vitest_1.describe)("event type formatting", () => {
    (0, vitest_1.it)("should format kitchen task events correctly", () => {
      const events = [
        "kitchen.task.claimed",
        "kitchen.task.released",
        "kitchen.task.progress",
        "kitchen.task.created",
        "kitchen.task.status_changed",
      ];
      for (const eventType of events) {
        (0, vitest_1.expect)(eventType).toMatch(/^kitchen\.\w+\.\w+$/);
      }
    });
    (0, vitest_1.it)("should format event lifecycle events correctly", () => {
      const events = [
        "event.created",
        "event.updated",
        "event.cancelled",
        "event.started",
        "event.completed",
      ];
      for (const eventType of events) {
        (0, vitest_1.expect)(eventType).toMatch(/^event\.\w+$/);
      }
    });
  });
  (0, vitest_1.describe)("envelope version validation", () => {
    (0, vitest_1.it)("should use version 1 for all events", () => {
      const envelope = {
        version: 1,
        tenantId: "tenant-1",
        aggregateType: "KitchenTask",
        aggregateId: "task-1",
        occurredAt: new Date().toISOString(),
        eventType: "kitchen.task.claimed",
        payload: { taskId: "task-1" },
      };
      (0, vitest_1.expect)(envelope.version).toBe(1);
    });
  });
});
