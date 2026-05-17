/**
 * Prisma-backed store for Manifest entities
 *
 * This module provides Store implementations that persist Manifest entities
 * using the existing Prisma schema. It bridges the gap between Manifest's entity
 * model and the Prisma database tables.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { DishPrismaStore } from "./prisma-stores/broken-read-batch06-cycle-dish.js";
export { DishPrismaStore };
import { EmailTemplatePrismaStore } from "./prisma-stores/broken-read-batch06-email.js";
export { EmailTemplatePrismaStore };
import { EventPrismaStore } from "./prisma-stores/broken-read-batch07-event.js";
export { EventPrismaStore };
import { IngredientPrismaStore } from "./prisma-stores/broken-read-batch09-ingredient.js";
export { IngredientPrismaStore };
import { InventoryItemPrismaStore } from "./prisma-stores/broken-read-batch09-inventory.js";
export { InventoryItemPrismaStore };
export interface EntityInstance {
    id: string;
    [key: string]: unknown;
}
/**
 * Prisma-backed store for PrepTask entities
 *
 * Maps Manifest PrepTask entities to the Prisma PrepTask and KitchenTaskClaim tables.
 * The Manifest entity has inline claimedBy/claimedAt fields, while Prisma uses a
 * separate KitchenTaskClaim table for tracking claims.
 */
export declare class PrepTaskPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    /**
     * Map Prisma PrepTask to Manifest PrepTask entity
     */
    private mapToManifestEntity;
    /**
     * Map Prisma status to Manifest status
     */
    private mapStatus;
}
/**
 * Prisma-backed store for Recipe entities
 *
 * Maps Manifest Recipe entities to the Prisma Recipe table.
 */
export declare class RecipePrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
/**
 * Prisma-backed store for RecipeVersion entities
 *
 * Maps Manifest RecipeVersion entities to the Prisma RecipeVersion table.
 */
export declare class RecipeVersionPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    /**
     * Get the latest RecipeVersion for a specific recipe (by versionNumber DESC).
     * This replaces the need for raw SQL queries like MAX(version_number).
     */
    getLatestByRecipeId(recipeId: string): Promise<EntityInstance | undefined>;
    /**
     * Get all versions for a specific recipe, ordered by version number descending.
     */
    getByRecipeId(recipeId: string): Promise<EntityInstance[]>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
/**
 * Prisma-backed store for RecipeIngredient entities
 *
 * Maps Manifest RecipeIngredient entities to the Prisma RecipeIngredient table.
 */
export declare class RecipeIngredientPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
/**
 * Prisma-backed store for RecipeStep entities
 *
 * Maps Manifest RecipeStep entities to the Prisma RecipeStep table.
 * Note: Prisma model uses snake_case (RecipeStep).
 */
export declare class RecipeStepPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
/**
 * Prisma-backed store for KitchenTask entities
 *
 * Maps Manifest KitchenTask entities to the Prisma KitchenTask table.
 * Unlike PrepTask, KitchenTask is a general-purpose task (not event-driven).
 * Status values pass through directly (no remapping) since the manifest
 * uses the same values as the DB: pending, in_progress, done, cancelled.
 */
export declare class KitchenTaskPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
/**
 * Prisma-backed store for AllergenWarning entities
 *
 * Maps Manifest AllergenWarning entities to the Prisma AllergenWarning table.
 * Handles the conversion between Manifest string properties (allergens, affectedGuests)
 * and Prisma array types.
 */
export declare class AllergenWarningPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    /**
     * Convert Manifest string property to Prisma array
     * Manifest stores arrays as comma-separated strings
     */
    private stringToArray;
    /**
     * Convert Prisma array to Manifest string property
     */
    private arrayToString;
    private mapToManifestEntity;
}
/**
 * Prisma-backed store for AlertsConfig (`tenant_inventory.alerts_config`).
 *
 * Manifest commands for this entity previously used `PrismaJsonStore` while
 * list/detail routes under `/api/kitchen/alerts-config/*` read
 * `database.alertsConfig` — writes never appeared in the UI.
 */
