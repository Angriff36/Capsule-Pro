/**
 * BROKEN_RAW_SQL parent workflow — PurchaseOrder Prisma store.
 *
 * PurchaseOrder — tenant_inventory.purchase_orders
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Required Decimals (default 0): subtotal, taxAmount, shippingAmount, total
 *   - Status lifecycle: draft → submitted → approved → ordered → received / cancelled
 *   - Timestamp fields: submittedAt, receivedAt
 *   - Soft-delete via deletedAt
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class PurchaseOrderPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-po-parent.d.ts.map