/**
 * BROKEN_PRISMA_READ batch 06 — EmailTemplate + EmailWorkflow stores.
 *
 * EmailTemplate  → tenant_admin.email_templates
 *   - Snake_case Prisma model & fields (email_templates, tenant_id, deleted_at, etc.)
 *   - Composite key: tenant_id_id
 *   - Enum field: template_type (email_template_type)
 *   - JSON field: merge_fields (default "[]")
 *
 * EmailWorkflow  → tenant_admin.email_workflows
 *   - CamelCase Prisma model & fields
 *   - Composite key: tenantId_id
 *   - Enum field: triggerType (email_trigger_type)
 *   - JSON fields: triggerConfig, recipientConfig (default "{}")
 *
 * Both soft-delete via their respective deletedAt / deleted_at fields.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class EmailTemplatePrismaStore implements Store<EntityInstance> {
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
export declare class EmailWorkflowPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch06-email.d.ts.map