/**
 * BROKEN_RAW_SQL parent workflow — PurchaseRequisition Prisma store.
 *
 * PurchaseRequisition — tenant_inventory.purchase_requisitions
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Required Decimals (default 0): subtotal, estimatedTax, estimatedShipping, estimatedTotal
 *   - Status lifecycle: draft → pending → approved → rejected / converted
 *   - Approval chain: managerApproval → financeApproval
 *   - Soft-delete via deletedAt
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class PurchaseRequisitionPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-requisition-parent.d.ts.map