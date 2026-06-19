import { describe, expect, it } from "vitest";
import {
  eventUpdatedBoardSyncHandler,
} from "../async-reactions/handlers/event-updated-board-sync-handler.js";
import {
  shipmentItemReceivedInventoryRestockHandler,
} from "../async-reactions/handlers/shipment-item-received-inventory-restock-handler.js";
import type {
  AsyncReactionHandlerContext,
  AsyncReactionJob,
} from "../async-reactions/types.js";

function makeJob(overrides: Partial<AsyncReactionJob>): AsyncReactionJob {
  return {
    id: "job-1",
    tenantId: "t1",
    actorId: "u1",
    reactionName: "test",
    triggeringEvent: { name: "TestEvent", payload: {}, subjectId: "src-1" },
    status: "running",
    attempts: 1,
    maxAttempts: 5,
    initialBackoffMs: 1000,
    maxBackoffMs: 60_000,
    nextAttemptAt: Date.now(),
    lastError: null,
    enqueuedAt: Date.now(),
    ...overrides,
  };
}

function makeCtx(overrides: Partial<AsyncReactionHandlerContext>): AsyncReactionHandlerContext {
  return {
    job: makeJob({}),
    dispatchCommand: async () => ({ success: true }),
    storeProvider: () => undefined,
    log: { info: () => undefined, warn: () => undefined, error: () => undefined },
    captureException: () => undefined,
    ...overrides,
  };
}

describe("eventUpdatedBoardSyncHandler", () => {
  it("loads the Event + boards and fans out syncFromEvent per board", async () => {
    const dispatched: Array<{
      commandName: string;
      entityName?: string;
      instanceId?: string;
      input: Record<string, unknown>;
    }> = [];

    const boards = [
      { id: "b1", tenantId: "t1", eventId: "e1", deletedAt: null },
      { id: "b2", tenantId: "t1", eventId: "e1", deletedAt: null },
      { id: "b3", tenantId: "t1", eventId: "other", deletedAt: null }, // filtered out
      { id: "b4", tenantId: "t1", eventId: "e1", deletedAt: new Date() }, // filtered out (deleted)
    ];

    const ctx = makeCtx({
      job: makeJob({
        tenantId: "t1",
        triggeringEvent: {
          name: "EventUpdated",
          subjectId: "e1",
          subjectEntity: "Event",
          payload: {},
        },
      }),
      storeProvider: (entityName: string) => {
        if (entityName === "Event") {
          return {
            getAll: async () => [],
            getById: async () => ({
              id: "e1",
              tenantId: "t1",
              eventDate: 1_700_000_000_000,
              clientId: "c1",
              guestCount: 100,
              venueName: "V",
              venueAddress: "A",
              locationId: "L1",
            }),
          };
        }
        if (entityName === "BattleBoard") {
          return {
            getAll: async () => boards,
            getById: async () => undefined,
          };
        }
        return undefined;
      },
      dispatchCommand: async (commandName, input, options) => {
        dispatched.push({ commandName, entityName: options.entityName, instanceId: options.instanceId, input });
        return { success: true };
      },
    });

    await eventUpdatedBoardSyncHandler(ctx);

    expect(dispatched).toEqual([
      {
        commandName: "syncFromEvent",
        entityName: "BattleBoard",
        instanceId: "b1",
        input: expect.objectContaining({ clientId: "c1", guestCount: 100 }),
      },
      {
        commandName: "syncFromEvent",
        entityName: "BattleBoard",
        instanceId: "b2",
        input: expect.objectContaining({ clientId: "c1", guestCount: 100 }),
      },
    ]);
    expect(dispatched).toHaveLength(2); // b3 (other event) + b4 (deleted) filtered
  });

  it("skips silently when the Event has no linked boards", async () => {
    const dispatched: unknown[] = [];
    const ctx = makeCtx({
      job: makeJob({
        tenantId: "t1",
        triggeringEvent: { name: "EventUpdated", subjectId: "e1", payload: {} },
      }),
      storeProvider: (entityName: string) => {
        if (entityName === "Event") {
          return {
            getAll: async () => [],
            getById: async () => ({ id: "e1", tenantId: "t1" }),
          };
        }
        if (entityName === "BattleBoard") {
          return { getAll: async () => [], getById: async () => undefined };
        }
        return undefined;
      },
      dispatchCommand: async () => {
        dispatched.push("called");
        return { success: true };
      },
    });
    await eventUpdatedBoardSyncHandler(ctx);
    expect(dispatched).toEqual([]);
  });

  it("throws when the Event store is unavailable (worker will retry/DLQ)", async () => {
    const ctx = makeCtx({
      storeProvider: () => undefined,
    });
    await expect(eventUpdatedBoardSyncHandler(ctx)).rejects.toThrow(
      /Event store unavailable/
    );
  });

  it("throws when ALL board dispatches fail (surfaces for retry/DLQ)", async () => {
    const ctx = makeCtx({
      job: makeJob({
        tenantId: "t1",
        triggeringEvent: { name: "EventUpdated", subjectId: "e1", payload: {} },
      }),
      storeProvider: (entityName: string) => {
        if (entityName === "Event") {
          return {
            getAll: async () => [],
            getById: async () => ({ id: "e1", tenantId: "t1" }),
          };
        }
        if (entityName === "BattleBoard") {
          return {
            getAll: async () => [
              { id: "b1", tenantId: "t1", eventId: "e1", deletedAt: null },
            ],
            getById: async () => undefined,
          };
        }
        return undefined;
      },
      dispatchCommand: async () => ({ success: false, error: "boom" }),
    });
    await expect(eventUpdatedBoardSyncHandler(ctx)).rejects.toThrow(
      /failed for all 1 board/
    );
  });

  it("skips when subjectId is missing (no event to sync from)", async () => {
    const dispatched: unknown[] = [];
    const ctx = makeCtx({
      job: makeJob({
        triggeringEvent: { name: "EventUpdated", payload: {} }, // no subjectId
      }),
      dispatchCommand: async () => {
        dispatched.push("called");
        return { success: true };
      },
    });
    await eventUpdatedBoardSyncHandler(ctx);
    expect(dispatched).toEqual([]);
  });
});

