/**
 * Unit tests for Stock/Inventory event schemas and types.
 */

import { describe, expect, it } from "vitest";
import {
  type InventoryStockAdjustedEvent,
  InventoryStockAdjustedEventSchema,
  InventoryStockConsumedEventSchema,
  InventoryStockReceivedEventSchema,
  InventoryStockWastedEventSchema,
  isInventoryStockEvent,
  parseRealtimeEvent,
} from "../src/events";

const validStockAdjustedEvent = {
  id: "clxyz123",
  version: 1 as const,
  tenantId: "tenant-abc",
  aggregateType: "InventoryStock",
  aggregateId: "stock-123",
  occurredAt: "2026-01-23T10:30:00.000Z",
  eventType: "inventory.stock.adjusted" as const,
  payload: {
    stockItemId: "stock-123",
    quantity: 10,
    reason: "damage",
    employeeId: "emp-456",
    adjustedAt: "2026-01-23T10:30:00.000Z",
    previousQuantity: 100,
    newQuantity: 90,
  },
} satisfies InventoryStockAdjustedEvent;

describe("InventoryStockAdjustedEventSchema", () => {
  it("validates correct payload for increase", () => {
    const event = {
      ...validStockAdjustedEvent,
      payload: {
        ...validStockAdjustedEvent.payload,
        quantity: 15,
        previousQuantity: 100,
        newQuantity: 115,
      },
    };
    const result = InventoryStockAdjustedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventType).toBe("inventory.stock.adjusted");
      expect(result.data.payload.stockItemId).toBe("stock-123");
      expect(result.data.payload.quantity).toBe(15);
    }
  });

  it("validates correct payload for decrease", () => {
    const event = {
      ...validStockAdjustedEvent,
      payload: {
        ...validStockAdjustedEvent.payload,
        quantity: -5,
        previousQuantity: 100,
        newQuantity: 95,
      },
    };
    const result = InventoryStockAdjustedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("accepts zero quantity adjustment", () => {
    const event = {
      ...validStockAdjustedEvent,
      payload: {
        ...validStockAdjustedEvent.payload,
        quantity: 0,
        previousQuantity: 100,
        newQuantity: 100,
      },
    };
    const result = InventoryStockAdjustedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects missing stockItemId", () => {
    const event = {
      ...validStockAdjustedEvent,
      payload: {
        ...validStockAdjustedEvent.payload,
        stockItemId: "",
      },
    };
    const result = InventoryStockAdjustedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("rejects missing employeeId", () => {
    const event = {
      ...validStockAdjustedEvent,
      payload: {
        ...validStockAdjustedEvent.payload,
        employeeId: "",
      },
    };
    const result = InventoryStockAdjustedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("accepts empty reason (optional field with default)", () => {
    const event = {
      ...validStockAdjustedEvent,
      payload: {
        ...validStockAdjustedEvent.payload,
        reason: "",
      },
    };
    const result = InventoryStockAdjustedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects invalid adjustedAt timestamp", () => {
    const event = {
      ...validStockAdjustedEvent,
      payload: {
        ...validStockAdjustedEvent.payload,
        adjustedAt: "invalid-date",
      },
    };
    const result = InventoryStockAdjustedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("validates quantity as number (can be negative)", () => {
    const event = {
      ...validStockAdjustedEvent,
      payload: {
        ...validStockAdjustedEvent.payload,
        quantity: -999.99,
      },
    };
    const result = InventoryStockAdjustedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("validates previousQuantity as number", () => {
    const event = {
      ...validStockAdjustedEvent,
      payload: {
        ...validStockAdjustedEvent.payload,
        previousQuantity: 0,
      },
    };
    const result = InventoryStockAdjustedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("validates newQuantity as number", () => {
    const event = {
      ...validStockAdjustedEvent,
      payload: {
        ...validStockAdjustedEvent.payload,
        newQuantity: 0,
      },
    };
    const result = InventoryStockAdjustedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});

describe("InventoryStockConsumedEventSchema", () => {
  it("validates correct consumed event", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.consumed" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 5,
        prepTaskId: "prep-789",
        employeeId: "emp-456",
        consumedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 95,
      },
    };
    const result = InventoryStockConsumedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventType).toBe("inventory.stock.consumed");
      expect(result.data.payload.prepTaskId).toBe("prep-789");
    }
  });

  it("rejects missing prepTaskId", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.consumed" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 5,
        prepTaskId: "",
        employeeId: "emp-456",
        consumedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 95,
      },
    };
    const result = InventoryStockConsumedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("accepts positive quantity consumed", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.consumed" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 50.5,
        prepTaskId: "prep-789",
        employeeId: "emp-456",
        consumedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 49.5,
      },
    };
    const result = InventoryStockConsumedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects invalid consumedAt timestamp", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.consumed" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 5,
        prepTaskId: "prep-789",
        employeeId: "emp-456",
        consumedAt: "not-a-date",
        previousQuantity: 100,
        newQuantity: 95,
      },
    };
    const result = InventoryStockConsumedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("InventoryStockReceivedEventSchema", () => {
  it("validates correct received event with supplier", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.received" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 50,
        purchaseOrderLineItemId: "po-line-456",
        employeeId: "emp-456",
        receivedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 150,
        supplierId: "supplier-789",
      },
    };
    const result = InventoryStockReceivedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventType).toBe("inventory.stock.received");
      expect(result.data.payload.supplierId).toBe("supplier-789");
    }
  });

  it("validates correct received event without supplier", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.received" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 50,
        purchaseOrderLineItemId: "po-line-456",
        employeeId: "emp-456",
        receivedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 150,
      },
    };
    const result = InventoryStockReceivedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payload.supplierId).toBeUndefined();
    }
  });

  it("rejects missing purchaseOrderLineItemId", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.received" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 50,
        purchaseOrderLineItemId: "",
        employeeId: "emp-456",
        receivedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 150,
      },
    };
    const result = InventoryStockReceivedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("accepts decimal quantity received", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.received" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 25.75,
        purchaseOrderLineItemId: "po-line-456",
        employeeId: "emp-456",
        receivedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 125.75,
      },
    };
    const result = InventoryStockReceivedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects invalid receivedAt timestamp", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.received" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 50,
        purchaseOrderLineItemId: "po-line-456",
        employeeId: "emp-456",
        receivedAt: "invalid",
        previousQuantity: 100,
        newQuantity: 150,
      },
    };
    const result = InventoryStockReceivedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });
});

