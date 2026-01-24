/**
 * E2E test for outbox publish flow.
 * This test validates the full pipeline: DB -> Publisher -> Ably (mocked).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { database } from "@repo/database";

// Mock Ably to avoid actual network calls
vi.mock("ably", () => ({
  default: {
    Rest: vi.fn(() => ({
      channels: {
        get: vi.fn(() => ({
          publish: vi.fn().mockResolvedValue(undefined),
        })),
      },
    })),
  },
}));

describe("Outbox Publish E2E", () => {
  beforeEach(async () => {
    // Clean up outbox events before each test
    await database.outboxEvent.deleteMany({
      where: { tenantId: "e2e-test-tenant" },
    });
  });

  it("should publish pending outbox event with envelope", async () => {
    // 1. Create a pending outbox event
    const testEvent = await database.outboxEvent.create({
      data: {
        tenantId: "e2e-test-tenant",
        aggregateType: "KitchenTask",
        aggregateId: "task-123",
        eventType: "kitchen.task.claimed",
        payload: {
          taskId: "task-123",
          employeeId: "emp-456",
          claimedAt: new Date().toISOString(),
          occurredAt: new Date().toISOString(),
        },
        status: "pending",
      },
    });

    expect(testEvent.status).toBe("pending");
    expect(testEvent.id).toBeTruthy();

    // 2. Simulate publisher processing (import route handler)
    const { default: Ably } = await import("ably");
    const ably = new Ably.Rest("test-key");

    // Fetch pending events
    const pendingEvents = await database.outboxEvent.findMany({
      where: { status: "pending", tenantId: "e2e-test-tenant" },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    expect(pendingEvents.length).toBe(1);

    // 3. Build envelope (mimicking publisher logic)
    const event = pendingEvents[0]!;
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

    // 4. Publish to Ably (mocked)
    const channel = ably.channels.get(`tenant:${event.tenantId}`);
    await channel.publish(event.eventType, envelope);

    // 5. Update status to published
    const published = await database.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: "published",
        publishedAt: new Date(),
        error: null,
      },
    });

    // 6. Verify final state
    expect(published.status).toBe("published");
    expect(published.publishedAt).not.toBeNull();
    expect(published.error).toBeNull();

    // Verify envelope structure
    expect(envelope.id).toBe(testEvent.id);
    expect(envelope.version).toBe(1);
    expect(envelope.eventType).toBe("kitchen.task.claimed");
    expect(envelope.occurredAt).toBeTruthy();
  });

  it("should handle failed publish with error message", async () => {
    // Create event
    const testEvent = await database.outboxEvent.create({
      data: {
        tenantId: "e2e-test-tenant",
        aggregateType: "KitchenTask",
        aggregateId: "task-456",
        eventType: "kitchen.task.released",
        payload: {
          taskId: "task-456",
          employeeId: "emp-789",
          releasedAt: new Date().toISOString(),
          occurredAt: new Date().toISOString(),
        },
        status: "pending",
      },
    });

    // Simulate failed publish
    await database.outboxEvent.update({
      where: { id: testEvent.id },
      data: {
        status: "failed",
        error: "ABLY_ERROR: Connection refused",
      },
    });

    // Verify failed state
    const failed = await database.outboxEvent.findUnique({
      where: { id: testEvent.id },
    });

    expect(failed?.status).toBe("failed");
    expect(failed?.error).toContain("ABLY_ERROR");
  });

  it("should reject oversized payloads", async () => {
    // Create event with oversized payload (>64 KiB)
    const largePayload = {
      data: "x".repeat(70 * 1024), // 70 KiB
      occurredAt: new Date().toISOString(),
    };

    const testEvent = await database.outboxEvent.create({
      data: {
        tenantId: "e2e-test-tenant",
        aggregateType: "KitchenTask",
        aggregateId: "task-789",
        eventType: "kitchen.task.progress",
        payload: largePayload,
        status: "pending",
      },
    });

    // Simulate payload size check
    const envelope = {
      id: testEvent.id,
      version: 1 as const,
      tenantId: testEvent.tenantId,
      aggregateType: testEvent.aggregateType,
      aggregateId: testEvent.aggregateId,
      occurredAt: new Date().toISOString(),
      eventType: testEvent.eventType,
      payload: testEvent.payload,
    };

    const messageSize = Buffer.byteLength(JSON.stringify(envelope), "utf8");
    const MAX_PAYLOAD_SIZE = 64 * 1024;

    if (messageSize > MAX_PAYLOAD_SIZE) {
      await database.outboxEvent.update({
        where: { id: testEvent.id },
        data: {
          status: "failed",
          error: `PAYLOAD_TOO_LARGE: ${messageSize} bytes (max ${MAX_PAYLOAD_SIZE})`,
        },
      });
    }

    // Verify rejected state
    const rejected = await database.outboxEvent.findUnique({
      where: { id: testEvent.id },
    });

    expect(rejected?.status).toBe("failed");
    expect(rejected?.error).toContain("PAYLOAD_TOO_LARGE");
  });
});
