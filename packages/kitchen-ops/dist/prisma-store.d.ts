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
//# sourceMappingURL=prisma-store.d.ts.map