/**
 * Zod validation schemas for realtime events.
 * Provides runtime validation for event payloads.
 */
import { z } from "zod";
/**
 * Base schema for all realtime events.
 */
export declare const RealtimeEventBaseSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
}, z.core.$strip>;
/**
 * Kitchen event payload schemas.
 */
export declare const KitchenTaskClaimedPayloadSchema: z.ZodObject<{
    taskId: z.ZodString;
    employeeId: z.ZodString;
    claimedAt: z.ZodString;
}, z.core.$strip>;
export declare const KitchenTaskReleasedPayloadSchema: z.ZodObject<{
    taskId: z.ZodString;
    employeeId: z.ZodString;
    releasedAt: z.ZodString;
}, z.core.$strip>;
export declare const KitchenTaskProgressPayloadSchema: z.ZodObject<{
    taskId: z.ZodString;
    employeeId: z.ZodString;
    progressPercent: z.ZodNumber;
    updatedAt: z.ZodString;
}, z.core.$strip>;
/**
 * Command Board event payload schemas.
 */
export declare const CommandBoardCardCreatedPayloadSchema: z.ZodObject<{
    boardId: z.ZodString;
    cardId: z.ZodString;
    cardType: z.ZodString;
    title: z.ZodString;
    positionX: z.ZodNumber;
    positionY: z.ZodNumber;
    createdBy: z.ZodString;
    createdAt: z.ZodString;
}, z.core.$strip>;
export declare const CommandBoardCardUpdatedPayloadSchema: z.ZodObject<{
    boardId: z.ZodString;
    cardId: z.ZodString;
    changes: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    updatedBy: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const CommandBoardCardMovedPayloadSchema: z.ZodObject<{
    boardId: z.ZodString;
    cardId: z.ZodString;
    previousPosition: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>;
    newPosition: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>;
    movedBy: z.ZodString;
    movedAt: z.ZodString;
}, z.core.$strip>;
export declare const CommandBoardCardDeletedPayloadSchema: z.ZodObject<{
    boardId: z.ZodString;
    cardId: z.ZodString;
    deletedBy: z.ZodString;
    deletedAt: z.ZodString;
}, z.core.$strip>;
export declare const CommandBoardUpdatedPayloadSchema: z.ZodObject<{
    boardId: z.ZodString;
    name: z.ZodString;
    changes: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    updatedBy: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const CommandBoardUserJoinedPayloadSchema: z.ZodObject<{
    boardId: z.ZodString;
    userId: z.ZodString;
    userName: z.ZodString;
    joinedAt: z.ZodString;
}, z.core.$strip>;
export declare const CommandBoardUserLeftPayloadSchema: z.ZodObject<{
    boardId: z.ZodString;
    userId: z.ZodString;
    leftAt: z.ZodString;
}, z.core.$strip>;
export declare const CommandBoardCursorMovedPayloadSchema: z.ZodObject<{
    boardId: z.ZodString;
    userId: z.ZodString;
    position: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
    }, z.core.$strip>;
    movedAt: z.ZodString;
}, z.core.$strip>;
/**
 * Full event schemas with discriminator - Kitchen events.
 */
export declare const KitchenTaskClaimedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"kitchen.task.claimed">;
    payload: z.ZodObject<{
        taskId: z.ZodString;
        employeeId: z.ZodString;
        claimedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const KitchenTaskReleasedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"kitchen.task.released">;
    payload: z.ZodObject<{
        taskId: z.ZodString;
        employeeId: z.ZodString;
        releasedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const KitchenTaskProgressEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"kitchen.task.progress">;
    payload: z.ZodObject<{
        taskId: z.ZodString;
        employeeId: z.ZodString;
        progressPercent: z.ZodNumber;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Full event schemas with discriminator - Command Board events.
 */
export declare const CommandBoardCardCreatedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.card.created">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        cardId: z.ZodString;
        cardType: z.ZodString;
        title: z.ZodString;
        positionX: z.ZodNumber;
        positionY: z.ZodNumber;
        createdBy: z.ZodString;
        createdAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const CommandBoardCardUpdatedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.card.updated">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        cardId: z.ZodString;
        changes: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        updatedBy: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const CommandBoardCardMovedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.card.moved">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        cardId: z.ZodString;
        previousPosition: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strip>;
        newPosition: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strip>;
        movedBy: z.ZodString;
        movedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const CommandBoardCardDeletedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.card.deleted">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        cardId: z.ZodString;
        deletedBy: z.ZodString;
        deletedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const CommandBoardUpdatedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.updated">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        name: z.ZodString;
        changes: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        updatedBy: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const CommandBoardUserJoinedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.user.joined">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        userId: z.ZodString;
        userName: z.ZodString;
        joinedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const CommandBoardUserLeftEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.user.left">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        userId: z.ZodString;
        leftAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const CommandBoardCursorMovedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.cursor.moved">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        userId: z.ZodString;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strip>;
        movedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Discriminated union of all event schemas.
 * Use this for validating unknown realtime events.
 */
export declare const RealtimeEventSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"kitchen.task.claimed">;
    payload: z.ZodObject<{
        taskId: z.ZodString;
        employeeId: z.ZodString;
        claimedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"kitchen.task.released">;
    payload: z.ZodObject<{
        taskId: z.ZodString;
        employeeId: z.ZodString;
        releasedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"kitchen.task.progress">;
    payload: z.ZodObject<{
        taskId: z.ZodString;
        employeeId: z.ZodString;
        progressPercent: z.ZodNumber;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.card.created">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        cardId: z.ZodString;
        cardType: z.ZodString;
        title: z.ZodString;
        positionX: z.ZodNumber;
        positionY: z.ZodNumber;
        createdBy: z.ZodString;
        createdAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.card.updated">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        cardId: z.ZodString;
        changes: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        updatedBy: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.card.moved">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        cardId: z.ZodString;
        previousPosition: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strip>;
        newPosition: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strip>;
        movedBy: z.ZodString;
        movedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.card.deleted">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        cardId: z.ZodString;
        deletedBy: z.ZodString;
        deletedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.updated">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        name: z.ZodString;
        changes: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        updatedBy: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.user.joined">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        userId: z.ZodString;
        userName: z.ZodString;
        joinedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.user.left">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        userId: z.ZodString;
        leftAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    version: z.ZodLiteral<1>;
    tenantId: z.ZodString;
    aggregateType: z.ZodString;
    aggregateId: z.ZodString;
    occurredAt: z.ZodString;
    eventType: z.ZodLiteral<"command.board.cursor.moved">;
    payload: z.ZodObject<{
        boardId: z.ZodString;
        userId: z.ZodString;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strip>;
        movedAt: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>], "eventType">;
/**
 * Parse and validate a realtime event.
 *
 * @param data - Unknown data to validate
 * @returns Zod parse result with success status and typed data
 */
export declare function parseRealtimeEvent(data: unknown): z.ZodSafeParseResult<{
    id: string;
    version: 1;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    occurredAt: string;
    eventType: "kitchen.task.claimed";
    payload: {
        taskId: string;
        employeeId: string;
        claimedAt: string;
    };
} | {
    id: string;
    version: 1;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    occurredAt: string;
    eventType: "kitchen.task.released";
    payload: {
        taskId: string;
        employeeId: string;
        releasedAt: string;
    };
} | {
    id: string;
    version: 1;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    occurredAt: string;
    eventType: "kitchen.task.progress";
    payload: {
        taskId: string;
        employeeId: string;
        progressPercent: number;
        updatedAt: string;
    };
} | {
    id: string;
    version: 1;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    occurredAt: string;
    eventType: "command.board.card.created";
    payload: {
        boardId: string;
        cardId: string;
        cardType: string;
        title: string;
        positionX: number;
        positionY: number;
        createdBy: string;
        createdAt: string;
    };
} | {
    id: string;
    version: 1;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    occurredAt: string;
    eventType: "command.board.card.updated";
    payload: {
        boardId: string;
        cardId: string;
        changes: Record<string, unknown>;
        updatedBy: string;
        updatedAt: string;
    };
} | {
    id: string;
    version: 1;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    occurredAt: string;
    eventType: "command.board.card.moved";
    payload: {
        boardId: string;
        cardId: string;
        previousPosition: {
            x: number;
            y: number;
        };
        newPosition: {
            x: number;
            y: number;
        };
        movedBy: string;
        movedAt: string;
    };
} | {
    id: string;
    version: 1;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    occurredAt: string;
    eventType: "command.board.card.deleted";
    payload: {
        boardId: string;
        cardId: string;
        deletedBy: string;
        deletedAt: string;
    };
} | {
    id: string;
    version: 1;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    occurredAt: string;
    eventType: "command.board.updated";
    payload: {
        boardId: string;
        name: string;
        changes: Record<string, unknown>;
        updatedBy: string;
        updatedAt: string;
    };
} | {
    id: string;
    version: 1;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    occurredAt: string;
    eventType: "command.board.user.joined";
    payload: {
        boardId: string;
        userId: string;
        userName: string;
        joinedAt: string;
    };
} | {
    id: string;
    version: 1;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    occurredAt: string;
    eventType: "command.board.user.left";
    payload: {
        boardId: string;
        userId: string;
        leftAt: string;
    };
} | {
    id: string;
    version: 1;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    occurredAt: string;
    eventType: "command.board.cursor.moved";
    payload: {
        boardId: string;
        userId: string;
        position: {
            x: number;
            y: number;
        };
        movedAt: string;
    };
}>;
/**
 * Type guard for kitchen events.
 */
export declare function isKitchenEvent(data: unknown): data is z.infer<typeof RealtimeEventSchema>;
/**
 * Type guard for command board events.
 */
export declare function isCommandBoardEvent(data: unknown): data is z.infer<typeof RealtimeEventSchema>;
//# sourceMappingURL=schemas.d.ts.map