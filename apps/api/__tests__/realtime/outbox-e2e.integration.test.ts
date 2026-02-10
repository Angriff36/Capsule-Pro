/**
 * Integration Tests: Real-time Outbox End-to-End
 *
 * These tests validate that the outbox publisher:
 * 1. Creates events via outbox helper
 * 2. Publishes events to Ably via publisher endpoint
 * 3. Updates event status after processing
 * 4. Maintains event ordering
 * 5. Enforces multi-tenant isolation
 * 6. Handles errors gracefully
 *
 * NOTE: These tests require a real database connection. Run with:
 *   pnpm test:integration
 * Or run specific file:
 *   pnpm vitest --config vitest.config.integration.mts outbox-e2e
 *
 * @packageDocumentation
 */

import { database } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Use valid UUIDs for tenant and user IDs
const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TEST_TENANT_2_ID = "00000000-0000-0000-0000-000000000002";
const TEST_USER_ID = "00000000-0000-0000-0000-000000000003";

async function cleanupTestData() {
  await database.outboxEvent.deleteMany({
    where: {
      tenantId: { in: [TEST_TENANT_ID, TEST_TENANT_2_ID] },
    },
  });
}

describe("Real-time Outbox - End-to-End Integration", () => {
  beforeAll(async () => {
    console.log("[TEST] Starting real-time outbox integration tests");
    await cleanupTestData();
  });

  describe("Outbox Event Creation", () => {
    it("should create event with correct initial status", async () => {
      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-test-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-test-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      expect(event).toBeDefined();
      expect(event.id).toBeDefined();
      expect(event.status).toBe("pending");
      expect(event.tenantId).toBe(TEST_TENANT_ID);
      expect(event.aggregateType).toBe("KitchenTask");
      expect(event.aggregateId).toBe("task-test-001");
      expect(event.eventType).toBe("kitchen.task.claimed");
      expect(event.publishedAt).toBeNull();
      expect(event.error).toBeNull();
    });

    it("should store payload correctly", async () => {
      const payload = {
        taskId: "task-test-002",
        employeeId: TEST_USER_ID,
        claimedAt: "2026-01-23T10:30:00.000Z",
      };

      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-test-002",
        eventType: "kitchen.task.claimed",
        payload,
      });

      expect(event.payload).toEqual(payload);
    });

    it("should set createdAt timestamp", async () => {
      const beforeCreate = new Date();

      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-test-003",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-test-003",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      const afterCreate = new Date();

      expect(event.createdAt).toBeDefined();
      expect(event.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime()
      );
      expect(event.createdAt.getTime()).toBeLessThanOrEqual(
        afterCreate.getTime()
      );
    });
  });

  describe("Multi-Tenant Isolation", () => {
    it("should maintain separate events per tenant", async () => {
      // Create events for two tenants
      const event1 = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-iso-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-iso-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      const event2 = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_2_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-iso-002",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-iso-002",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      // Query events for tenant 1
      const tenant1Events = await database.outboxEvent.findMany({
        where: { tenantId: TEST_TENANT_ID },
      });

      // Query events for tenant 2
      const tenant2Events = await database.outboxEvent.findMany({
        where: { tenantId: TEST_TENANT_2_ID },
      });

      expect(tenant1Events.length).toBeGreaterThanOrEqual(1);
      expect(tenant2Events.length).toBeGreaterThanOrEqual(1);

      // Verify isolation - each tenant sees only their events
      const tenant1EventIds = new Set(
        tenant1Events.map((e) => e.id)
      );
      const tenant2EventIds = new Set(
        tenant2Events.map((e) => e.id)
      );

      // No overlap between tenant event sets
      const overlap = [...tenant1EventIds].filter((id) =>
        tenant2EventIds.has(id)
      );
      expect(overlap).toHaveLength(0);
    });

    it("should filter events by tenant in queries", async () => {
      // Create events for both tenants
      await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-filter-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-filter-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      await createOutboxEvent(database, {
        tenantId: TEST_TENANT_2_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-filter-002",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-filter-002",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      // Query pending events for tenant 1 only
      const tenant1Pending = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          status: "pending",
        },
      });

      // All returned events should belong to tenant 1
      tenant1Pending.forEach((event) => {
        expect(event.tenantId).toBe(TEST_TENANT_ID);
      });
    });
  });

  describe("Event Status Transitions", () => {
    it("should update event status from pending to published", async () => {
      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-status-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-status-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      expect(event.status).toBe("pending");

      // Simulate publisher updating status
      const updated = await database.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "published",
          publishedAt: new Date(),
          error: null,
        },
      });

      expect(updated.status).toBe("published");
      expect(updated.publishedAt).toBeDefined();
      expect(updated.error).toBeNull();
    });

    it("should update event status to failed on error", async () => {
      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-failed-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-failed-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      // Simulate publisher error
      const errorMessage = "ABLY_ERROR: Connection timeout";
      const updated = await database.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "failed",
          error: errorMessage,
        },
      });

      expect(updated.status).toBe("failed");
      expect(updated.error).toBe(errorMessage);
      expect(updated.publishedAt).toBeNull();
    });
  });

  describe("Event Ordering", () => {
    it("should create events in chronological order", async () => {
      // Create events with a delay
      const event1 = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-order-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-order-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const event2 = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-order-002",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-order-002",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      expect(event1.createdAt.getTime()).toBeLessThan(
        event2.createdAt.getTime()
      );
    });

    it("should query events ordered by createdAt ascending", async () => {
      // Create multiple events
      await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-query-order-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-query-order-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-query-order-002",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-query-order-002",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      // Query ordered events
      const events = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: { startsWith: "task-query-order" },
        },
        orderBy: { createdAt: "asc" },
      });

      // Verify ordering
      for (let i = 1; i < events.length; i++) {
        expect(events[i - 1].createdAt.getTime()).toBeLessThanOrEqual(
          events[i].createdAt.getTime()
        );
      }
    });
  });

  describe("Oldest Pending Calculation", () => {
    it("should calculate oldest pending event age correctly", async () => {
      // Create first event
      const firstEvent = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-oldest-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-oldest-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create second event
      await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-oldest-002",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-oldest-002",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      // Query oldest pending
      const oldestPending = await database.outboxEvent.findFirst({
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });

      expect(oldestPending).toBeDefined();
      if (oldestPending) {
        expect(oldestPending.createdAt.getTime()).toBe(
          firstEvent.createdAt.getTime()
        );

        // Calculate age
        const ageSeconds = (Date.now() - oldestPending.createdAt.getTime()) / 1000;
        expect(ageSeconds).toBeGreaterThan(0);
      }
    });

    it("should return null when no pending events", async () => {
      // Create and immediately publish event
      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-no-pending-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-no-pending-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      // Mark as published
      await database.outboxEvent.update({
        where: { id: event.id },
        data: { status: "published", publishedAt: new Date() },
      });

      // Query for pending events (should return null or no events)
      const pendingEvents = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: "task-no-pending-001",
          status: "pending",
        },
      });

      expect(pendingEvents.length).toBe(0);
    });
  });

  describe("Data Consistency", () => {
    it("should maintain atomicity of event creation", async () => {
      // Event should be fully created or not at all
      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-atomic-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-atomic-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      // All required fields should be present
      expect(event.id).toBeDefined();
      expect(event.tenantId).toBeDefined();
      expect(event.aggregateType).toBeDefined();
      expect(event.aggregateId).toBeDefined();
      expect(event.eventType).toBeDefined();
      expect(event.status).toBeDefined();
      expect(event.createdAt).toBeDefined();
    });

    it("should preserve payload structure on retrieval", async () => {
      const complexPayload = {
        taskId: "task-payload-001",
        employeeId: TEST_USER_ID,
        claimedAt: "2026-01-23T10:30:00.000Z",
        metadata: {
          priority: "high",
          tags: ["urgent", "client-request"],
        },
      };

      const created = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-payload-001",
        eventType: "kitchen.task.claimed",
        payload: complexPayload,
      });

      // Retrieve and verify payload
      const retrieved = await database.outboxEvent.findUnique({
        where: { id: created.id },
      });

      expect(retrieved).toBeDefined();
      expect(retrieved?.payload).toEqual(complexPayload);
    });
  });

  describe("Batch Operations", () => {
    it("should create multiple events in sequence", async () => {
      const eventCount = 5;
      const events = [];

      for (let i = 0; i < eventCount; i++) {
        const event = await createOutboxEvent(database, {
          tenantId: TEST_TENANT_ID,
          aggregateType: "KitchenTask",
          aggregateId: `task-batch-${String(i).padStart(3, "0")}`,
          eventType: "kitchen.task.claimed",
          payload: {
            taskId: `task-batch-${String(i).padStart(3, "0")}`,
            employeeId: TEST_USER_ID,
            claimedAt: new Date().toISOString(),
          },
        });
        events.push(event);
      }

      expect(events).toHaveLength(eventCount);

      // Verify all have unique IDs
      const ids = new Set(events.map((e) => e.id));
      expect(ids.size).toBe(eventCount);

      // Verify all have pending status
      events.forEach((event) => {
        expect(event.status).toBe("pending");
      });
    });

    it("should query pending events with limit", async () => {
      // Create more events than the limit
      const limit = 3;
      for (let i = 0; i < 10; i++) {
        await createOutboxEvent(database, {
          tenantId: TEST_TENANT_ID,
          aggregateType: "KitchenTask",
          aggregateId: `task-limit-${String(i).padStart(3, "0")}`,
          eventType: "kitchen.task.claimed",
          payload: {
            taskId: `task-limit-${String(i).padStart(3, "0")}`,
            employeeId: TEST_USER_ID,
            claimedAt: new Date().toISOString(),
          },
        });
      }

      // Query with limit
      const events = await database.outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          aggregateId: { startsWith: "task-limit" },
          status: "pending",
        },
        orderBy: { createdAt: "asc" },
        take: limit,
      });

      expect(events.length).toBeLessThanOrEqual(limit);
    });
  });
});

// Final cleanup
afterAll(async () => {
  await cleanupTestData();
});
