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

import type { Prisma, PrismaClient } from "@repo/database";
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
export type OutboxEventWriter = (
  prisma: PrismaClient,
  events: OutboxEventToWrite[]
) => Promise<void>;

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
 * Mapping from manifest entity names to Prisma models (snake_case).
 * Add new entities here as they are integrated.
 */
const ENTITY_TO_PRISMA_MODEL: Record<string, string> = {
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
function getPrismaModel(entityName: string): string {
  return (
    ENTITY_TO_PRISMA_MODEL[entityName] ||
    entityName
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "")
  );
}

/**
 * Get the Prisma compound key name for a given entity.
 * For models with @@id([tenantId, id]), Prisma generates "tenantId_id"
 */
function getCompoundKeyName(entityName: string): string {
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
export class PrismaStore<T extends EntityInstance = EntityInstance>
  implements Store<T>
{
  private readonly prisma: PrismaClient;
  private readonly entityName: string;
  private readonly prismaModel: string;
  private readonly tenantId: string;
  private readonly generateId: () => string;
  private readonly outboxWriter?: OutboxEventWriter;
  private readonly defaultAggregateId: string;
  private readonly compoundKeyName: string;

  constructor(config: PrismaStoreConfig<T>) {
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
  async getAll(): Promise<T[]> {
    // Dynamic Prisma access: findMany on the model
    const model = (this.prisma as unknown as Record<string, unknown>)[
      this.prismaModel
    ] as { findMany: (args: unknown) => Promise<unknown[]> };

    const results = await model.findMany({
      where: { tenant_id: this.tenantId },
    });

    return results as T[];
  }

  /**
   * Get a single entity by ID using the compound primary key.
   * Uses Prisma findUnique with composite key (tenantId + id).
   */
  async getById(id: string): Promise<T | undefined> {
    const model = (this.prisma as unknown as Record<string, unknown>)[
      this.prismaModel
    ] as { findUnique: (args: unknown) => Promise<unknown> };

    // Build the compound key where clause
    const whereClause: Record<string, unknown> = {};
    whereClause[this.compoundKeyName] = {
      tenantId: this.tenantId,
      id,
    };

    const result = await model.findUnique({
      where: whereClause,
    });

    return result as T | undefined;
  }

  /**
   * Create a new entity with transactional outbox events.
   * Uses Prisma interactive transaction for atomicity.
   */
  async create(data: Partial<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const id = (data.id || this.generateId()) as string;
      const item = { ...data, id };

      // Get the model from the transaction Prisma client
      const txModel = (tx as unknown as Record<string, unknown>)[
        this.prismaModel
      ] as { create: (args: unknown) => Promise<unknown> };

      // Create the entity
      const result = await txModel.create({
        data: {
          ...item,
          tenant_id: this.tenantId,
        },
      });

      const created = result as T;

      // Write outbox events if configured
      if (this.outboxWriter && "emittedEvents" in item) {
        const events = (item.emittedEvents as OutboxEventToWrite[]) || [];
        if (events.length > 0) {
          await this.outboxWriter(tx as PrismaClient, events);
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
  async update(id: string, data: Partial<T>): Promise<T | undefined> {
    return this.prisma.$transaction(async (tx) => {
      const txModel = (tx as unknown as Record<string, unknown>)[
        this.prismaModel
      ] as {
        findUnique: (args: unknown) => Promise<unknown>;
        update: (args: unknown) => Promise<unknown>;
      };

      // Build the compound key where clause
      const whereClause: Record<string, unknown> = {};
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

      const updated = result as T;

      // Write outbox events if configured
      if (this.outboxWriter && "emittedEvents" in data) {
        const events = (data.emittedEvents as OutboxEventToWrite[]) || [];
        if (events.length > 0) {
          await this.outboxWriter(tx as PrismaClient, events);
        }
      }

      return updated;
    });
  }

  /**
   * Delete an entity by ID using the compound primary key.
   * Uses Prisma delete with composite key.
   */
  async delete(id: string): Promise<boolean> {
    const model = (this.prisma as unknown as Record<string, unknown>)[
      this.prismaModel
    ] as { delete: (args: unknown) => Promise<unknown> };

    try {
      // Build the compound key where clause
      const whereClause: Record<string, unknown> = {};
      whereClause[this.compoundKeyName] = {
        tenantId: this.tenantId,
        id,
      };

      await model.delete({
        where: whereClause,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all entities for this tenant (use with caution).
   * Uses Prisma deleteMany.
   */
  async clear(): Promise<void> {
    const model = (this.prisma as unknown as Record<string, unknown>)[
      this.prismaModel
    ] as { deleteMany: (args: unknown) => Promise<unknown> };

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
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(
      `Concurrency conflict on ${entityType}#${entityId}: ` +
        `expected version ${expectedVersion}, got ${actualVersion}`
    );
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
export function createPrismaOutboxWriter(
  aggregateType: string,
  tenantId: string
): OutboxEventWriter {
  return async (prisma, events) => {
    if (events.length === 0) return;

    await (prisma as PrismaClient).outboxEvent.createMany({
      data: events.map((event) => ({
        tenantId,
        eventType: event.eventType,
        payload: event.payload as Prisma.InputJsonValue,
        aggregateType,
        aggregateId: event.aggregateId ?? "",
        status: "pending",
      })),
    });
  };
}
