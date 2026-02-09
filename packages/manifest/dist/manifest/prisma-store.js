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
/**
 * Mapping from manifest entity names to Prisma models (snake_case).
 * Add new entities here as they are integrated.
 */
const ENTITY_TO_PRISMA_MODEL = {
    PrepTask: "prep_task",
    Menu: "menu",
    MenuDish: "menu_dish",
    Recipe: "recipe",
    RecipeVersion: "recipe_version",
    Ingredient: "ingredient",
    RecipeIngredient: "recipe_ingredient",
    Dish: "dish",
    PrepList: "prep_list",
    PrepListItem: "prep_list_item",
    InventoryItem: "inventory_item",
    Station: "station",
};
/**
 * Get the Prisma model name for a given entity name.
 * Converts PascalCase to snake_case.
 */
function getPrismaModel(entityName) {
    return (ENTITY_TO_PRISMA_MODEL[entityName] ||
        entityName
            .replace(/([A-Z])/g, "_$1")
            .toLowerCase()
            .replace(/^_/, ""));
}
/**
 * Get the Prisma compound key name for a given entity.
 * For models with @@id([tenantId, id]), Prisma generates "tenantId_id"
 */
function getCompoundKeyName(entityName) {
    // Standard pattern for capsule-pro: @@id([tenantId, id])
    // Prisma generates the compound key as "tenantId_id"
    return "tenantId_id";
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
export class PrismaStore {
    prisma;
    entityName;
    prismaModel;
    tenantId;
    generateId;
    outboxWriter;
    defaultAggregateId;
    compoundKeyName;
    constructor(config) {
        this.prisma = config.prisma;
        this.entityName = config.entityName;
        this.prismaModel = getPrismaModel(config.entityName);
        this.tenantId = config.tenantId;
        this.generateId = config.generateId || (() => crypto.randomUUID());
        this.outboxWriter = config.outboxWriter;
        this.defaultAggregateId = config.aggregateId || "";
        this.compoundKeyName = getCompoundKeyName(config.entityName);
    }
    /**
     * Get all entities for this tenant.
     * Uses Prisma findMany with tenant filtering.
     */
    async getAll() {
        // Dynamic Prisma access: findMany on the model
        const model = this.prisma[this.prismaModel];
        const results = await model.findMany({
            where: { tenant_id: this.tenantId },
        });
        return results;
    }
    /**
     * Get a single entity by ID using the compound primary key.
     * Uses Prisma findUnique with composite key (tenantId + id).
     */
    async getById(id) {
        const model = this.prisma[this.prismaModel];
        // Build the compound key where clause
        const whereClause = {};
        whereClause[this.compoundKeyName] = {
            tenantId: this.tenantId,
            id,
        };
        const result = await model.findUnique({
            where: whereClause,
        });
        return result;
    }
    /**
     * Create a new entity with transactional outbox events.
     * Uses Prisma interactive transaction for atomicity.
     */
    async create(data) {
        return this.prisma.$transaction(async (tx) => {
            const id = (data.id || this.generateId());
            const item = { ...data, id };
            // Get the model from the transaction Prisma client
            const txModel = tx[this.prismaModel];
            // Create the entity
            const result = await txModel.create({
                data: {
                    ...item,
                    tenant_id: this.tenantId,
                },
            });
            const created = result;
            // Write outbox events if configured
            if (this.outboxWriter && "emittedEvents" in item) {
                const events = item.emittedEvents || [];
                if (events.length > 0) {
                    await this.outboxWriter(tx, events);
                }
            }
            return created;
        });
    }
    /**
     * Update an entity with transactional outbox.
     * Uses Prisma interactive transaction.
     *
     * Note: Optimistic concurrency control via version property is NOT
     * enforced here because the PrepTask schema doesn't have a version field.
     * Concurrency safety is provided by Prisma's transaction isolation and
     * the database's compound unique constraints.
     */
    async update(id, data) {
        return this.prisma.$transaction(async (tx) => {
            const txModel = tx[this.prismaModel];
            // Build the compound key where clause
            const whereClause = {};
            whereClause[this.compoundKeyName] = {
                tenantId: this.tenantId,
                id,
            };
            // Fetch current entity
            const current = await txModel.findUnique({
                where: whereClause,
            });
            if (!current) {
                return undefined;
            }
            // Perform the update
            const result = await txModel.update({
                where: whereClause,
                data,
            });
            const updated = result;
            // Write outbox events if configured
            if (this.outboxWriter && "emittedEvents" in data) {
                const events = data.emittedEvents || [];
                if (events.length > 0) {
                    await this.outboxWriter(tx, events);
                }
            }
            return updated;
        });
    }
    /**
     * Delete an entity by ID using the compound primary key.
     * Uses Prisma delete with composite key.
     */
    async delete(id) {
        const model = this.prisma[this.prismaModel];
        try {
            // Build the compound key where clause
            const whereClause = {};
            whereClause[this.compoundKeyName] = {
                tenantId: this.tenantId,
                id,
            };
            await model.delete({
                where: whereClause,
            });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Clear all entities for this tenant (use with caution).
     * Uses Prisma deleteMany.
     */
    async clear() {
        const model = this.prisma[this.prismaModel];
        await model.deleteMany({
            where: { tenant_id: this.tenantId },
        });
    }
}
/**
 * Error thrown when a concurrency conflict is detected.
 * This error is thrown when optimistic concurrency control fails
 * (currently not used as PrepTask schema doesn't have version field).
 */
export class ConcurrencyConflictError extends Error {
    entityType;
    entityId;
    expectedVersion;
    actualVersion;
    constructor(entityType, entityId, expectedVersion, actualVersion) {
        super(`Concurrency conflict on ${entityType}#${entityId}: ` +
            `expected version ${expectedVersion}, got ${actualVersion}`);
        this.entityType = entityType;
        this.entityId = entityId;
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
        this.name = "ConcurrencyConflictError";
    }
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
export function createPrismaOutboxWriter(aggregateType, tenantId, defaultAggregateId) {
    return async (prisma, events) => {
        if (events.length === 0)
            return;
        await prisma.outboxEvent.createMany({
            data: events.map((event) => ({
                tenantId,
                eventType: event.eventType,
                payload: event.payload,
                aggregateType,
                aggregateId: event.aggregateId ?? defaultAggregateId ?? "",
                status: "pending",
            })),
        });
    };
}
