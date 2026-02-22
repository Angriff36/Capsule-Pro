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
export class PrismaJsonStore {
    prisma;
    tenantId;
    entityType;
    constructor(config) {
        this.prisma = config.prisma;
        this.tenantId = config.tenantId;
        this.entityType = config.entityType;
    }
    /**
     * Get all entities of this type for the current tenant.
     */
    async getAll() {
        try {
            const rows = await this.prisma.manifestEntity.findMany({
                where: {
                    tenantId: this.tenantId,
                    entityType: this.entityType,
                },
                orderBy: { createdAt: "asc" },
            });
            return rows.map((row) => this.deserialize(row));
        }
        catch (error) {
            console.error(`[PrismaJsonStore] getAll failed for entityType="${this.entityType}", tenant="${this.tenantId}":`, error);
            throw error;
        }
    }
    /**
     * Get a single entity by ID.
     *
     * Uses the composite key (tenantId, entityType, id) for lookup.
     * Returns undefined if not found.
     */
    async getById(id) {
        try {
            const row = await this.prisma.manifestEntity.findUnique({
                where: {
                    tenantId_entityType_id: {
                        tenantId: this.tenantId,
                        entityType: this.entityType,
                        id,
                    },
                },
            });
            if (!row) {
                return undefined;
            }
            return this.deserialize(row);
        }
        catch (error) {
            console.error(`[PrismaJsonStore] getById("${id}") failed for entityType="${this.entityType}", tenant="${this.tenantId}":`, error);
            throw error;
        }
    }
    /**
     * Create a new entity.
     *
     * Stores the entity data as a JSON blob with version 1.
     * The entity must have an `id` field.
     */
    async create(data) {
        try {
            const id = data.id;
            if (!id) {
                throw new Error(`[PrismaJsonStore] create() requires data.id for entityType="${this.entityType}"`);
            }
            // Store the full entity data as JSON, including the id
            const jsonData = { ...data };
            const row = await this.prisma.manifestEntity.create({
                data: {
                    tenantId: this.tenantId,
                    entityType: this.entityType,
                    id,
                    data: jsonData,
                    version: 1,
                },
            });
            return this.deserialize(row);
        }
        catch (error) {
            console.error(`[PrismaJsonStore] create() failed for entityType="${this.entityType}", tenant="${this.tenantId}":`, error);
            throw error;
        }
    }
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
    async update(id, data) {
        try {
            // Fetch the current row to get existing data and version
            const existing = await this.prisma.manifestEntity.findUnique({
                where: {
                    tenantId_entityType_id: {
                        tenantId: this.tenantId,
                        entityType: this.entityType,
                        id,
                    },
                },
            });
            if (!existing) {
                console.error(`[PrismaJsonStore] update("${id}") — entity not found for entityType="${this.entityType}", tenant="${this.tenantId}"`);
                return undefined;
            }
            // Shallow merge: new data overwrites existing fields
            const existingData = existing.data;
            const mergedData = { ...existingData, ...data, id };
            // Optimistic concurrency: only update if version matches
            // Use updateMany with version in WHERE to get atomic check-and-set
            const result = await this.prisma.manifestEntity.updateMany({
                where: {
                    tenantId: this.tenantId,
                    entityType: this.entityType,
                    id,
                    version: existing.version,
                },
                data: {
                    data: mergedData,
                    version: existing.version + 1,
                    updatedAt: new Date(),
                },
            });
            if (result.count === 0) {
                console.error(`[PrismaJsonStore] update("${id}") — optimistic concurrency conflict for entityType="${this.entityType}", tenant="${this.tenantId}", version=${existing.version}`);
                return undefined;
            }
            // Return the merged entity
            return {
                ...mergedData,
                id,
            };
        }
        catch (error) {
            console.error(`[PrismaJsonStore] update("${id}") failed for entityType="${this.entityType}", tenant="${this.tenantId}":`, error);
            throw error;
        }
    }
    /**
     * Delete an entity by ID.
     *
     * Performs a hard delete (removes the row). Returns true if the entity
     * was found and deleted, false otherwise.
     */
    async delete(id) {
        try {
            await this.prisma.manifestEntity.delete({
                where: {
                    tenantId_entityType_id: {
                        tenantId: this.tenantId,
                        entityType: this.entityType,
                        id,
                    },
                },
            });
            return true;
        }
        catch (error) {
            // Prisma throws if the record doesn't exist — treat as "not found"
            console.error(`[PrismaJsonStore] delete("${id}") failed for entityType="${this.entityType}", tenant="${this.tenantId}":`, error);
            return false;
        }
    }
    /**
     * Delete all entities of this type for the current tenant.
     */
    async clear() {
        try {
            await this.prisma.manifestEntity.deleteMany({
                where: {
                    tenantId: this.tenantId,
                    entityType: this.entityType,
                },
            });
        }
        catch (error) {
            console.error(`[PrismaJsonStore] clear() failed for entityType="${this.entityType}", tenant="${this.tenantId}":`, error);
            throw error;
        }
    }
    /**
     * Deserialize a ManifestEntity row into an EntityInstance.
     *
     * Promotes the `id` from the row into the data object, ensuring
     * the returned entity always has a top-level `id` field.
     */
    deserialize(row) {
        const data = row.data;
        return {
            ...data,
            id: row.id,
        };
    }
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
export function createPrismaJsonStoreProvider(prisma, tenantId) {
    return (entityName) => new PrismaJsonStore({ prisma, tenantId, entityType: entityName });
}
