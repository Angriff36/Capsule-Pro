"use strict";
/**
 * createOutboxEvent helper for inserting events into the outbox table.
 * This function can be called within Prisma transactions for atomicity.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOutboxEvent = createOutboxEvent;
/**
 * Create an outbox event record.
 *
 * @param db - Prisma client or transaction client
 * @param input - Event data
 * @returns Created OutboxEvent
 *
 * @example
 * ```ts
 * await database.$transaction(async (tx) => {
 *   // Update domain model
 *   await tx.kitchenTask.update({ ... });
 *
 *   // Create outbox event in same transaction
 *   await createOutboxEvent(tx, {
 *     tenantId: "tenant-123",
 *     aggregateType: "KitchenTask",
 *     aggregateId: "task-456",
 *     eventType: "kitchen.task.claimed",
 *     payload: { taskId: "task-456", employeeId: "emp-789", claimedAt: new Date().toISOString() },
 *   });
 * });
 * ```
 */
async function createOutboxEvent(db, input) {
    const occurredAt = input.occurredAt ?? new Date();
    return db.outboxEvent.create({
        data: {
            tenantId: input.tenantId,
            aggregateType: input.aggregateType,
            aggregateId: input.aggregateId,
            eventType: input.eventType,
            payload: {
                ...input.payload,
                occurredAt: occurredAt.toISOString(),
            },
            status: "pending",
        },
    });
}
