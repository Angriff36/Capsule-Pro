/**
 * BROKEN_PRISMA_READ batch 09 — InventoryItem + InventorySupplier stores.
 *
 * InventoryItem → tenant_inventory.inventory_items
 *   - MIXED Prisma field naming: some camelCase with @map, some snake_case without @map
 *   - Composite key: tenantId_id
 *   - Required Decimal: unitCost, quantityOnHand, parLevel, reorder_level
 *   - Nullable String: description, supplierId, fsa_status
 *   - String[]: tags
 *   - Nullable Boolean: fsa_temp_logged, fsa_allergen_info, fsa_traceable
 *   - Required String: item_number, name, category
 *
 * InventorySupplier → tenant_inventory.inventory_suppliers
 *   - MIXED Prisma field naming: some camelCase with @map, some snake_case without @map
 *   - Composite key: tenantId_id
 *   - Required Json: connectorCredentials
 *   - String[]: tags
 *   - Nullable String: contact_person, email, phone, connectorType, notes
 *   - Required String: supplier_number, name, payment_terms
 *
 * Replaces the inline InventoryItemPrismaStore in prisma-store.ts.
 * Both soft-delete via deletedAt.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared.js";
export declare class InventoryItemPrismaStore implements Store<EntityInstance> {
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
export declare class InventorySupplierPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch09-inventory.d.ts.map