describe("InventoryStockWastedEventSchema", () => {
  it("validates correct wasted event with category", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.wasted" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 10,
        reason: "Expired items",
        employeeId: "emp-456",
        wastedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 90,
        wasteCategory: "spoilage",
      },
    };
    const result = InventoryStockWastedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventType).toBe("inventory.stock.wasted");
      expect(result.data.payload.wasteCategory).toBe("spoilage");
    }
  });

  it("validates correct wasted event without category", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.wasted" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 10,
        reason: "Expired items",
        employeeId: "emp-456",
        wastedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 90,
      },
    };
    const result = InventoryStockWastedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payload.wasteCategory).toBeUndefined();
    }
  });

  it("accepts empty wasteCategory (optional field)", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.wasted" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 10,
        reason: "Expired items",
        employeeId: "emp-456",
        wastedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 90,
        wasteCategory: "",
      },
    };
    const result = InventoryStockWastedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("accepts empty reason", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.wasted" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 10,
        reason: "",
        employeeId: "emp-456",
        wastedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 90,
      },
    };
    const result = InventoryStockWastedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  it("rejects invalid wastedAt timestamp", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.wasted" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 10,
        reason: "Expired",
        employeeId: "emp-456",
        wastedAt: "not-a-timestamp",
        previousQuantity: 100,
        newQuantity: 90,
      },
    };
    const result = InventoryStockWastedEventSchema.safeParse(event);
    expect(result.success).toBe(false);
  });

  it("validates all standard waste categories", () => {
    const wasteCategories = ["spoilage", "breakage", "theft", "error", "other"];

    for (const category of wasteCategories) {
      const event = {
        ...validStockAdjustedEvent,
        eventType: "inventory.stock.wasted" as const,
        payload: {
          stockItemId: "stock-123",
          quantity: 10,
          reason: "Test",
          employeeId: "emp-456",
          wastedAt: "2026-01-23T10:30:00.000Z",
          previousQuantity: 100,
          newQuantity: 90,
          wasteCategory: category,
        },
      };
      const result = InventoryStockWastedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    }
  });
});

