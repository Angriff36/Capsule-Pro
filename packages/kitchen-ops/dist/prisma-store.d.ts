/**
 * Prisma-backed store for Manifest entities
 *
 * This module provides Store implementations that persist Manifest entities
 * using the existing Prisma schema. It bridges the gap between Manifest's entity
 * model and the Prisma database tables.
 */
import type { PrismaClient } from "@repo/database";
import type { Store } from "@repo/manifest";
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
    private prisma;
    private tenantId;
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
    private prisma;
    private tenantId;
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
    private prisma;
    private tenantId;
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
 * Prisma-backed store for Ingredient entities
 *
 * Maps Manifest Ingredient entities to the Prisma Ingredient table.
 */
export declare class IngredientPrismaStore implements Store<EntityInstance> {
    private prisma;
    private tenantId;
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
 * Prisma-backed store for RecipeIngredient entities
 *
 * Maps Manifest RecipeIngredient entities to the Prisma RecipeIngredient table.
 */
export declare class RecipeIngredientPrismaStore implements Store<EntityInstance> {
    private prisma;
    private tenantId;
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
 * Prisma-backed store for Dish entities
 *
 * Maps Manifest Dish entities to the Prisma Dish table.
 */
export declare class DishPrismaStore implements Store<EntityInstance> {
    private prisma;
    private tenantId;
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
    private prisma;
    private tenantId;
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
    private prisma;
    private tenantId;
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
//# sourceMappingURL=prisma-store.d.ts.map