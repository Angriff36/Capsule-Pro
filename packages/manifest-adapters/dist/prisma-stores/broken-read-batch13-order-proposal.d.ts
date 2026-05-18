/**
 * BROKEN_PRISMA_READ batch 13 — PurchaseOrderItem + ProposalLineItem Prisma stores.
 *
 * PurchaseOrderItem — tenant_inventory.purchase_order_items (camelCase, Decimals)
 * ProposalLineItem  — tenant_crm.proposal_line_items         (camelCase, Decimals)
 */
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class PurchaseOrderItemPrismaStore implements Store<EntityInstance> {
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
export declare class ProposalLineItemPrismaStore implements Store<EntityInstance> {
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
interface Store<T> {
    getAll(): Promise<T[]>;
    getById(id: string): Promise<T | undefined>;
    create(data: Partial<T>): Promise<T>;
    update(id: string, data: Partial<T>): Promise<T | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
}
export {};
//# sourceMappingURL=broken-read-batch13-order-proposal.d.ts.map