describe("parseRealtimeEvent - Stock Events", () => {
  it("validates stock adjusted event using discriminated union", () => {
    const result = parseRealtimeEvent(validStockAdjustedEvent);
    expect(result.success).toBe(true);
  });

  it("validates stock consumed event using discriminated union", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.consumed" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 5,
        prepTaskId: "prep-789",
        employeeId: "emp-456",
        consumedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 95,
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(true);
  });

  it("validates stock received event using discriminated union", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.received" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 50,
        purchaseOrderLineItemId: "po-line-456",
        employeeId: "emp-456",
        receivedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 150,
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(true);
  });

  it("validates stock wasted event using discriminated union", () => {
    const event = {
      ...validStockAdjustedEvent,
      eventType: "inventory.stock.wasted" as const,
      payload: {
        stockItemId: "stock-123",
        quantity: 10,
        reason: "Expired",
        employeeId: "emp-456",
        wastedAt: "2026-01-23T10:30:00.000Z",
        previousQuantity: 100,
        newQuantity: 90,
      },
    };
    const result = parseRealtimeEvent(event);
    expect(result.success).toBe(true);
  });
});

describe("isInventoryStockEvent", () => {
  it("returns true for valid stock events", () => {
    const result = isInventoryStockEvent(validStockAdjustedEvent);
    expect(result).toBe(true);
  });

  it("returns false for kitchen events", () => {
    const kitchenEvent = {
      ...validStockAdjustedEvent,
      eventType: "kitchen.task.claimed" as const,
      payload: {
        taskId: "task-123",
        employeeId: "emp-456",
        claimedAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = isInventoryStockEvent(kitchenEvent);
    expect(result).toBe(false);
  });

  it("returns false for command board events", () => {
    const commandBoardEvent = {
      ...validStockAdjustedEvent,
      eventType: "command.board.card.created" as const,
      payload: {
        boardId: "board-456",
        cardId: "card-123",
        cardType: "task",
        title: "Test",
        positionX: 100,
        positionY: 200,
        createdBy: "user-789",
        createdAt: "2026-01-23T10:30:00.000Z",
      },
    };
    const result = isInventoryStockEvent(commandBoardEvent);
    expect(result).toBe(false);
  });

  it("returns false for invalid events", () => {
    const invalidEvent = { foo: "bar" };
    const result = isInventoryStockEvent(invalidEvent);
    expect(result).toBe(false);
  });

  it("identifies all stock event types", () => {
    // Test each event type with its correct payload structure
    const stockEvents = [
      {
        eventType: "inventory.stock.adjusted" as const,
        payload: {
          stockItemId: "stock-123",
          quantity: 10,
          reason: "damage",
          employeeId: "emp-456",
          adjustedAt: "2026-01-23T10:30:00.000Z",
          previousQuantity: 100,
          newQuantity: 90,
        },
      },
      {
        eventType: "inventory.stock.consumed" as const,
        payload: {
          stockItemId: "stock-123",
          quantity: 5,
          prepTaskId: "prep-789",
          employeeId: "emp-456",
          consumedAt: "2026-01-23T10:30:00.000Z",
          previousQuantity: 100,
          newQuantity: 95,
        },
      },
      {
        eventType: "inventory.stock.received" as const,
        payload: {
          stockItemId: "stock-123",
          quantity: 50,
          purchaseOrderLineItemId: "po-line-456",
          employeeId: "emp-456",
          receivedAt: "2026-01-23T10:30:00.000Z",
          previousQuantity: 100,
          newQuantity: 150,
        },
      },
      {
        eventType: "inventory.stock.wasted" as const,
        payload: {
          stockItemId: "stock-123",
          quantity: 10,
          reason: "Expired",
          employeeId: "emp-456",
          wastedAt: "2026-01-23T10:30:00.000Z",
          previousQuantity: 100,
          newQuantity: 90,
        },
      },
    ] as const;

    for (const { eventType, payload } of stockEvents) {
      const event = {
        id: "clxyz123",
        version: 1 as const,
        tenantId: "tenant-abc",
        aggregateType: "InventoryStock",
        aggregateId: "stock-123",
        occurredAt: "2026-01-23T10:30:00.000Z",
        eventType,
        payload,
      };
      expect(isInventoryStockEvent(event)).toBe(true);
    }
  });
});
