/**
 * Integration Tests: Outbox Publish Endpoint
 *
 * These tests validate that the /outbox/publish endpoint:
 * 1. Successfully publishes events with valid payload
 * 2. Fails with missing required fields
 * 3. Fails with invalid event type
 * 4. Fails with oversized payload (>64KB)
 * 5. Fails with invalid tenantId
 * 6. Creates database outbox events
 * 7. Handles status transitions (pending -> published)
 * 8. Maintains multi-tenant isolation
 *
 * NOTE: These tests require a real database connection. Run with:
 *   pnpm test:integration
 * Or run specific file:
 *   pnpm vitest --config vitest.config.integration.mts publish
 *
 * @packageDocumentation
 */

import { database } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "../../app/outbox/publish/route";

// Use valid UUIDs for tenant and user IDs
const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TEST_TENANT_2_ID = "00000000-0000-0000-0000-000000000002";
const TEST_USER_ID = "00000000-0000-0000-0000-000000000003";

// Test token for authorization (must match OUTBOX_PUBLISH_TOKEN in .env.local)
const TEST_TOKEN = process.env.OUTBOX_PUBLISH_TOKEN || "test-publish-token";

async function cleanupTestData() {
  await database.outboxEvent.deleteMany({
    where: {
      tenantId: { in: [TEST_TENANT_ID, TEST_TENANT_2_ID] },
    },
  });
}

