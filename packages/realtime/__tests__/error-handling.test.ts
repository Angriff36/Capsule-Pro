/**
 * Unit tests for error handling scenarios in realtime events.
 * Tests invalid event types, missing fields, type coercion, and edge cases.
 */

import { describe, expect, it } from "vitest";
import {
  parseRealtimeEvent,
  RealtimeEventBaseSchema,
  KitchenTaskClaimedEventSchema,
  CommandBoardCardCreatedEventSchema,
  InventoryStockAdjustedEventSchema,
} from "../src/events";

const validClaimedEvent = {
  id: "clxyz123",
  version: 1 as const,
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

describe("Error Handling - Invalid Event Type", () => {
  it("rejects completely unknown event type", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "unknown.event.type",
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(false);
  });

  it("rejects malformed event type (no dots)", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchenclaimed",
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(false);
  });

  it("rejects event type with only one dot segment", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.claimed",
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(false);
  });

  it("rejects event type from wrong domain", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "wrong.module.event",
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(false);
  });

  it("returns error details for unknown event type", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "completely.bogus.event",
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
      expect(result.error.issues).toBeInstanceOf(Array);
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

describe("Error Handling - Missing Required Fields", () => {
  it("rejects event missing id", () => {
    const { id, ...eventWithoutId } = validClaimedEvent;
    const result = RealtimeEventBaseSchema.safeParse(eventWithoutId);
    expect(result.success).toBe(false);
  });

  it("rejects event missing version", () => {
    const { version, ...eventWithoutVersion } = validClaimedEvent;
    const result = RealtimeEventBaseSchema.safeParse(eventWithoutVersion);
    expect(result.success).toBe(false);
  });

  it("rejects event missing tenantId", () => {
    const { tenantId, ...eventWithoutTenant } = validClaimedEvent;
    const result = RealtimeEventBaseSchema.safeParse(eventWithoutTenant);
    expect(result.success).toBe(false);
  });

  it("rejects event missing aggregateType", () => {
    const { aggregateType, ...eventWithoutAggregate } = validClaimedEvent;
    const result = RealtimeEventBaseSchema.safeParse(eventWithoutAggregate);
    expect(result.success).toBe(false);
  });

  it("rejects event missing aggregateId", () => {
    const { aggregateId, ...eventWithoutAggregateId } = validClaimedEvent;
    const result = RealtimeEventBaseSchema.safeParse(eventWithoutAggregateId);
    expect(result.success).toBe(false);
  });

  it("rejects event missing occurredAt", () => {
    const { occurredAt, ...eventWithoutOccurredAt } = validClaimedEvent;
    const result = RealtimeEventBaseSchema.safeParse(eventWithoutOccurredAt);
    expect(result.success).toBe(false);
  });

  it("rejects event missing eventType", () => {
    const { eventType, ...eventWithoutEventType } = validClaimedEvent;
    const result = parseRealtimeEvent(eventWithoutEventType);
    expect(result.success).toBe(false);
  });

  it("rejects event missing payload", () => {
    const { payload, ...eventWithoutPayload } = validClaimedEvent;
    const result = parseRealtimeEvent(eventWithoutPayload);
    expect(result.success).toBe(false);
  });
});

describe("Error Handling - Type Coercion Edge Cases", () => {
  it("rejects id as number instead of string", () => {
    const event = {
      ...validClaimedEvent,
      id: 123 as unknown as string,
    };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects version as string instead of number", () => {
    const event = {
      ...validClaimedEvent,
      version: "1" as unknown as 1,
    };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects occurredAt as Date object instead of ISO string", () => {
    const event = {
      ...validClaimedEvent,
      occurredAt: new Date("2026-01-23T10:30:00.000Z") as unknown as string,
    };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects occurredAt as number (timestamp)", () => {
    const event = {
      ...validClaimedEvent,
      occurredAt: 1705980600000 as unknown as string,
    };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects payload fields with wrong types", () => {
    const event = {
      ...validClaimedEvent,
      payload: {
        taskId: 123 as unknown as string,
        employeeId: "emp-456",
        claimedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = KitchenTaskClaimedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("Error Handling - Empty String Values", () => {
  it("rejects empty id", () => {
    const event = { ...validClaimedEvent, id: "" };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects empty tenantId", () => {
    const event = { ...validClaimedEvent, tenantId: "" };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects empty aggregateType", () => {
    const event = { ...validClaimedEvent, aggregateType: "" };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects empty aggregateId", () => {
    const event = { ...validClaimedEvent, aggregateId: "" };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects empty taskId in payload", () => {
    const event = {
      ...validClaimedEvent,
      payload: { ...validClaimedEvent.payload, taskId: "" },
    };
    const result = KitchenTaskClaimedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects empty employeeId in payload", () => {
    const event = {
      ...validClaimedEvent,
      payload: { ...validClaimedEvent.payload, employeeId: "" },
    };
    const result = KitchenTaskClaimedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects empty boardId in command board payload", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "command.board.card.created" as const,
      payload: {
        boardId: "",
        cardId: "card-123",
        cardType: "task",
        title: "Test",
        positionX: 100,
        positionY: 200,
        createdBy: "user-789",
        createdAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = CommandBoardCardCreatedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects empty stockItemId in stock payload", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "inventory.stock.adjusted" as const,
      payload: {
        stockItemId: "",
        quantity: 10,
        reason: "damage",
        employeeId: "emp-456",
        adjustedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 90,
      },
    };
    const result = InventoryStockAdjustedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("Error Handling - Invalid Timestamp Formats", () => {
  const invalidTimestamps = [
    "not-a-date",
    "2026-13-01T10:30:00.000Z", // Invalid month
    "2026-01-32T10:30:00.000Z", // Invalid day
    "2026-01-01T25:00:00.000Z", // Invalid hour
    "2026-01-01", // Date only, missing time
    "10:30:00", // Time only, missing date
    "2026/01/23T10:30:00.000Z", // Wrong separator
    "2026-01-23 10:30:00", // Missing T and Z
    "", // Empty string
    1234567890, // Unix timestamp as number
    null, // Null value
    undefined, // Undefined
  ] as const;

  invalidTimestamps.forEach((timestamp) => {
    it(`rejects invalid timestamp: ${JSON.stringify(timestamp)}`, () => {
      const event = {
        ...validClaimedEvent,
        occurredAt: timestamp as unknown as string,
      };
      const result = RealtimeEventBaseSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });
});

describe("Error Handling - Invalid Numeric Values", () => {
  it("rejects progressPercent > 100", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.progress" as const,
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        progressPercent: 101,
        updatedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(false);
  });

  it("rejects progressPercent < 0", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.progress" as const,
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        progressPercent: -1,
        updatedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer progressPercent", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "kitchen.task.progress" as const,
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        progressPercent: 50.5,
        updatedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(false);
  });

  it("rejects positionX as string in command board", () => {
    const event = {
      ...validClaimedEvent,
      eventType: "command.board.card.created" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        cardType: "task",
        title: "Test",
        positionX: "100" as unknown as number,
        positionY: 200,
        createdBy: "user-789",
        createdAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = CommandBoardCardCreatedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("Error Handling - Extra Fields", () => {
  it("accepts events with extra fields in base (Zod passthrough)", () => {
    const event = {
      ...validClaimedEvent,
      extraField: "should be ignored",
      anotherField: 123,
    };
    const result = RealtimeEventBaseSchema.safeParse(event);
    // Zod by default strips extra fields, so this should pass
    expect(result.success).toBe(true);
  });

  it("handles extra fields in payload", () => {
    const event = {
      ...validClaimedEvent,
      payload: {
        ...validClaimedEvent.payload,
        extraField: "extra",
        metadata: { key: "value" },
      },
    };
    const result = parseRealtimeEvent(event);
    // Schema defines specific fields, extras may be handled differently
    // This test documents current behavior
    expect(result.success).toBe(true);
  });
});

describe("Error Handling - Null and Undefined Values", () => {
  it("rejects null id", () => {
    const event = { ...validClaimedEvent, id: null as unknown as string };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects undefined tenantId (explicitly passed)", () => {
    const event = {
      ...validClaimedEvent,
      tenantId: undefined as unknown as string,
    };
    const result = RealtimeEventBaseSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects null payload", () => {
    const event = { ...validClaimedEvent, payload: null as unknown as object };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(false);
  });

  it("rejects undefined payload (explicitly passed)", () => {
    const event = {
      ...validClaimedEvent,
      payload: undefined as unknown as object,
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(false);
  });
});

describe("Error Handling - Error Details Structure", () => {
  it("returns ZodError with issues array", () => {
    const event = { ...validClaimedEvent, id: "" };
    const result = RealtimeEventBaseSchema.safeParse(event);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe("ZodError");
      expect(Array.isArray(result.error.issues)).toBe(true);
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("includes field path in error issues", () => {
    const event = { ...validClaimedEvent, id: "" };
    const result = RealtimeEventBaseSchema.safeParse(event);

    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue).toBeDefined();
      expect(issue.path).toContain("id");
    }
  });

  it("includes error message in issues", () => {
    const event = { ...validClaimedEvent, id: "" };
    const result = RealtimeEventBaseSchema.safeParse(event);

    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue).toBeDefined();
      expect(issue.message).toBeDefined();
      expect(typeof issue.message).toBe("string");
    }
  });

  it("includes multiple issues for multiple validation errors", () => {
    const event = {
      ...validClaimedEvent,
      id: "",
      tenantId: "",
      aggregateId: "",
    };
    const result = RealtimeEventBaseSchema.safeParse(event);

    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});
