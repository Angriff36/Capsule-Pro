/**
 * Unit tests for event envelope building and validation.
 * Tests version consistency, occurredAt precedence rules, and tenant isolation.
 */

import { describe, expect, it } from "vitest";
import {
  type KitchenTaskClaimedEvent,
  parseRealtimeEvent,
  REALTIME_EVENT_VERSION,
  RealtimeEventBaseSchema,
} from "../src/events";

// Helper function to build envelope (mirrors publisher logic)
function buildEventEnvelope(outboxEvent: {
  id: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  createdAt: Date;
}): Omit<KitchenTaskClaimedEvent, "eventType" | "payload"> & {
  eventType: string;
  payload: unknown;
} {
  const payloadData = outboxEvent.payload as
    | Record<string, unknown>
    | undefined;
  const occurredAt =
    payloadData?.occurredAt && typeof payloadData.occurredAt === "string"
      ? payloadData.occurredAt
      : outboxEvent.createdAt.toISOString();

  return {
    id: outboxEvent.id,
    version: REALTIME_EVENT_VERSION,
    tenantId: outboxEvent.tenantId,
    aggregateType: outboxEvent.aggregateType,
    aggregateId: outboxEvent.aggregateId,
    occurredAt,
    eventType: outboxEvent.eventType,
    payload: outboxEvent.payload,
  };
}

