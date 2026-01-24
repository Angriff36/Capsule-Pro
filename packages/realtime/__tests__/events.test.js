/**
 * Unit tests for event schemas and types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const events_1 = require("../src/events");
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
};
(0, vitest_1.describe)("RealtimeEventBaseSchema", () => {
  (0, vitest_1.it)("validates correct base fields", () => {
    const result =
      events_1.RealtimeEventBaseSchema.safeParse(validClaimedEvent);
    (0, vitest_1.expect)(result.success).toBe(true);
  });
  (0, vitest_1.it)("rejects invalid version", () => {
    const event = { ...validClaimedEvent, version: 2 };
    const result = events_1.RealtimeEventBaseSchema.safeParse(event);
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects missing id", () => {
    const event = { ...validClaimedEvent, id: "" };
    const result = events_1.RealtimeEventBaseSchema.safeParse(event);
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects invalid occurredAt timestamp", () => {
    const event = { ...validClaimedEvent, occurredAt: "not-a-date" };
    const result = events_1.RealtimeEventBaseSchema.safeParse(event);
    (0, vitest_1.expect)(result.success).toBe(false);
  });
});
(0, vitest_1.describe)("KitchenTaskClaimedEventSchema", () => {
  (0, vitest_1.it)("validates correct payload", () => {
    const result =
      events_1.KitchenTaskClaimedEventSchema.safeParse(validClaimedEvent);
    (0, vitest_1.expect)(result.success).toBe(true);
    if (result.success) {
      (0, vitest_1.expect)(result.data.eventType).toBe("kitchen.task.claimed");
      (0, vitest_1.expect)(result.data.payload.taskId).toBe("task-123");
    }
  });
  (0, vitest_1.it)("rejects missing taskId", () => {
    const event = {
      ...validClaimedEvent,
      payload: { ...validClaimedEvent.payload, taskId: "" },
    };
    const result = events_1.KitchenTaskClaimedEventSchema.safeParse(event);
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects missing employeeId", () => {
    const event = {
      ...validClaimedEvent,
      payload: { ...validClaimedEvent.payload, employeeId: "" },
    };
    const result = events_1.KitchenTaskClaimedEventSchema.safeParse(event);
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects invalid claimedAt timestamp", () => {
    const event = {
      ...validClaimedEvent,
      payload: { ...validClaimedEvent.payload, claimedAt: "invalid" },
    };
    const result = events_1.KitchenTaskClaimedEventSchema.safeParse(event);
    (0, vitest_1.expect)(result.success).toBe(false);
  });
});
(0, vitest_1.describe)("KitchenTaskReleasedEventSchema", () => {
  (0, vitest_1.it)("validates correct released event", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.released",
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        releasedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = events_1.KitchenTaskReleasedEventSchema.safeParse(event);
    (0, vitest_1.expect)(result.success).toBe(true);
  });
  (0, vitest_1.it)("rejects missing releasedAt", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.released",
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        releasedAt: "",
      },
    };
    const result = events_1.KitchenTaskReleasedEventSchema.safeParse(event);
    (0, vitest_1.expect)(result.success).toBe(false);
  });
});
(0, vitest_1.describe)("KitchenTaskProgressEventSchema", () => {
  (0, vitest_1.it)("validates correct progress event", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.progress",
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        progressPercent: 50,
        updatedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = events_1.KitchenTaskProgressEventSchema.safeParse(event);
    (0, vitest_1.expect)(result.success).toBe(true);
  });
  (0, vitest_1.it)("rejects progressPercent out of range (>100)", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.progress",
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        progressPercent: 150,
        updatedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = events_1.KitchenTaskProgressEventSchema.safeParse(event);
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("rejects progressPercent out of range (<0)", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.progress",
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        progressPercent: -10,
        updatedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = events_1.KitchenTaskProgressEventSchema.safeParse(event);
    (0, vitest_1.expect)(result.success).toBe(false);
  });
});
(0, vitest_1.describe)("parseRealtimeEvent", () => {
  (0, vitest_1.it)("validates claimed event using discriminated union", () => {
    const result = (0, events_1.parseRealtimeEvent)(validClaimedEvent);
    (0, vitest_1.expect)(result.success).toBe(true);
  });
  (0, vitest_1.it)("validates released event using discriminated union", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.released",
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        releasedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = (0, events_1.parseRealtimeEvent)(event);
    (0, vitest_1.expect)(result.success).toBe(true);
  });
  (0, vitest_1.it)("validates progress event using discriminated union", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.progress",
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        progressPercent: 50,
        updatedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = (0, events_1.parseRealtimeEvent)(event);
    (0, vitest_1.expect)(result.success).toBe(true);
  });
  (0, vitest_1.it)("rejects unknown event type", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "unknown.event",
    };
    const result = (0, events_1.parseRealtimeEvent)(event);
    (0, vitest_1.expect)(result.success).toBe(false);
  });
  (0, vitest_1.it)("returns error details for invalid event", () => {
    const event = {
      ...validClaimedEvent,
      id: "", // Invalid: empty id
    };
    const result = (0, events_1.parseRealtimeEvent)(event);
    (0, vitest_1.expect)(result.success).toBe(false);
    if (!result.success) {
      (0, vitest_1.expect)(result.error).toBeDefined();
      (0, vitest_1.expect)(result.error.issues).toBeInstanceOf(Array);
    }
  });
});
