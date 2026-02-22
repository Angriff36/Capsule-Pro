/**
 * Generic JSON-backed Prisma store for Manifest entities
 *
 * This module provides a single Store implementation that persists any Manifest
 * entity as a JSON blob in the `ManifestEntity` table. It eliminates the need
 * to hand-write individual store classes for each entity type.
 *
 * The store uses a composite key of (tenantId, entityType, id) to isolate
 * entities by tenant and type. Entity data is stored as a JSON column,
 * with optimistic concurrency control via a version field.
 *
 * @packageDocumentation
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database";
import type { EntityInstance } from "./prisma-store.js";
/**
 * Configuration for PrismaJsonStore
 */
interface PrismaJsonStoreConfig {
    /** Prisma client instance */
    prisma: PrismaClient;
    /** Tenant ID for multi-tenant isolation */
    tenantId: string;
    /** Entity type name (e.g., "PrepComment", "Container") */
    entityType: string;
}
/**
 * Generic JSON-backed Prisma store for Manifest entities.
 *
 * Stores entity data as JSON blobs in the `ManifestEntity` table,
 * keyed by (tenantId, entityType, id). Supports optimistic concurrency
 * via a version field that is bumped on every update.
 *
 * This is the fallback store for entities that don't have a dedicated
 * Prisma model with hand-written field mappings.
 */
export declare class PrismaJsonStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    private readonly entityType;
    constructor(config: PrismaJsonStoreConfig);
    /**
     * Get all entities of this type for the current tenant.
     */
    getAll(): Promise<EntityInstance[]>;
    /**
     * Get a single entity by ID.
     *
     * Uses the composite key (tenantId, entityType, id) for lookup.
     * Returns undefined if not found.
     */
    getById(id: string): Promise<EntityInstance | undefined>;
    /**
     * Create a new entity.
     *
     * Stores the entity data as a JSON blob with version 1.
     * The entity must have an `id` field.
     */
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    /**
     * Update an existing entity.
     *
     * Performs a shallow merge of the new data into the existing JSON blob.
     * Uses optimistic concurrency control: the update includes the current
     * version in the WHERE clause and bumps the version on success.
     *
     * Returns undefined if the entity is not found or the version has changed
     * (concurrency conflict).
     */
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    /**
     * Delete an entity by ID.
     *
     * Performs a hard delete (removes the row). Returns true if the entity
     * was found and deleted, false otherwise.
     */
    delete(id: string): Promise<boolean>;
    /**
     * Delete all entities of this type for the current tenant.
     */
    clear(): Promise<void>;
    /**
     * Deserialize a ManifestEntity row into an EntityInstance.
     *
     * Promotes the `id` from the row into the data object, ensuring
     * the returned entity always has a top-level `id` field.
     */
    private deserialize;
}
/**
 * Factory function that creates a store provider for PrismaJsonStore.
 *
 * Returns a function that, given an entity name, produces a PrismaJsonStore
 * instance for that entity type. This is the integration point for
 * `RuntimeOptions.storeProvider`.
 *
 * @param prisma - Prisma client instance
 * @param tenantId - Tenant ID for multi-tenant isolation
 * @returns A function that creates PrismaJsonStore instances per entity name
 */
export declare function createPrismaJsonStoreProvider(prisma: PrismaClient, tenantId: string): (entityName: string) => PrismaJsonStore;
export {};
//# sourceMappingURL=prisma-json-store.d.ts.map