export declare class AlertsConfigPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
/**
 * Prisma-backed store for PrepTaskPlanWorkflow entities
 *
 * Backs the 16 lifecycle command routes for the prep-task plan pipeline
 * (generate -> review -> approve -> instantiate tasks -> schedule windows).
 *
 * Why this exists: prior to this store, command routes wrote workflow state
 * via `PrismaJsonStore` (the generic `manifest_entities` JSON blob table),
 * but read routes (`/api/kitchen/prep-task-plan-workflows/*`) queried the
 * dedicated `tenant_kitchen.prep_task_plan_workflows` table. Writes and
 * reads never connected — every workflow created via a command was invisible
 * to the UI. This store closes that mismatch.
 *
 * Field mapping: every manifest property is stored 1:1 (same name) in the
 * dedicated table; JSON-shaped properties (generatedTasks, scheduledWindows,
 * errors, etc.) are typed as `string` in the manifest and stored as TEXT in
 * Postgres holding serialized JSON payloads (e.g. `"[]"`, `"{}"`).
 */
export declare class PrepTaskPlanWorkflowPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    /**
     * Map the Prisma row to a Manifest EntityInstance.
     * Timestamps become epoch-millis numbers (manifest contract); nullable
     * scalars get manifest-default empty strings/zero numbers so guards like
     * `self.status == ""` behave consistently.
     */
    private mapToManifestEntity;
}
/**
 * Create a Prisma store provider for Kitchen-Ops entities
 *
 * This returns a function that provides the appropriate Store implementation
 * for each entity type, backed by Prisma.
 */
export declare function createPrismaStoreProvider(prisma: PrismaClient, tenantId: string): (entityName: string) => Store<EntityInstance> | undefined;
/**
 * Load a PrepTask from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export declare function loadPrepTaskFromPrisma(prisma: PrismaClient, tenantId: string, taskId: string): Promise<EntityInstance | undefined>;
/**
 * Sync a PrepTask from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export declare function syncPrepTaskToPrisma(prisma: PrismaClient, tenantId: string, entity: EntityInstance): Promise<void>;
/**
 * Load a Recipe from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export declare function loadRecipeFromPrisma(prisma: PrismaClient, tenantId: string, recipeId: string): Promise<EntityInstance | undefined>;
/**
 * Sync a Recipe from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export declare function syncRecipeToPrisma(prisma: PrismaClient, tenantId: string, entity: EntityInstance): Promise<void>;
/**
 * Load a Dish from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export declare function loadDishFromPrisma(prisma: PrismaClient, tenantId: string, dishId: string): Promise<EntityInstance | undefined>;
/**
 * Sync a Dish from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export declare function syncDishToPrisma(prisma: PrismaClient, tenantId: string, entity: EntityInstance): Promise<void>;
/**
 * Prisma-backed store for Menu entities
 *
 * Maps Manifest Menu entities to the Prisma Menu table.
 */
export declare class MenuPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
/**
 * Prisma-backed store for MenuDish entities
 *
 * Maps Manifest MenuDish entities to the Prisma MenuDish table.
 */
export declare class MenuDishPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
/**
 * Load a Menu from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export declare function loadMenuFromPrisma(prisma: PrismaClient, tenantId: string, menuId: string): Promise<EntityInstance | undefined>;
/**
 * Sync a Menu from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export declare function syncMenuToPrisma(prisma: PrismaClient, tenantId: string, entity: EntityInstance): Promise<void>;
/**
 * Load a MenuDish from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export declare function loadMenuDishFromPrisma(prisma: PrismaClient, tenantId: string, menuDishId: string): Promise<EntityInstance | undefined>;
/**
 * Sync a MenuDish from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export declare function syncMenuDishToPrisma(prisma: PrismaClient, tenantId: string, entity: EntityInstance): Promise<void>;
/**
 * Prisma-backed store for PrepList entities
 *
 * Maps Manifest PrepList entities to the Prisma PrepList table.
 */
export declare class PrepListPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
/**
 * Prisma-backed store for PrepListItem entities
 *
 * Maps Manifest PrepListItem entities to the Prisma PrepListItem table.
 */
