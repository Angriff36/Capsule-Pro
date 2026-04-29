/**
 * InventoryTransaction Prisma Store — BROKEN_PRISMA_READ Batch 10
 *
 * inventory_transactions uses mixed snake_case/camelCase Prisma field names
 * (unit_cost, total_cost, transaction_date, storage_location_id, employee_id
 * are snake_case WITHOUT @map). It has NO deletedAt and NO updatedAt columns,
 * so this store uses hard-delete semantics and omits soft-delete filtering.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared.js";
export declare class InventoryTransactionPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch10-inventory-transaction.d.ts.map