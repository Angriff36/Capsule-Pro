/**
 * BROKEN_RAW_SQL parent workflow — Proposal Prisma store.
 *
 * Proposal — tenant_crm.proposals
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Required Decimals (default 0): subtotal, taxRate, taxAmount,
 *     discountAmount, total
 *   - Status lifecycle: draft → sent → viewed → accepted / rejected / expired
 *   - Timestamp fields: sentAt, viewedAt, acceptedAt, rejectedAt
 *   - Soft-delete via deletedAt
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared.js";
export declare class ProposalPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-proposal-parent.d.ts.map