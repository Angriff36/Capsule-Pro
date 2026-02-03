"use strict";
/**
 * Zod validation schemas for realtime events.
 * Provides runtime validation for event payloads.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeEventSchema = exports.CommandBoardCursorMovedEventSchema = exports.CommandBoardUserLeftEventSchema = exports.CommandBoardUserJoinedEventSchema = exports.CommandBoardUpdatedEventSchema = exports.CommandBoardCardDeletedEventSchema = exports.CommandBoardCardMovedEventSchema = exports.CommandBoardCardUpdatedEventSchema = exports.CommandBoardCardCreatedEventSchema = exports.KitchenTaskProgressEventSchema = exports.KitchenTaskReleasedEventSchema = exports.KitchenTaskClaimedEventSchema = exports.CommandBoardCursorMovedPayloadSchema = exports.CommandBoardUserLeftPayloadSchema = exports.CommandBoardUserJoinedPayloadSchema = exports.CommandBoardUpdatedPayloadSchema = exports.CommandBoardCardDeletedPayloadSchema = exports.CommandBoardCardMovedPayloadSchema = exports.CommandBoardCardUpdatedPayloadSchema = exports.CommandBoardCardCreatedPayloadSchema = exports.KitchenTaskProgressPayloadSchema = exports.KitchenTaskReleasedPayloadSchema = exports.KitchenTaskClaimedPayloadSchema = exports.RealtimeEventBaseSchema = void 0;
exports.parseRealtimeEvent = parseRealtimeEvent;
exports.isKitchenEvent = isKitchenEvent;
exports.isCommandBoardEvent = isCommandBoardEvent;
const zod_1 = require("zod");
/**
 * Base schema for all realtime events.
 */
exports.RealtimeEventBaseSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    version: zod_1.z.literal(1),
    tenantId: zod_1.z.string().min(1),
    aggregateType: zod_1.z.string().min(1),
    aggregateId: zod_1.z.string().min(1),
    occurredAt: zod_1.z.string().datetime(),
});
/**
 * Kitchen event payload schemas.
 */
exports.KitchenTaskClaimedPayloadSchema = zod_1.z.object({
    taskId: zod_1.z.string().min(1),
    employeeId: zod_1.z.string().min(1),
    claimedAt: zod_1.z.string().datetime(),
});
exports.KitchenTaskReleasedPayloadSchema = zod_1.z.object({
    taskId: zod_1.z.string().min(1),
    employeeId: zod_1.z.string().min(1),
    releasedAt: zod_1.z.string().datetime(),
});
exports.KitchenTaskProgressPayloadSchema = zod_1.z.object({
    taskId: zod_1.z.string().min(1),
    employeeId: zod_1.z.string().min(1),
    progressPercent: zod_1.z.number().int().min(0).max(100),
    updatedAt: zod_1.z.string().datetime(),
});
/**
 * Command Board event payload schemas.
 */
exports.CommandBoardCardCreatedPayloadSchema = zod_1.z.object({
    boardId: zod_1.z.string().min(1),
    cardId: zod_1.z.string().min(1),
    cardType: zod_1.z.string().min(1),
    title: zod_1.z.string(),
    positionX: zod_1.z.number(),
    positionY: zod_1.z.number(),
    createdBy: zod_1.z.string().min(1),
    createdAt: zod_1.z.string().datetime(),
});
exports.CommandBoardCardUpdatedPayloadSchema = zod_1.z.object({
    boardId: zod_1.z.string().min(1),
    cardId: zod_1.z.string().min(1),
    changes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    updatedBy: zod_1.z.string().min(1),
    updatedAt: zod_1.z.string().datetime(),
});
exports.CommandBoardCardMovedPayloadSchema = zod_1.z.object({
    boardId: zod_1.z.string().min(1),
    cardId: zod_1.z.string().min(1),
    previousPosition: zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
    }),
    newPosition: zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
    }),
    movedBy: zod_1.z.string().min(1),
    movedAt: zod_1.z.string().datetime(),
});
exports.CommandBoardCardDeletedPayloadSchema = zod_1.z.object({
    boardId: zod_1.z.string().min(1),
    cardId: zod_1.z.string().min(1),
    deletedBy: zod_1.z.string().min(1),
    deletedAt: zod_1.z.string().datetime(),
});
exports.CommandBoardUpdatedPayloadSchema = zod_1.z.object({
    boardId: zod_1.z.string().min(1),
    name: zod_1.z.string(),
    changes: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    updatedBy: zod_1.z.string().min(1),
    updatedAt: zod_1.z.string().datetime(),
});
exports.CommandBoardUserJoinedPayloadSchema = zod_1.z.object({
    boardId: zod_1.z.string().min(1),
    userId: zod_1.z.string().min(1),
    userName: zod_1.z.string(),
    joinedAt: zod_1.z.string().datetime(),
});
exports.CommandBoardUserLeftPayloadSchema = zod_1.z.object({
    boardId: zod_1.z.string().min(1),
    userId: zod_1.z.string().min(1),
    leftAt: zod_1.z.string().datetime(),
});
exports.CommandBoardCursorMovedPayloadSchema = zod_1.z.object({
    boardId: zod_1.z.string().min(1),
    userId: zod_1.z.string().min(1),
    position: zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
    }),
    movedAt: zod_1.z.string().datetime(),
});
/**
 * Full event schemas with discriminator - Kitchen events.
 */
