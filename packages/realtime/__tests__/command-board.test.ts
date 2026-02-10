/**
 * Unit tests for Command Board event schemas and types.
 */

import { describe, expect, it } from "vitest";
import {
  type CommandBoardCardCreatedEvent,
  CommandBoardCardCreatedEventSchema,
  CommandBoardCardDeletedEventSchema,
  CommandBoardCardMovedEventSchema,
  CommandBoardCardUpdatedEventSchema,
  CommandBoardCursorMovedEventSchema,
  CommandBoardUpdatedEventSchema,
  CommandBoardUserJoinedEventSchema,
  CommandBoardUserLeftEventSchema,
  isCommandBoardEvent,
  parseRealtimeEvent,
} from "../src/events";

const validCardCreatedEvent = {
  id: "clxyz123",
  version: 1 as const,
  tenantId: "tenant-abc",
  aggregateType: "CommandBoardCard",
  aggregateId: "card-123",
  occurredAt: "2026-01-23T10:30:00.000Z",
  eventType: "command.board.card.created" as const,
  payload: {
    boardId: "board-456",
    cardId: "card-123",
    cardType: "task",
    title: "Test Task",
    positionX: 100,
    positionY: 200,
    createdBy: "user-789",
    createdAt: "2026-01-23T10:30:00.000Z",
  },
} satisfies CommandBoardCardCreatedEvent;

