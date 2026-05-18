/**
 * OverrideAudit Prisma Store — BROKEN_PRISMA_READ Batch 11
 *
 * override_audit is an append-only audit table in tenant_kitchen.
 * No deletedAt or updatedAt columns — hard-delete semantics for delete(),
 * no soft-delete filtering in getAll/getById.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class OverrideAuditPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch11-override-audit.d.ts.map