exports.KitchenTaskClaimedEventSchema = exports.RealtimeEventBaseSchema.extend({
    eventType: zod_1.z.literal("kitchen.task.claimed"),
    payload: exports.KitchenTaskClaimedPayloadSchema,
});
exports.KitchenTaskReleasedEventSchema = exports.RealtimeEventBaseSchema.extend({
    eventType: zod_1.z.literal("kitchen.task.released"),
    payload: exports.KitchenTaskReleasedPayloadSchema,
});
exports.KitchenTaskProgressEventSchema = exports.RealtimeEventBaseSchema.extend({
    eventType: zod_1.z.literal("kitchen.task.progress"),
    payload: exports.KitchenTaskProgressPayloadSchema,
});
/**
 * Full event schemas with discriminator - Command Board events.
 */
exports.CommandBoardCardCreatedEventSchema = exports.RealtimeEventBaseSchema.extend({
    eventType: zod_1.z.literal("command.board.card.created"),
    payload: exports.CommandBoardCardCreatedPayloadSchema,
});
exports.CommandBoardCardUpdatedEventSchema = exports.RealtimeEventBaseSchema.extend({
    eventType: zod_1.z.literal("command.board.card.updated"),
    payload: exports.CommandBoardCardUpdatedPayloadSchema,
});
exports.CommandBoardCardMovedEventSchema = exports.RealtimeEventBaseSchema.extend({
    eventType: zod_1.z.literal("command.board.card.moved"),
    payload: exports.CommandBoardCardMovedPayloadSchema,
});
exports.CommandBoardCardDeletedEventSchema = exports.RealtimeEventBaseSchema.extend({
    eventType: zod_1.z.literal("command.board.card.deleted"),
    payload: exports.CommandBoardCardDeletedPayloadSchema,
});
exports.CommandBoardUpdatedEventSchema = exports.RealtimeEventBaseSchema.extend({
    eventType: zod_1.z.literal("command.board.updated"),
    payload: exports.CommandBoardUpdatedPayloadSchema,
});
exports.CommandBoardUserJoinedEventSchema = exports.RealtimeEventBaseSchema.extend({
    eventType: zod_1.z.literal("command.board.user.joined"),
    payload: exports.CommandBoardUserJoinedPayloadSchema,
});
exports.CommandBoardUserLeftEventSchema = exports.RealtimeEventBaseSchema.extend({
    eventType: zod_1.z.literal("command.board.user.left"),
    payload: exports.CommandBoardUserLeftPayloadSchema,
});
exports.CommandBoardCursorMovedEventSchema = exports.RealtimeEventBaseSchema.extend({
    eventType: zod_1.z.literal("command.board.cursor.moved"),
    payload: exports.CommandBoardCursorMovedPayloadSchema,
});
/**
 * Discriminated union of all event schemas.
 * Use this for validating unknown realtime events.
 */
exports.RealtimeEventSchema = zod_1.z.discriminatedUnion("eventType", [
    exports.KitchenTaskClaimedEventSchema,
    exports.KitchenTaskReleasedEventSchema,
    exports.KitchenTaskProgressEventSchema,
    exports.CommandBoardCardCreatedEventSchema,
    exports.CommandBoardCardUpdatedEventSchema,
    exports.CommandBoardCardMovedEventSchema,
    exports.CommandBoardCardDeletedEventSchema,
    exports.CommandBoardUpdatedEventSchema,
    exports.CommandBoardUserJoinedEventSchema,
    exports.CommandBoardUserLeftEventSchema,
    exports.CommandBoardCursorMovedEventSchema,
]);
/**
 * Parse and validate a realtime event.
 *
 * @param data - Unknown data to validate
 * @returns Zod parse result with success status and typed data
 */
function parseRealtimeEvent(data) {
    return exports.RealtimeEventSchema.safeParse(data);
}
/**
 * Type guard for kitchen events.
 */
function isKitchenEvent(data) {
    const result = parseRealtimeEvent(data);
    return result.success;
}
/**
 * Type guard for command board events.
 */
function isCommandBoardEvent(data) {
    const result = parseRealtimeEvent(data);
    if (!result.success) {
        return false;
    }
    // Check if event type starts with "command.board."
    return result.data.eventType.startsWith("command.board.");
}
