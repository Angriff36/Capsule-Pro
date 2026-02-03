/**
 * createOutboxEvent helper for inserting events into the outbox table.
 * This function can be called within Prisma transactions for atomicity.
 */
import type { Prisma, PrismaClient } from "@repo/database";
/**
 * Input for creating an outbox event.
 */
export type CreateOutboxEventInput = {
    /** Tenant identifier */
    tenantId: string;
    /** Aggregate type (e.g., "KitchenTask", "Event") */
    aggregateType: string;
    /** Aggregate instance ID */
    aggregateId: string;
    /** Event type (e.g., "kitchen.task.claimed") */
    eventType: string;
    /** Event payload */
    payload: Record<string, unknown>;
    /** When the event occurred (defaults to now) */
    occurredAt?: Date;
};
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
export declare function createOutboxEvent(db: PrismaClient | Prisma.TransactionClient, input: CreateOutboxEventInput): Promise<{
    error: string | null;
    id: string;
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    createdAt: Date;
    eventType: string;
    payload: import("@prisma/client/runtime/client").JsonValue;
    status: import("@repo/database").OutboxStatus;
    publishedAt: Date | null;
}>;
//# sourceMappingURL=create.d.ts.map