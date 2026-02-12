/**
 * Zod validation schemas for realtime events.
 * Provides runtime validation for event payloads.
 */

import { z } from "zod";

/**
 * Base schema for all realtime events.
 */
export const RealtimeEventBaseSchema = z.object({
  id: z.string().min(1),
  version: z.literal(1),
  tenantId: z.string().min(1),
  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),
  occurredAt: z.string().datetime(),
});

/**
 * Kitchen event payload schemas.
 */
export const KitchenTaskClaimedPayloadSchema = z.object({
  taskId: z.string().min(1),
  employeeId: z.string().min(1),
  claimedAt: z.string().datetime(),
});

export const KitchenTaskReleasedPayloadSchema = z.object({
  taskId: z.string().min(1),
  employeeId: z.string().min(1),
  releasedAt: z.string().datetime(),
});

export const KitchenTaskProgressPayloadSchema = z.object({
  taskId: z.string().min(1),
  employeeId: z.string().min(1),
  progressPercent: z.number().int().min(0).max(100),
  updatedAt: z.string().datetime(),
});

/**
 * Command Board event payload schemas.
 */
export const CommandBoardCardCreatedPayloadSchema = z.object({
  boardId: z.string().min(1),
  cardId: z.string().min(1),
  cardType: z.string().min(1),
  title: z.string(),
  positionX: z.number(),
  positionY: z.number(),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const CommandBoardCardUpdatedPayloadSchema = z.object({
  boardId: z.string().min(1),
  cardId: z.string().min(1),
  changes: z.record(z.string(), z.unknown()),
  updatedBy: z.string().min(1),
  updatedAt: z.string().datetime(),
});

export const CommandBoardCardMovedPayloadSchema = z.object({
  boardId: z.string().min(1),
  cardId: z.string().min(1),
  previousPosition: z.object({
    x: z.number(),
    y: z.number(),
  }),
  newPosition: z.object({
    x: z.number(),
    y: z.number(),
  }),
  movedBy: z.string().min(1),
  movedAt: z.string().datetime(),
});

export const CommandBoardCardDeletedPayloadSchema = z.object({
  boardId: z.string().min(1),
  cardId: z.string().min(1),
  deletedBy: z.string().min(1),
  deletedAt: z.string().datetime(),
});

export const CommandBoardUpdatedPayloadSchema = z.object({
  boardId: z.string().min(1),
  name: z.string(),
  changes: z.record(z.string(), z.unknown()),
  updatedBy: z.string().min(1),
  updatedAt: z.string().datetime(),
});

export const CommandBoardUserJoinedPayloadSchema = z.object({
  boardId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string(),
  joinedAt: z.string().datetime(),
});

export const CommandBoardUserLeftPayloadSchema = z.object({
  boardId: z.string().min(1),
  userId: z.string().min(1),
  leftAt: z.string().datetime(),
});

export const CommandBoardCursorMovedPayloadSchema = z.object({
  boardId: z.string().min(1),
  userId: z.string().min(1),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  movedAt: z.string().datetime(),
});

/**
 * Command Board Connection event payload schemas.
 */
export const CommandBoardConnectionCreatedPayloadSchema = z.object({
  boardId: z.string().min(1),
  connectionId: z.string().min(1),
  fromCardId: z.string().min(1),
  toCardId: z.string().min(1),
  relationshipType: z.string().min(1),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const CommandBoardConnectionUpdatedPayloadSchema = z.object({
  boardId: z.string().min(1),
  connectionId: z.string().min(1),
  changes: z.record(z.string(), z.unknown()),
  updatedBy: z.string().min(1),
  updatedAt: z.string().datetime(),
});

export const CommandBoardConnectionDeletedPayloadSchema = z.object({
  boardId: z.string().min(1),
  connectionId: z.string().min(1),
  fromCardId: z.string().min(1),
  toCardId: z.string().min(1),
  deletedBy: z.string().min(1),
  deletedAt: z.string().datetime(),
});

/**
 * Stock/Inventory event payload schemas.
 */
export const InventoryStockAdjustedPayloadSchema = z.object({
  stockItemId: z.string().min(1),
  quantity: z.number(),
  reason: z.string(),
  employeeId: z.string().min(1),
  adjustedAt: z.string().datetime(),
  previousQuantity: z.number(),
  newQuantity: z.number(),
});

export const InventoryStockConsumedPayloadSchema = z.object({
  stockItemId: z.string().min(1),
  quantity: z.number(),
  prepTaskId: z.string().min(1),
  employeeId: z.string().min(1),
  consumedAt: z.string().datetime(),
  previousQuantity: z.number(),
  newQuantity: z.number(),
});

export const InventoryStockReceivedPayloadSchema = z.object({
  stockItemId: z.string().min(1),
  quantity: z.number(),
  purchaseOrderLineItemId: z.string().min(1),
  employeeId: z.string().min(1),
  receivedAt: z.string().datetime(),
  previousQuantity: z.number(),
  newQuantity: z.number(),
  supplierId: z.string().optional(),
});

export const InventoryStockWastedPayloadSchema = z.object({
  stockItemId: z.string().min(1),
  quantity: z.number(),
  reason: z.string(),
  employeeId: z.string().min(1),
  wastedAt: z.string().datetime(),
  previousQuantity: z.number(),
  newQuantity: z.number(),
  wasteCategory: z.string().optional(),
});

/**
 * Full event schemas with discriminator - Kitchen events.
 */
export const KitchenTaskClaimedEventSchema = RealtimeEventBaseSchema.extend({
  eventType: z.literal("kitchen.task.claimed"),
  payload: KitchenTaskClaimedPayloadSchema,
});

export const KitchenTaskReleasedEventSchema = RealtimeEventBaseSchema.extend({
  eventType: z.literal("kitchen.task.released"),
  payload: KitchenTaskReleasedPayloadSchema,
});

export const KitchenTaskProgressEventSchema = RealtimeEventBaseSchema.extend({
  eventType: z.literal("kitchen.task.progress"),
  payload: KitchenTaskProgressPayloadSchema,
});

/**
 * Full event schemas with discriminator - Command Board events.
 */
export const CommandBoardCardCreatedEventSchema =
  RealtimeEventBaseSchema.extend({
    eventType: z.literal("command.board.card.created"),
    payload: CommandBoardCardCreatedPayloadSchema,
  });

export const CommandBoardCardUpdatedEventSchema =
  RealtimeEventBaseSchema.extend({
    eventType: z.literal("command.board.card.updated"),
    payload: CommandBoardCardUpdatedPayloadSchema,
  });

export const CommandBoardCardMovedEventSchema = RealtimeEventBaseSchema.extend({
  eventType: z.literal("command.board.card.moved"),
  payload: CommandBoardCardMovedPayloadSchema,
});

export const CommandBoardCardDeletedEventSchema =
  RealtimeEventBaseSchema.extend({
    eventType: z.literal("command.board.card.deleted"),
    payload: CommandBoardCardDeletedPayloadSchema,
  });

export const CommandBoardUpdatedEventSchema = RealtimeEventBaseSchema.extend({
  eventType: z.literal("command.board.updated"),
  payload: CommandBoardUpdatedPayloadSchema,
});

export const CommandBoardUserJoinedEventSchema = RealtimeEventBaseSchema.extend(
  {
    eventType: z.literal("command.board.user.joined"),
    payload: CommandBoardUserJoinedPayloadSchema,
  }
);

export const CommandBoardUserLeftEventSchema = RealtimeEventBaseSchema.extend({
  eventType: z.literal("command.board.user.left"),
  payload: CommandBoardUserLeftPayloadSchema,
});

export const CommandBoardCursorMovedEventSchema =
  RealtimeEventBaseSchema.extend({
    eventType: z.literal("command.board.cursor.moved"),
    payload: CommandBoardCursorMovedPayloadSchema,
  });

/**
 * Full event schemas with discriminator - Command Board Connection events.
 */
export const CommandBoardConnectionCreatedEventSchema =
  RealtimeEventBaseSchema.extend({
    eventType: z.literal("command.board.connection.created"),
    payload: CommandBoardConnectionCreatedPayloadSchema,
  });

export const CommandBoardConnectionUpdatedEventSchema =
  RealtimeEventBaseSchema.extend({
    eventType: z.literal("command.board.connection.updated"),
    payload: CommandBoardConnectionUpdatedPayloadSchema,
  });

export const CommandBoardConnectionDeletedEventSchema =
  RealtimeEventBaseSchema.extend({
    eventType: z.literal("command.board.connection.deleted"),
    payload: CommandBoardConnectionDeletedPayloadSchema,
  });

/**
 * Full event schemas with discriminator - Stock/Inventory events.
 */
export const InventoryStockAdjustedEventSchema = RealtimeEventBaseSchema.extend(
  {
    eventType: z.literal("inventory.stock.adjusted"),
    payload: InventoryStockAdjustedPayloadSchema,
  }
);

export const InventoryStockConsumedEventSchema = RealtimeEventBaseSchema.extend(
  {
    eventType: z.literal("inventory.stock.consumed"),
    payload: InventoryStockConsumedPayloadSchema,
  }
);

export const InventoryStockReceivedEventSchema = RealtimeEventBaseSchema.extend(
  {
    eventType: z.literal("inventory.stock.received"),
    payload: InventoryStockReceivedPayloadSchema,
  }
);

export const InventoryStockWastedEventSchema = RealtimeEventBaseSchema.extend({
  eventType: z.literal("inventory.stock.wasted"),
  payload: InventoryStockWastedPayloadSchema,
});

/**
 * Discriminated union of all event schemas.
 * Use this for validating unknown realtime events.
 */
export const RealtimeEventSchema = z.discriminatedUnion("eventType", [
  KitchenTaskClaimedEventSchema,
  KitchenTaskReleasedEventSchema,
  KitchenTaskProgressEventSchema,
  CommandBoardCardCreatedEventSchema,
  CommandBoardCardUpdatedEventSchema,
  CommandBoardCardMovedEventSchema,
  CommandBoardCardDeletedEventSchema,
  CommandBoardUpdatedEventSchema,
  CommandBoardUserJoinedEventSchema,
  CommandBoardUserLeftEventSchema,
  CommandBoardCursorMovedEventSchema,
  CommandBoardConnectionCreatedEventSchema,
  CommandBoardConnectionUpdatedEventSchema,
  CommandBoardConnectionDeletedEventSchema,
  InventoryStockAdjustedEventSchema,
  InventoryStockConsumedEventSchema,
  InventoryStockReceivedEventSchema,
  InventoryStockWastedEventSchema,
]);

/**
 * Parse and validate a realtime event.
 *
 * @param data - Unknown data to validate
 * @returns Zod parse result with success status and typed data
 */
export function parseRealtimeEvent(data: unknown) {
  return RealtimeEventSchema.safeParse(data);
}

/**
 * Type guard for kitchen events.
 */
export function isKitchenEvent(
  data: unknown
): data is z.infer<typeof RealtimeEventSchema> {
  const result = parseRealtimeEvent(data);
  return result.success;
}

/**
 * Type guard for command board events.
 */
export function isCommandBoardEvent(
  data: unknown
): data is z.infer<typeof RealtimeEventSchema> {
  const result = parseRealtimeEvent(data);
  if (!result.success) {
    return false;
  }
  // Check if event type starts with "command.board."
  return result.data.eventType.startsWith("command.board.");
}

/**
 * Type guard for stock/inventory events.
 */
export function isInventoryStockEvent(
  data: unknown
): data is z.infer<typeof RealtimeEventSchema> {
  const result = parseRealtimeEvent(data);
  if (!result.success) {
    return false;
  }
  // Check if event type starts with "inventory.stock."
  return result.data.eventType.startsWith("inventory.stock.");
}
