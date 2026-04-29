/**
 * BROKEN_PRISMA_READ batch 09 — Ingredient store.
 *
 * Ingredient → tenant_kitchen.ingredients
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Nullable Decimal: densityGPerMl
 *   - Nullable Int/SmallInt: shelfLifeDays
 *   - Nullable String: category, storageInstructions
 *   - String[]: allergens
 *   - Boolean: isActive
 *
 * Replaces the inline IngredientPrismaStore in prisma-store.ts.
 * Soft-deletes via deletedAt.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared.js";
export declare class IngredientPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch09-ingredient.d.ts.map