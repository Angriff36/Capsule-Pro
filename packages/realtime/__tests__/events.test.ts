/**
 * Unit tests for event schemas and types.
 */

import { describe, expect, it } from "vitest";
import {
  type KitchenTaskClaimedEvent,
  KitchenTaskClaimedEventSchema,
  KitchenTaskProgressEventSchema,
  KitchenTaskReleasedEventSchema,
  parseRealtimeEvent,
  RealtimeEventBaseSchema,
} from "../src/events";

const validClaimedEvent = {
  id: "clxyz123",
  version: 1,
  tenantId: "tenant-abc",
  aggregateType: "KitchenTask",
  aggregateId: "task-123",
  occurredAt: "2026-01-23T10:30:00.000Z",
  eventType: "kitchen.task.claimed",
  payload: {
    taskId: "task-123",
    employeeId: "emp-456",
    claimedAt: "2026-01-23T10:30:00.000Z",
  },
} satisfies KitchenTaskClaimedEvent;

describe("RealtimeEventBaseSchema", () => {
  it("validates correct base fields", () => {
    const result = RealtimeEventBaseSchema.safeParse(validClaimedEvent);
    expect(result.success).toBe(true);
  });

  it("rejects invalid version", () => {
    const event = { ...validClaimedEvent, version: 2 };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects missing id", () => {
    const event = { ...validClaimedEvent, id: "" };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects invalid occurredAt timestamp", () => {
    const event = { ...validClaimedEvent, occurredAt: "not-a-date" };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("KitchenTaskClaimedEventSchema", () => {
  it("validates correct payload", () => {
    const result = KitchenTaskClaimedEventSchema.safeParse(validClaimedEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventType).toBe("kitchen.task.claimed");
      expect(result.data.payload.taskId).toBe("task-123");
    }
  });

  it("rejects missing taskId", () => {
    const event = {
      ...validClaimedEvent,
      payload: { ...validClaimedEvent.payload, taskId: "" },
    };
    const result = KitchenTaskClaimedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects missing employeeId", () => {
    const event = {
      ...validClaimedEvent,
      payload: { ...validClaimedEvent.payload, employeeId: "" },
    };
    const result = KitchenTaskClaimedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects invalid claimedAt timestamp", () => {
    const event = {
      ...validClaimedEvent,
      payload: { ...validClaimedEvent.payload, claimedAt: "invalid" },
    };
    const result = KitchenTaskClaimedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("KitchenTaskReleasedEventSchema", () => {
  it("validates correct released event", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.released" as const,
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        releasedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = KitchenTaskReleasedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects missing releasedAt", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.released" as const,
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        releasedAt: "",
      },
    };
    const result = KitchenTaskReleasedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("KitchenTaskProgressEventSchema", () => {
  it("validates correct progress event", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.progress" as const,
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        progressPercent: 50,
        updatedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = KitchenTaskProgressEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects progressPercent out of range (>100)", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.progress" as const,
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        progressPercent: 150,
        updatedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = KitchenTaskProgressEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects progressPercent out of range (<0)", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.progress" as const,
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        progressPercent: -10,
        updatedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = KitchenTaskProgressEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("parseRealtimeEvent", () => {
  it("validates claimed event using discriminated union", () => {
    const result = parseRealtimeEvent(validClaimedEvent);
    expect(result.success).toBe(true);
  });

  it("validates released event using discriminated union", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.released" as const,
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        releasedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(true);
  });

  it("validates progress event using discriminated union", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.progress" as const,
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        progressPercent: 50,
        updatedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(true);
  });

  it("rejects unknown event type", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "unknown.event" as const,
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(false);
  });

  it("returns error details for invalid event", () => {
    const event = {
      ...validClaimedEvent,
      id: "", // Invalid: empty id
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.error.issues).toBeInstanceOf(Array);
    }
  });
});