describe("Event Envelope - Version Consistency", () => {
  it("uses correct version constant for all events", () => {
    expect(REALTIME_EVENT_VERSION).toBe(1);
  });

  it("rejects events with incorrect version", () => {
    const event = {
      id: "event-123",
      version: 2, // Wrong version
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
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("accepts events with correct version", () => {
    const event = {
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
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});

describe("Event Envelope - occurredAt Precedence Rules", () => {
  it("uses occurredAt from payload when present", () => {
    const outboxEvent = {
      id: "event-123",
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      aggregateId: "task-456",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-456",
        employeeId: "emp-789",
        claimedAt: "2026-01-23T10:35:00.000Z",
        occurredAt: "2026-01-23T10:30:00.000Z", // Should use this
      },
      createdAt: new Date("2026-01-23T10:25:00.000Z"), // Not this
    };

    const envelope = buildEventEnvelope(outboxEvent);
    expect(envelope.occurredAt).toBe("2026-01-23T10:30:00.000Z");
  });

  it("falls back to createdAt when occurredAt not in payload", () => {
    const outboxEvent = {
      id: "event-123",
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      aggregateId: "task-456",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-456",
        employeeId: "emp-789",
        claimedAt: "2026-01-23T10:35:00.000Z",
        // No occurredAt in payload
      },
      createdAt: new Date("2026-01-23T10:25:00.000Z"),
    };

    const envelope = buildEventEnvelope(outboxEvent);
    expect(envelope.occurredAt).toBe("2026-01-23T10:25:00.000Z");
  });

  it("ignores occurredAt when payload has occurredAt but it's not a string", () => {
    const outboxEvent = {
      id: "event-123",
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      aggregateId: "task-456",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-456",
        employeeId: "emp-789",
        claimedAt: "2026-01-23T10:35:00.000Z",
        occurredAt: 1_234_567_890, // Not a string, should fall back
      },
      createdAt: new Date("2026-01-23T10:25:00.000Z"),
    };

    const envelope = buildEventEnvelope(outboxEvent);
    expect(envelope.occurredAt).toBe("2026-01-23T10:25:00.000Z");
  });

  it("handles payload without occurredAt field at all", () => {
    const outboxEvent = {
      id: "event-123",
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      aggregateId: "task-456",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-456",
        employeeId: "emp-789",
        claimedAt: "2026-01-23T10:35:00.000Z",
      },
      createdAt: new Date("2026-01-23T10:25:00.000Z"),
    };

    const envelope = buildEventEnvelope(outboxEvent);
    expect(envelope.occurredAt).toBe("2026-01-23T10:25:00.000Z");
  });
});

describe("Event Envelope - Tenant Isolation", () => {
  it("includes tenantId in envelope structure", () => {
    const outboxEvent = {
      id: "event-123",
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      aggregateId: "task-456",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-456",
        employeeId: "emp-789",
        claimedAt: "2026-01-23T10:35:00.000Z",
      },
      createdAt: new Date("2026-01-23T10:25:00.000Z"),
    };

    const envelope = buildEventEnvelope(outboxEvent);
    expect(envelope.tenantId).toBe("tenant-abc");
  });

  it("requires tenantId in base schema", () => {
    const event = {
      id: "event-123",
      version: 1,
      // tenantId missing
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
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects empty tenantId", () => {
    const event = {
      id: "event-123",
      version: 1,
      tenantId: "",
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
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("validates events from different tenants independently", () => {
    const tenant1Event = {
      id: "event-123",
      version: 1,
      tenantId: "tenant-1",
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

    const tenant2Event = {
      id: "event-123",
      version: 1,
      tenantId: "tenant-2",
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

    const result1 = RealtimeEventBaseSchema.safeParse(tenant1Event);
    const result2 = RealtimeEventBaseSchema.safeParse(tenant2Event);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    if (result1.success && result2.success) {
      expect(result1.data.tenantId).toBe("tenant-1");
      expect(result2.data.tenantId).toBe("tenant-2");
    }
  });
});

describe("Event Envelope - Aggregate Information", () => {
  it("includes aggregateType in envelope", () => {
    const outboxEvent = {
      id: "event-123",
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      aggregateId: "task-456",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-456",
        employeeId: "emp-789",
        claimedAt: "2026-01-23T10:35:00.000Z",
      },
      createdAt: new Date("2026-01-23T10:25:00.000Z"),
    };

    const envelope = buildEventEnvelope(outboxEvent);
    expect(envelope.aggregateType).toBe("KitchenTask");
  });

  it("includes aggregateId in envelope", () => {
    const outboxEvent = {
      id: "event-123",
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      aggregateId: "task-456",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-456",
        employeeId: "emp-789",
        claimedAt: "2026-01-23T10:35:00.000Z",
      },
      createdAt: new Date("2026-01-23T10:25:00.000Z"),
    };

    const envelope = buildEventEnvelope(outboxEvent);
    expect(envelope.aggregateId).toBe("task-456");
  });

  it("requires aggregateType in base schema", () => {
    const event = {
      id: "event-123",
      version: 1,
      tenantId: "tenant-abc",
      // aggregateType missing
      aggregateId: "task-456",
      occurredAt: "2026-01-23T10:30:00.000Z",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-456",
        employeeId: "emp-789",
        claimedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("requires aggregateId in base schema", () => {
    const event = {
      id: "event-123",
      version: 1,
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      // aggregateId missing
      occurredAt: "2026-01-23T10:30:00.000Z",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-456",
        employeeId: "emp-789",
        claimedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("Event Envelope - Event ID", () => {
  it("includes id in envelope", () => {
    const outboxEvent = {
      id: "event-123",
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      aggregateId: "task-456",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-456",
        employeeId: "emp-789",
        claimedAt: "2026-01-23T10:35:00.000Z",
      },
      createdAt: new Date("2026-01-23T10:25:00.000Z"),
    };

    const envelope = buildEventEnvelope(outboxEvent);
    expect(envelope.id).toBe("event-123");
  });

  it("requires id in base schema", () => {
    const event = {
      // id missing
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
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const event = {
      id: "",
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
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("Event Envelope - Payload Handling", () => {
  it("preserves payload structure in envelope", () => {
    const payload = {
      taskId: "task-456",
      employeeId: "emp-789",
      claimedAt: "2026-01-23T10:35:00.000Z",
      metadata: { priority: "high", tags: ["urgent"] },
    };

    const outboxEvent = {
      id: "event-123",
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      aggregateId: "task-456",
      eventType: "kitchen.task.claimed",
      payload,
      createdAt: new Date("2026-01-23T10:25:00.000Z"),
    };

    const envelope = buildEventEnvelope(outboxEvent);
    expect(envelope.payload).toEqual(payload);
  });

  it("handles null payload", () => {
    const outboxEvent = {
      id: "event-123",
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      aggregateId: "task-456",
      eventType: "kitchen.task.claimed",
      payload: null,
      createdAt: new Date("2026-01-23T10:25:00.000Z"),
    };

    const envelope = buildEventEnvelope(outboxEvent);
    expect(envelope.payload).toBeNull();
  });

  it("handles undefined payload", () => {
    const outboxEvent = {
      id: "event-123",
      tenantId: "tenant-abc",
      aggregateType: "KitchenTask",
      aggregateId: "task-456",
      eventType: "kitchen.task.claimed",
      payload: undefined,
      createdAt: new Date("2026-01-23T10:25:00.000Z"),
    };

    const envelope = buildEventEnvelope(outboxEvent);
    expect(envelope.payload).toBeUndefined();
  });
});

describe("Event Envelope - Full Integration", () => {
  it("builds complete valid envelope", () => {
    const outboxEvent = {
      id: "evt-abc123",
      tenantId: "tenant-xyz",
      aggregateType: "KitchenTask",
      aggregateId: "task-def456",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-def456",
        employeeId: "emp-ghi789",
        claimedAt: "2026-01-23T10:35:00.000Z",
      },
      createdAt: new Date("2026-01-23T10:25:00.000Z"),
    };

    const envelope = buildEventEnvelope(outboxEvent);

    // Verify all fields
    expect(envelope.id).toBe("evt-abc123");
    expect(envelope.version).toBe(REALTIME_EVENT_VERSION);
    expect(envelope.tenantId).toBe("tenant-xyz");
    expect(envelope.aggregateType).toBe("KitchenTask");
    expect(envelope.aggregateId).toBe("task-def456");
    expect(envelope.occurredAt).toBe("2026-01-23T10:25:00.000Z"); // From createdAt
    expect(envelope.eventType).toBe("kitchen.task.claimed");
    expect(envelope.payload).toEqual(outboxEvent.payload);
  });

  it("validates complete envelope using parseRealtimeEvent", () => {
    const outboxEvent = {
      id: "evt-abc123",
      tenantId: "tenant-xyz",
      aggregateType: "KitchenTask",
      aggregateId: "task-def456",
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: "task-def456",
        employeeId: "emp-ghi789",
        claimedAt: "2026-01-23T10:35:00.000Z",
      },
      createdAt: new Date("2026-01-23T10:25:00.000Z"),
    };

    const envelope = buildEventEnvelope(outboxEvent);
    const result = parseRealtimeEvent(envelope);

    expect(result.success).toBe(true);
  });
});