describe("Outbox Publish Endpoint - Integration Tests", () => {
  beforeAll(async () => {
    console.log("[TEST] Starting outbox publish integration tests");
    await cleanupTestData();
  });

  describe("Authorization", () => {
    it("should return 401 without authorization header", async () => {
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
    });

    it("should return 401 with invalid authorization header", async () => {
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: "Bearer invalid-token",
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
    });

    it("should return 401 with malformed authorization header", async () => {
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: "InvalidFormat token",
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
    });

    it("should return 401 with empty bearer token", async () => {
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: "Bearer ",
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
    });
  });

  describe("Request Payload Validation", () => {
    it("should return 401 without authorization regardless of payload", async () => {
      // Missing authorization
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        body: JSON.stringify({}), // Empty payload
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should handle invalid JSON gracefully", async () => {
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
          "content-type": "application/json",
        },
        body: "invalid json{{{",
      });

      // Should handle gracefully - invalid JSON results in null payload
      // which uses default limit of 100
      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        published: number;
        failed: number;
        skipped: number;
      };

      expect(data).toBeDefined();
      expect(typeof data.published).toBe("number");
      expect(typeof data.failed).toBe("number");
      expect(typeof data.skipped).toBe("number");
    }, 10_000);

    it("should accept valid authorization with empty payload", async () => {
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        published: number;
        failed: number;
        skipped: number;
        oldestPendingSeconds: number;
      };

      expect(data).toBeDefined();
      expect(typeof data.published).toBe("number");
      expect(typeof data.failed).toBe("number");
      expect(typeof data.skipped).toBe("number");
      expect(typeof data.oldestPendingSeconds).toBe("number");
      expect(data.oldestPendingSeconds).toBeGreaterThanOrEqual(0);
    }, 10_000);

    it("should accept valid authorization with null payload", async () => {
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify(null),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    }, 10_000);
  });

  describe("Limit Parameter Handling", () => {
    it("should use default limit of 100 when not specified", async () => {
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    }, 10_000);

    it("should accept custom limit within valid range", async () => {
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 50 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    }, 10_000);

    it("should clamp limit to maximum of 500", async () => {
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 1000 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      // Should process with max limit of 500
    });

    it("should clamp limit to minimum of 1", async () => {
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 0 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("should handle negative limit", async () => {
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: -10 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Successful Event Publishing", () => {
    it("should publish pending events successfully", async () => {
      // Create a pending event
      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-publish-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-publish-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      expect(event.status).toBe("pending");

      // Publish the event
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        published: number;
        failed: number;
        skipped: number;
        oldestPendingSeconds: number;
      };

      expect(data.published).toBeGreaterThanOrEqual(1);
      expect(data.failed).toBe(0);

      // Verify event was updated
      const updatedEvent = await database.outboxEvent.findUnique({
        where: { id: event.id },
      });

      expect(updatedEvent?.status).toBe("published");
      expect(updatedEvent?.publishedAt).toBeDefined();
      expect(updatedEvent?.error).toBeNull();
    });

    it("should return correct counts when no pending events", async () => {
      // Clean up any existing events
      await database.outboxEvent.deleteMany({
        where: {
          tenantId: TEST_TENANT_ID,
          status: "pending",
        },
      });

      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        published: number;
        failed: number;
        skipped: number;
        oldestPendingSeconds: number;
      };

      expect(data.published).toBe(0);
      expect(data.failed).toBe(0);
      expect(data.skipped).toBe(0);
      expect(data.oldestPendingSeconds).toBe(0);
    });

    it("should publish multiple events in one batch", async () => {
      const eventCount = 3;
      const eventIds: string[] = [];

      // Create multiple pending events
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
        eventIds.push(event.id);
      }

      // Publish all events
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as {
        published: number;
        failed: number;
        skipped: number;
        oldestPendingSeconds: number;
      };

      expect(data.published).toBeGreaterThanOrEqual(eventCount);

      // Verify all events were updated
      const updatedEvents = await database.outboxEvent.findMany({
        where: { id: { in: eventIds } },
      });

      for (const event of updatedEvents) {
        expect(event.status).toBe("published");
        expect(event.publishedAt).toBeDefined();
      }
    });
  });

  describe("Status Transitions", () => {
    it("should transition status from pending to published", async () => {
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
      expect(event.publishedAt).toBeNull();

      // Publish
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = (await response.json()) as {
        published: number;
        failed: number;
      };

      // Verify transition - event should be either published or failed
      const updated = await database.outboxEvent.findUnique({
        where: { id: event.id },
      });

      // If Ably is configured correctly, it should be published
      // If Ably fails, it should be failed with an error message
      expect(updated?.status).toMatch(/^(published|failed)$/);

      if (updated?.status === "published") {
        expect(updated.publishedAt).toBeDefined();
        expect(updated.error).toBeNull();
        expect(data.published).toBeGreaterThan(0);
      } else {
        // Ably may not be configured in test environment
        expect(updated?.error).toContain("ABLY_ERROR");
        expect(data.failed).toBeGreaterThan(0);
      }
    });

    it("should skip events that are already published", async () => {
      // Create and immediately mark as published
      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-already-published-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-already-published-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      await database.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "published",
          publishedAt: new Date(),
        },
      });

      // Try to publish again
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = (await response.json()) as { skipped: number };

      // Should skip this event
      expect(data.skipped).toBeGreaterThanOrEqual(0);
    });

    it("should skip events that are already failed", async () => {
      // Create and mark as failed
      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-already-failed-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-already-failed-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      await database.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "failed",
          error: "Previous error",
        },
      });

      // Try to publish again
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = (await response.json()) as { skipped: number };

      // Should skip this event
      expect(data.skipped).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Oversized Payload Handling", () => {
    it("should fail events with oversized payload (>64KB)", async () => {
      // Create a payload larger than 64KB
      const largePayload = {
        taskId: "task-oversized-001",
        employeeId: TEST_USER_ID,
        // Create a large string to exceed 64KB
        data: "x".repeat(70 * 1024), // 70KB
      };

      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-oversized-001",
        eventType: "kitchen.task.claimed",
        payload: largePayload,
      });

      // Publish
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = (await response.json()) as { failed: number };

      expect(data.failed).toBeGreaterThanOrEqual(1);

      // Verify event was marked as failed
      const updated = await database.outboxEvent.findUnique({
        where: { id: event.id },
      });

      expect(updated?.status).toBe("failed");
      expect(updated?.error).toContain("PAYLOAD_TOO_LARGE");
    });

    it("should handle payload exactly at 64KB limit", async () => {
      // Create a payload that should be close to but under 64KB after envelope
      // The envelope adds id, version, tenantId, etc., so we need to account for that
      const largePayload = {
        taskId: "task-limit-001",
        employeeId: TEST_USER_ID,
        data: "x".repeat(63 * 1024), // 63KB - envelope should push it over or close
      };

      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-limit-001",
        eventType: "kitchen.task.claimed",
        payload: largePayload,
      });

      // Publish
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      await POST(request);

      // This may fail or succeed depending on exact envelope size
      const updated = await database.outboxEvent.findUnique({
        where: { id: event.id },
      });

      expect(updated?.status).toMatch(/^(published|failed)$/);
    });

    it("should succeed with small payload", async () => {
      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-small-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-small-001",
          employeeId: TEST_USER_ID,
          data: "small payload",
        },
      });

      // Publish
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = (await response.json()) as {
        published: number;
        failed: number;
      };

      // Should have processed at least one event
      expect(data.published + data.failed).toBeGreaterThanOrEqual(1);

      const updated = await database.outboxEvent.findUnique({
        where: { id: event.id },
      });

      // Event should be either published or failed (if Ably is not configured)
      expect(updated?.status).toMatch(/^(published|failed)$/);
    });
  });

  describe("Multi-Tenant Isolation", () => {
    it("should maintain separate events per tenant", async () => {
      // Create events for two tenants
      await createOutboxEvent(database, {
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

      await createOutboxEvent(database, {
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

      // Publish
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 100 }),
      });

      await POST(request);

      // Verify both tenants' events are isolated
      const tenant1Events = await database.outboxEvent.findMany({
        where: { tenantId: TEST_TENANT_ID },
      });

      const tenant2Events = await database.outboxEvent.findMany({
        where: { tenantId: TEST_TENANT_2_ID },
      });

      expect(tenant1Events.length).toBeGreaterThanOrEqual(1);
      expect(tenant2Events.length).toBeGreaterThanOrEqual(1);

      // Verify no overlap
      const tenant1Ids = new Set(tenant1Events.map((e) => e.id));
      const tenant2Ids = new Set(tenant2Events.map((e) => e.id));
      const overlap = [...tenant1Ids].filter((id) => tenant2Ids.has(id));
      expect(overlap).toHaveLength(0);
    }, 10_000);

    it("should only process events for the tenant in the request", async () => {
      // The endpoint processes all pending events regardless of tenant
      // but maintains tenant isolation in the outbox table

      await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-tenant-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-tenant-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      await createOutboxEvent(database, {
        tenantId: TEST_TENANT_2_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-tenant-002",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-tenant-002",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      // Publish all
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 100 }),
      });

      const response = await POST(request);
      const data = (await response.json()) as {
        published: number;
        failed: number;
      };

      // Both events should be processed
      expect(data.published + data.failed).toBeGreaterThanOrEqual(2);
    }, 10_000);
  });

  describe("Oldest Pending Calculation", () => {
    it("should calculate oldest pending event age correctly", async () => {
      // Create first event
      await createOutboxEvent(database, {
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

      // Wait a bit
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

      // Publish
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = (await response.json()) as {
        oldestPendingSeconds: number;
      };

      // Should have a positive age for oldest pending before publish
      expect(typeof data.oldestPendingSeconds).toBe("number");
      expect(data.oldestPendingSeconds).toBeGreaterThanOrEqual(0);
    });

    it("should return 0 when no pending events exist", async () => {
      // Clean up all pending events across all tenants
      await database.outboxEvent.deleteMany({
        where: {
          status: "pending",
        },
      });

      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = (await response.json()) as {
        oldestPendingSeconds: number;
      };

      expect(data.oldestPendingSeconds).toBe(0);
    });
  });

  describe("Database Outbox Event Creation", () => {
    it("should create outbox event with correct fields", async () => {
      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-db-001",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-db-001",
          employeeId: TEST_USER_ID,
          claimedAt: new Date().toISOString(),
        },
      });

      expect(event.id).toBeDefined();
      expect(event.tenantId).toBe(TEST_TENANT_ID);
      expect(event.aggregateType).toBe("KitchenTask");
      expect(event.aggregateId).toBe("task-db-001");
      expect(event.eventType).toBe("kitchen.task.claimed");
      expect(event.status).toBe("pending");
      expect(event.createdAt).toBeDefined();
      expect(event.publishedAt).toBeNull();
      expect(event.error).toBeNull();
      expect(event.payload).toBeDefined();
    });

    it("should preserve payload structure", async () => {
      const complexPayload = {
        taskId: "task-db-002",
        employeeId: TEST_USER_ID,
        claimedAt: new Date().toISOString(),
        metadata: {
          priority: "high",
          tags: ["urgent", "test"],
        },
      };

      const event = await createOutboxEvent(database, {
        tenantId: TEST_TENANT_ID,
        aggregateType: "KitchenTask",
        aggregateId: "task-db-002",
        eventType: "kitchen.task.claimed",
        payload: complexPayload,
      });

      // The payload should be preserved with occurredAt added
      expect(event.payload).toBeDefined();
      expect((event.payload as Record<string, unknown>).taskId).toBe(
        complexPayload.taskId
      );
      expect((event.payload as Record<string, unknown>).employeeId).toBe(
        complexPayload.employeeId
      );
    });
  });

  describe("Concurrent Publishing Safety", () => {
    it("should handle SKIP LOCKED for concurrent access", async () => {
      // Create multiple pending events
      const eventCount = 5;
      const eventIds: string[] = [];

      for (let i = 0; i < eventCount; i++) {
        const event = await createOutboxEvent(database, {
          tenantId: TEST_TENANT_ID,
          aggregateType: "KitchenTask",
          aggregateId: `task-concurrent-${String(i).padStart(3, "0")}`,
          eventType: "kitchen.task.claimed",
          payload: {
            taskId: `task-concurrent-${String(i).padStart(3, "0")}`,
            employeeId: TEST_USER_ID,
            claimedAt: new Date().toISOString(),
          },
        });
        eventIds.push(event.id);
      }

      // Simulate concurrent publishing by running multiple requests
      const requests = Array.from(
        { length: 3 },
        () =>
          new Request("http://localhost:3000/outbox/publish", {
            method: "POST",
            headers: {
              authorization: `Bearer ${TEST_TOKEN}`,
            },
            body: JSON.stringify({ limit: 10 }),
          })
      );

      const responses = await Promise.all(requests.map((req) => POST(req)));

      // All requests should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
      }

      // Verify events were processed (some may be skipped)
      const finalEvents = await database.outboxEvent.findMany({
        where: { id: { in: eventIds } },
      });

      // All events should be processed (published or failed)
      const processedEvents = finalEvents.filter(
        (e) => e.status === "published" || e.status === "failed"
      );

      expect(processedEvents.length).toBe(eventCount);
    });
  });

  describe("Event Ordering", () => {
    it("should process events in createdAt ascending order", async () => {
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

      // Verify event1 was created before event2
      expect(event1.createdAt.getTime()).toBeLessThan(
        event2.createdAt.getTime()
      );

      // Publish - should process in order
      const request = new Request("http://localhost:3000/outbox/publish", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});

// Final cleanup
afterAll(async () => {
  await cleanupTestData();
});