export declare class PrepListItemPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
/**
 * Load a PrepList from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export declare function loadPrepListFromPrisma(prisma: PrismaClient, tenantId: string, prepListId: string): Promise<EntityInstance | undefined>;
/**
 * Sync a PrepList from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export declare function syncPrepListToPrisma(prisma: PrismaClient, tenantId: string, entity: EntityInstance): Promise<void>;
/**
 * Load a PrepListItem from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export declare function loadPrepListItemFromPrisma(prisma: PrismaClient, tenantId: string, itemId: string): Promise<EntityInstance | undefined>;
/**
 * Sync a PrepListItem from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export declare function syncPrepListItemToPrisma(prisma: PrismaClient, tenantId: string, entity: EntityInstance): Promise<void>;
/**
 * Prisma-backed store for Station entities
 *
 * Maps Manifest Station entities to the Prisma Station table.
 */
export declare class StationPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
/**
 * Load a Station from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export declare function loadStationFromPrisma(prisma: PrismaClient, tenantId: string, stationId: string): Promise<EntityInstance | undefined>;
/**
 * Sync a Station from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export declare function syncStationToPrisma(prisma: PrismaClient, tenantId: string, entity: EntityInstance): Promise<void>;
/**
 * Load an InventoryItem from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export declare function loadInventoryItemFromPrisma(prisma: PrismaClient, tenantId: string, itemId: string): Promise<EntityInstance | undefined>;
/**
 * Sync an InventoryItem from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export declare function syncInventoryItemToPrisma(prisma: PrismaClient, tenantId: string, entity: EntityInstance): Promise<void>;
/**
 * Load a RecipeVersion from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export declare function loadRecipeVersionFromPrisma(prisma: PrismaClient, tenantId: string, versionId: string): Promise<EntityInstance | undefined>;
/**
 * Sync a RecipeVersion from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export declare function syncRecipeVersionToPrisma(prisma: PrismaClient, tenantId: string, entity: EntityInstance): Promise<void>;
/**
 * Load an Ingredient from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export declare function loadIngredientFromPrisma(prisma: PrismaClient, tenantId: string, ingredientId: string): Promise<EntityInstance | undefined>;
/**
 * Sync an Ingredient from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export declare function syncIngredientToPrisma(prisma: PrismaClient, tenantId: string, entity: EntityInstance): Promise<void>;
/**
 * Load a RecipeIngredient from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export declare function loadRecipeIngredientFromPrisma(prisma: PrismaClient, tenantId: string, recipeIngredientId: string): Promise<EntityInstance | undefined>;
/**
 * Sync a RecipeIngredient from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export declare function syncRecipeIngredientToPrisma(prisma: PrismaClient, tenantId: string, entity: EntityInstance): Promise<void>;
/**
 * Configuration for PrismaStore
 */
export interface PrismaStoreConfig {
    prisma: PrismaClient;
    entityName: string;
    tenantId: string;
    outboxWriter: (tx: PrismaClient, events: unknown[]) => Promise<void>;
    eventCollector?: unknown[];
}
/**
 * Generic PrismaStore class that wraps entity-specific stores
 *
 * This class provides a unified interface for working with different entity types
 * through their Prisma-backed store implementations. It supports the outbox pattern
 * for reliable event delivery.
 */
export declare class PrismaStore implements Store<EntityInstance> {
    private readonly store;
    private readonly outboxWriter;
    private readonly eventCollector?;
    constructor(config: PrismaStoreConfig);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    /**
     * Write events to the outbox within a transaction
     *
     * This method is called by the manifest runtime to persist events
     * transactionally with state mutations.
     */
    writeEvents(events: unknown[]): Promise<void>;
}
/**
 * Create an outbox writer function for a given entity and tenant
 *
 * The outbox writer function writes events to the OutboxEvent table
 * within a Prisma transaction for reliable event delivery.
 *
 * @param entityName - The name of the entity (e.g., "PrepTask")
 * @param tenantId - The tenant ID for multi-tenant isolation
 * @returns A function that writes events to the outbox
 */
export declare function createPrismaOutboxWriter(entityName: string, tenantId: string): (tx: PrismaClient, events: unknown[]) => Promise<void>;
//# sourceMappingURL=prisma-store.d.ts.map