describe("shipmentItemReceivedInventoryRestockHandler", () => {
  it("loads ShipmentItem + InventoryItem and dispatches restock with the line's unitCost", async () => {
    const dispatched: Array<{
      commandName: string;
      input: Record<string, unknown>;
      idempotencyKey?: string;
    }> = [];

    const ctx = makeCtx({
      job: makeJob({
        tenantId: "t1",
        reactionName: "shipmentItemReceivedInventoryRestock",
        idempotencyKey: "shipment-restock:t1:si1",
        triggeringEvent: {
          name: "ShipmentItemReceived",
          subjectId: "si1",
          subjectEntity: "ShipmentItem",
          payload: { quantityReceived: 10, userId: "u1" },
        },
      }),
      storeProvider: (entityName: string) => {
        if (entityName === "ShipmentItem") {
          return { getById: async () => ({ itemId: "inv1", unitCost: "4.50" }) };
        }
        if (entityName === "InventoryItem") {
          return { getById: async () => ({ unitCost: "9.99" }) };
        }
        return undefined;
      },
      dispatchCommand: async (commandName, input, options) => {
        dispatched.push({
          commandName,
          input,
          idempotencyKey: options.idempotencyKey,
        });
        return { success: true };
      },
    });

    await shipmentItemReceivedInventoryRestockHandler(ctx);

    expect(dispatched).toEqual([
      {
        commandName: "restock",
        input: expect.objectContaining({
          id: "inv1",
          quantity: 10,
          costPerUnit: 4.5, // ShipmentItem.unitCost wins
          userId: "u1",
        }),
        idempotencyKey: "shipment-restock:t1:si1",
      },
    ]);
  });

  it("preserves the InventoryItem's existing unitCost when the line has none (no zero-corruption)", async () => {
    const dispatched: Array<{ input: Record<string, unknown> }> = [];
    const ctx = makeCtx({
      job: makeJob({
        tenantId: "t1",
        triggeringEvent: {
          name: "ShipmentItemReceived",
          subjectId: "si1",
          payload: { quantityReceived: 5 },
        },
      }),
      storeProvider: (entityName: string) => {
        if (entityName === "ShipmentItem") {
          return { getById: async () => ({ itemId: "inv1", unitCost: 0 }) };
        }
        if (entityName === "InventoryItem") {
          return { getById: async () => ({ unitCost: "7.25" }) };
        }
        return undefined;
      },
      dispatchCommand: async (_commandName, input) => {
        dispatched.push({ input });
        return { success: true };
      },
    });

    await shipmentItemReceivedInventoryRestockHandler(ctx);

    expect(dispatched[0]?.input.costPerUnit).toBe(7.25);
  });

  it("skips when quantityReceived is zero (legitimate no-op)", async () => {
    const dispatched: unknown[] = [];
    const ctx = makeCtx({
      job: makeJob({
        tenantId: "t1",
        triggeringEvent: {
          name: "ShipmentItemReceived",
          subjectId: "si1",
          payload: { quantityReceived: 0 },
        },
      }),
      dispatchCommand: async () => {
        dispatched.push("called");
        return { success: true };
      },
    });
    await shipmentItemReceivedInventoryRestockHandler(ctx);
    expect(dispatched).toEqual([]);
  });

  it("throws when ShipmentItem is missing (worker will retry/DLQ)", async () => {
    const ctx = makeCtx({
      job: makeJob({
        tenantId: "t1",
        triggeringEvent: {
          name: "ShipmentItemReceived",
          subjectId: "missing",
          payload: { quantityReceived: 5 },
        },
      }),
      storeProvider: (entityName: string) => {
        if (entityName === "ShipmentItem") {
          return { getById: async () => undefined };
        }
        if (entityName === "InventoryItem") {
          return { getById: async () => undefined };
        }
        return undefined;
      },
    });
    await expect(shipmentItemReceivedInventoryRestockHandler(ctx)).rejects.toThrow(
      /ShipmentItem not found/
    );
  });

  it("throws when InventoryItem.restock fails (governed dispatch error surfaces)", async () => {
    const ctx = makeCtx({
      job: makeJob({
        tenantId: "t1",
        triggeringEvent: {
          name: "ShipmentItemReceived",
          subjectId: "si1",
          payload: { quantityReceived: 5 },
        },
      }),
      storeProvider: (entityName: string) => {
        if (entityName === "ShipmentItem") {
          return { getById: async () => ({ itemId: "inv1", unitCost: 1 }) };
        }
        if (entityName === "InventoryItem") {
          return { getById: async () => ({ unitCost: 1 }) };
        }
        return undefined;
      },
      dispatchCommand: async () => ({ success: false, error: "guard failed" }),
    });
    await expect(shipmentItemReceivedInventoryRestockHandler(ctx)).rejects.toThrow(
      /InventoryItem.restock failed/
    );
  });
});
