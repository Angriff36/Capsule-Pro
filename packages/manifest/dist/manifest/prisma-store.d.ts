/**
 * Prisma-based store for Manifest runtime with transactional outbox support.
 *
 * This store integrates with the capsule-pro database schema and provides:
 * - Atomic entity operations within Prisma transactions
 * - Transactional outbox event writes for reliable event delivery
 * - Proper tenant isolation via compound unique constraints
 *
 * @packageDocumentation
 */
import type { PrismaClient } from "@repo/database";
import type { EntityInstance, Store } from "./runtime-engine.js";
/**
 * Configuration for PrismaStore.
 */
export interface PrismaStoreConfig<T extends EntityInstance = EntityInstance> {
    /** Prisma client instance */
    prisma: PrismaClient;
    /** Entity name (matches Prisma model, e.g., "PrepTask", "Menu") */
    entityName: string;
    /** Tenant ID for multi-tenancy */
    tenantId: string;
    /** Optional: generate custom IDs */
    generateId?: () => string;
    /** Optional: outbox event writer for transactional events */
    outboxWriter?: OutboxEventWriter;
    /** Optional: aggregate ID for outbox events (defaults to entity ID) */
    aggregateId?: string;
}
/**
 * Outbox event writer interface for transactional event publishing.
 * Events are written within the same transaction as entity mutations.
 */
export type OutboxEventWriter = (prisma: PrismaClient, events: OutboxEventToWrite[]) => Promise<void>;
/**
 * Outbox event to be written transactionally.
 */
export interface OutboxEventToWrite {
    /** Event type (e.g., "kitchen.task.claimed") */
    eventType: string;
    /** Event payload */
    payload: unknown;
    /** Aggregate ID (defaults to entity ID) */
    aggregateId?: string;
}
/**
 * Prisma-based store implementation with transactional outbox support.
 *
 * This store uses Prisma interactive transactions to ensure atomicity
 * between entity mutations and outbox event writes.
 *
 * Key features:
 * - All operations execute within a Prisma transaction
 * - Outbox events are written in the same transaction as entity mutations
 * - Proper tenant isolation via compound unique constraints
 *
 * @example
 * ```typescript
 * const store = new PrismaStore({
 *   prisma: database,
 *   entityName: "PrepTask",
 *   tenantId: "tenant-123",
 *   outboxWriter: async (prisma, events) => {
 *     await prisma.outboxEvent.createMany({
 *       data: events.map(e => ({
 *         tenantId: "tenant-123",
 *         eventType: e.eventType,
 *         payload: e.payload,
 *         aggregateType: "PrepTask",
 *         aggregateId: e.aggregateId,
 *         status: "pending",
 *       })),
 *     });
 *   },
 * });
 * ```
 */
export declare class PrismaStore<T extends EntityInstance = EntityInstance> implements Store<T> {
    private readonly prisma;
    private readonly entityName;
    private readonly prismaModel;
    private readonly tenantId;
    private readonly generateId;
    private readonly outboxWriter?;
    private readonly defaultAggregateId;
    private readonly compoundKeyName;
    constructor(config: PrismaStoreConfig<T>);
    /**
     * Get all entities for this tenant.
     * Uses Prisma findMany with tenant filtering.
     */
    getAll(): Promise<T[]>;
    /**
     * Get a single entity by ID using the compound primary key.
     * Uses Prisma findUnique with composite key (tenantId + id).
     */
    getById(id: string): Promise<T | undefined>;
    /**
     * Create a new entity with transactional outbox events.
     * Uses Prisma interactive transaction for atomicity.
     */
    create(data: Partial<T>): Promise<T>;
    /**
     * Update an entity with transactional outbox.
     * Uses Prisma interactive transaction.
     *
     * Note: Optimistic concurrency control via version property is NOT
     * enforced here because the PrepTask schema doesn't have a version field.
     * Concurrency safety is provided by Prisma's transaction isolation and
     * the database's compound unique constraints.
     */
    update(id: string, data: Partial<T>): Promise<T | undefined>;
    /**
     * Delete an entity by ID using the compound primary key.
     * Uses Prisma delete with composite key.
     */
    delete(id: string): Promise<boolean>;
    /**
     * Clear all entities for this tenant (use with caution).
     * Uses Prisma deleteMany.
     */
    clear(): Promise<void>;
}
/**
 * Error thrown when a concurrency conflict is detected.
 * This error is thrown when optimistic concurrency control fails
 * (currently not used as PrepTask schema doesn't have version field).
 */
export declare class ConcurrencyConflictError extends Error {
    readonly entityType: string;
    readonly entityId: string;
    readonly expectedVersion: number;
    readonly actualVersion: number;
    constructor(entityType: string, entityId: string, expectedVersion: number, actualVersion: number);
}
/**
 * Create a default outbox event writer for Prisma.
 * Writes events to the OutboxEvent table within the same transaction.
 *
 * @example
 * ```typescript
 * const outboxWriter = createPrismaOutboxWriter("PrepTask", "tenant-123");
 * const store = new PrismaStore({
 *   prisma: database,
 *   entityName: "PrepTask",
 *   tenantId: "tenant-123",
 *   outboxWriter,
 * });
 * ```
 */
export declare function createPrismaOutboxWriter(aggregateType: string, tenantId: string): OutboxEventWriter;
//# sourceMappingURL=prisma-store.d.ts.map