describe("CommandBoardCardCreatedEventSchema", () => {
  it("validates correct payload", () => {
    const result = CommandBoardCardCreatedEventSchema.safeParse(
      validCardCreatedEvent
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventType).toBe("command.board.card.created");
      expect(result.data.payload.cardId).toBe("card-123");
      expect(result.data.payload.cardType).toBe("task");
    }
  });

  it("rejects missing boardId", () => {
    const event = {
      ...validCardCreatedEvent,
      payload: { ...validCardCreatedEvent.payload, boardId: "" },
    };
    const result = CommandBoardCardCreatedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects missing cardId", () => {
    const event = {
      ...validCardCreatedEvent,
      payload: { ...validCardCreatedEvent.payload, cardId: "" },
    };
    const result = CommandBoardCardCreatedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects invalid position coordinates (non-number)", () => {
    const event = {
      ...validCardCreatedEvent,
      payload: {
        ...validCardCreatedEvent.payload,
        positionX: "invalid" as unknown as number,
      },
    };
    const result = CommandBoardCardCreatedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("accepts valid position coordinates including negative values", () => {
    const event = {
      ...validCardCreatedEvent,
      payload: {
        ...validCardCreatedEvent.payload,
        positionX: -50,
        positionY: -100,
      },
    };
    const result = CommandBoardCardCreatedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects missing createdBy", () => {
    const event = {
      ...validCardCreatedEvent,
      payload: { ...validCardCreatedEvent.payload, createdBy: "" },
    };
    const result = CommandBoardCardCreatedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects invalid createdAt timestamp", () => {
    const event = {
      ...validCardCreatedEvent,
      payload: {
        ...validCardCreatedEvent.payload,
        createdAt: "invalid-date",
      },
    };
    const result = CommandBoardCardCreatedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("accepts empty title (titles can be empty)", () => {
    const event = {
      ...validCardCreatedEvent,
      payload: { ...validCardCreatedEvent.payload, title: "" },
    };
    const result = CommandBoardCardCreatedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});

describe("CommandBoardCardUpdatedEventSchema", () => {
  it("validates correct updated event", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.updated" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        changes: { title: "Updated Task", status: "in_progress" },
        updatedBy: "user-789",
        updatedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCardUpdatedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("accepts empty changes object", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.updated" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        changes: {},
        updatedBy: "user-789",
        updatedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCardUpdatedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("accepts complex changes with nested objects", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.updated" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        changes: {
          metadata: { priority: "high", tags: ["urgent", "client-request"] },
          position: { x: 150, y: 250 },
        },
        updatedBy: "user-789",
        updatedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCardUpdatedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects missing updatedBy", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.updated" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        changes: {},
        updatedBy: "",
        updatedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCardUpdatedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("CommandBoardCardMovedEventSchema", () => {
  it("validates correct moved event", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.moved" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        previousPosition: { x: 100, y: 200 },
        newPosition: { x: 150, y: 250 },
        movedBy: "user-789",
        movedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCardMovedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects missing previousPosition", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.moved" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        previousPosition: null as unknown as { x: number; y: number },
        newPosition: { x: 150, y: 250 },
        movedBy: "user-789",
        movedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCardMovedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects invalid position object (missing y)", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.moved" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        previousPosition: { x: 100 } as unknown as { x: number; y: number },
        newPosition: { x: 150, y: 250 },
        movedBy: "user-789",
        movedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCardMovedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("accepts zero as valid position value", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.moved" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        previousPosition: { x: 0, y: 0 },
        newPosition: { x: 0, y: 0 },
        movedBy: "user-789",
        movedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCardMovedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});

describe("CommandBoardCardDeletedEventSchema", () => {
  it("validates correct deleted event", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.deleted" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        deletedBy: "user-789",
        deletedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCardDeletedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects missing deletedBy", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.deleted" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        deletedBy: "",
        deletedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCardDeletedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects invalid deletedAt timestamp", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.deleted" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        deletedBy: "user-789",
        deletedAt: "not-a-date",
      },
    };
    const result = CommandBoardCardDeletedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("CommandBoardUpdatedEventSchema", () => {
  it("validates correct board updated event", () => {
    const event = {
      ...validCardCreatedEvent,
      aggregateType: "CommandBoard" as const,
      aggregateId: "board-456",
      eventType: "command.board.updated" as const,
      payload: {
        boardId: "board-456",
        name: "Updated Board Name",
        changes: { name: "New Name", description: "Updated description" },
        updatedBy: "user-789",
        updatedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardUpdatedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("accepts empty name", () => {
    const event = {
      ...validCardCreatedEvent,
      aggregateType: "CommandBoard" as const,
      aggregateId: "board-456",
      eventType: "command.board.updated" as const,
      payload: {
        boardId: "board-456",
        name: "",
        changes: { description: "Updated description" },
        updatedBy: "user-789",
        updatedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardUpdatedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});

describe("CommandBoardUserJoinedEventSchema", () => {
  it("validates correct user joined event", () => {
    const event = {
      ...validCardCreatedEvent,
      aggregateType: "CommandBoard" as const,
      aggregateId: "board-456",
      eventType: "command.board.user.joined" as const,
      payload: {
        boardId: "board-456",
        userId: "user-789",
        userName: "John Doe",
        joinedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardUserJoinedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("accepts empty userName", () => {
    const event = {
      ...validCardCreatedEvent,
      aggregateType: "CommandBoard" as const,
      aggregateId: "board-456",
      eventType: "command.board.user.joined" as const,
      payload: {
        boardId: "board-456",
        userId: "user-789",
        userName: "",
        joinedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardUserJoinedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects missing userId", () => {
    const event = {
      ...validCardCreatedEvent,
      aggregateType: "CommandBoard" as const,
      aggregateId: "board-456",
      eventType: "command.board.user.joined" as const,
      payload: {
        boardId: "board-456",
        userId: "",
        userName: "John Doe",
        joinedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardUserJoinedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("CommandBoardUserLeftEventSchema", () => {
  it("validates correct user left event", () => {
    const event = {
      ...validCardCreatedEvent,
      aggregateType: "CommandBoard" as const,
      aggregateId: "board-456",
      eventType: "command.board.user.left" as const,
      payload: {
        boardId: "board-456",
        userId: "user-789",
        leftAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardUserLeftEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects missing userId", () => {
    const event = {
      ...validCardCreatedEvent,
      aggregateType: "CommandBoard" as const,
      aggregateId: "board-456",
      eventType: "command.board.user.left" as const,
      payload: {
        boardId: "board-456",
        userId: "",
        leftAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardUserLeftEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects invalid leftAt timestamp", () => {
    const event = {
      ...validCardCreatedEvent,
      aggregateType: "CommandBoard" as const,
      aggregateId: "board-456",
      eventType: "command.board.user.left" as const,
      payload: {
        boardId: "board-456",
        userId: "user-789",
        leftAt: "invalid-timestamp",
      },
    };
    const result = CommandBoardUserLeftEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("CommandBoardCursorMovedEventSchema", () => {
  it("validates correct cursor moved event", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.cursor.moved" as const,
      payload: {
        boardId: "board-456",
        userId: "user-789",
        position: { x: 250, y: 300 },
        movedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCursorMovedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("accepts negative cursor positions", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.cursor.moved" as const,
      payload: {
        boardId: "board-456",
        userId: "user-789",
        position: { x: -10, y: -20 },
        movedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCursorMovedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects invalid position object", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.cursor.moved" as const,
      payload: {
        boardId: "board-456",
        userId: "user-789",
        position: { x: "invalid" as unknown as number, y: 300 },
        movedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = CommandBoardCursorMovedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("parseRealtimeEvent - Command Board Events", () => {
  it("validates card created event using discriminated union", () => {
    const result = parseRealtimeEvent(validCardCreatedEvent);
    expect(result.success).toBe(true);
  });

  it("validates card updated event using discriminated union", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.updated" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        changes: {},
        updatedBy: "user-789",
        updatedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(true);
  });

  it("validates card moved event using discriminated union", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.moved" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        previousPosition: { x: 100, y: 200 },
        newPosition: { x: 150, y: 250 },
        movedBy: "user-789",
        movedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(true);
  });

  it("validates card deleted event using discriminated union", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.card.deleted" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        deletedBy: "user-789",
        deletedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(true);
  });

  it("validates board updated event using discriminated union", () => {
    const event = {
      ...validCardCreatedEvent,
      aggregateType: "CommandBoard" as const,
      aggregateId: "board-456",
      eventType: "command.board.updated" as const,
      payload: {
        boardId: "board-456",
        name: "Board Name",
        changes: {},
        updatedBy: "user-789",
        updatedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(true);
  });

  it("validates user joined event using discriminated union", () => {
    const event = {
      ...validCardCreatedEvent,
      aggregateType: "CommandBoard" as const,
      aggregateId: "board-456",
      eventType: "command.board.user.joined" as const,
      payload: {
        boardId: "board-456",
        userId: "user-789",
        userName: "John Doe",
        joinedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(true);
  });

  it("validates user left event using discriminated union", () => {
    const event = {
      ...validCardCreatedEvent,
      aggregateType: "CommandBoard" as const,
      aggregateId: "board-456",
      eventType: "command.board.user.left" as const,
      payload: {
        boardId: "board-456",
        userId: "user-789",
        leftAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(true);
  });

  it("validates cursor moved event using discriminated union", () => {
    const event = {
      ...validCardCreatedEvent,
      eventType: "command.board.cursor.moved" as const,
      payload: {
        boardId: "board-456",
        userId: "user-789",
        position: { x: 250, y: 300 },
        movedAt: "2026-01-23T11:00:00.000Z",
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(true);
  });
});

describe("isCommandBoardEvent", () => {
  it("returns true for valid command board events", () => {
    const result = isCommandBoardEvent(validCardCreatedEvent);
    expect(result).toBe(true);
  });

  it("returns false for kitchen events", () => {
    const kitchenEvent = {
      ...validCardCreatedEvent,
      eventType: "kitchen.task.claimed" as const,
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        claimedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = isCommandBoardEvent(kitchenEvent);
    expect(result).toBe(false);
  });

  it("returns false for invalid events", () => {
    const invalidEvent = { foo: "bar" };
    const result = isCommandBoardEvent(invalidEvent);
    expect(result).toBe(false);
  });

  it("identifies all command board event types", () => {
    // Test each event type with its correct payload structure
    const commandBoardEvents = [
      {
        eventType: "command.board.card.created" as const,
        aggregateType: "CommandBoardCard" as const,
        aggregateId: "card-123",
        payload: {
          boardId: "board-456",
          cardId: "card-123",
          cardType: "task",
          title: "Test Task",
          positionX: 100,
          positionY: 200,
          createdBy: "user-789",
          createdAt: "2026-01-23T10:30:00.000Z",
        },
      },
      {
        eventType: "command.board.card.updated" as const,
        aggregateType: "CommandBoardCard" as const,
        aggregateId: "card-123",
        payload: {
          boardId: "board-456",
          cardId: "card-123",
          changes: { title: "Updated Task" },
          updatedBy: "user-789",
          updatedAt: "2026-01-23T10:30:00.000Z",
        },
      },
      {
        eventType: "command.board.card.moved" as const,
        aggregateType: "CommandBoardCard" as const,
        aggregateId: "card-123",
        payload: {
          boardId: "board-456",
          cardId: "card-123",
          previousPosition: { x: 100, y: 200 },
          newPosition: { x: 150, y: 250 },
          movedBy: "user-789",
          movedAt: "2026-01-23T10:30:00.000Z",
        },
      },
      {
        eventType: "command.board.card.deleted" as const,
        aggregateType: "CommandBoardCard" as const,
        aggregateId: "card-123",
        payload: {
          boardId: "board-456",
          cardId: "card-123",
          deletedBy: "user-789",
          deletedAt: "2026-01-23T10:30:00.000Z",
        },
      },
      {
        eventType: "command.board.updated" as const,
        aggregateType: "CommandBoard" as const,
        aggregateId: "board-456",
        payload: {
          boardId: "board-456",
          name: "Board Name",
          changes: {},
          updatedBy: "user-789",
          updatedAt: "2026-01-23T10:30:00.000Z",
        },
      },
      {
        eventType: "command.board.user.joined" as const,
        aggregateType: "CommandBoard" as const,
        aggregateId: "board-456",
        payload: {
          boardId: "board-456",
          userId: "user-789",
          userName: "John Doe",
          joinedAt: "2026-01-23T10:30:00.000Z",
        },
      },
      {
        eventType: "command.board.user.left" as const,
        aggregateType: "CommandBoard" as const,
        aggregateId: "board-456",
        payload: {
          boardId: "board-456",
          userId: "user-789",
          leftAt: "2026-01-23T10:30:00.000Z",
        },
      },
      {
        eventType: "command.board.cursor.moved" as const,
        aggregateType: "CommandBoard" as const,
        aggregateId: "board-456",
        payload: {
          boardId: "board-456",
          userId: "user-789",
          position: { x: 250, y: 300 },
          movedAt: "2026-01-23T10:30:00.000Z",
        },
      },
    ] as const;

    for (const {
      eventType,
      aggregateType,
      aggregateId,
      payload,
    } of commandBoardEvents) {
      const event = {
        id: "clxyz123",
        version: 1 as const,
        tenantId: "tenant-abc",
        aggregateType,
        aggregateId,
        occurredAt: "2026-01-23T10:30:00.000Z",
        eventType,
        payload,
      };
      expect(isCommandBoardEvent(event)).toBe(true);
    }
  });
});
