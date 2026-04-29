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
import { asBool, asJsonInput, asNullableDate, asNullableString, asString, reportOp, } from "./shared.js";
// ---------------------------------------------------------------------------
// EmailTemplatePrismaStore  (tenant_admin.email_templates — snake_case)
// ---------------------------------------------------------------------------
export class EmailTemplatePrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.email_templates.findMany({
            where: { tenant_id: this.tenantId, deleted_at: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.email_templates.findFirst({
            where: { tenant_id: this.tenantId, id, deleted_at: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.email_templates.create({
            data: {
                tenant_id: this.tenantId,
                id,
                name: data.name,
                subject: data.subject,
                body: data.body,
                template_type: asString(data.template_type),
                merge_fields: asJsonInput(data.merge_fields),
                is_active: asBool(data.is_active, true),
                is_default: asBool(data.is_default, false),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.name !== undefined)
                patch.name = data.name;
            if (data.subject !== undefined)
                patch.subject = data.subject;
            if (data.body !== undefined)
                patch.body = data.body;
            if (data.template_type !== undefined)
                patch.template_type = asString(data.template_type);
            if (data.merge_fields !== undefined)
                patch.merge_fields = asJsonInput(data.merge_fields);
            if (data.is_active !== undefined)
                patch.is_active = asBool(data.is_active, true);
            if (data.is_default !== undefined)
                patch.is_default = asBool(data.is_default, false);
            const row = await this.prisma.email_templates.update({
                where: { tenant_id_id: { tenant_id: this.tenantId, id } },
                data: patch,
            });
            return this.mapToManifestEntity(row);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.email_templates.update({
                where: { tenant_id_id: { tenant_id: this.tenantId, id } },
                data: { deleted_at: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.email_templates.deleteMany({
            where: { tenant_id: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenant_id: r.tenant_id,
            name: r.name ?? null,
            subject: r.subject ?? null,
            body: r.body ?? null,
            template_type: r.template_type ?? null,
            merge_fields: r.merge_fields ?? [],
            is_active: r.is_active ?? true,
            is_default: r.is_default ?? false,
            created_at: r.created_at ?? null,
            updated_at: r.updated_at ?? null,
            deleted_at: r.deleted_at ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// EmailWorkflowPrismaStore  (tenant_admin.email_workflows — camelCase)
// ---------------------------------------------------------------------------
export class EmailWorkflowPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.emailWorkflow.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.emailWorkflow.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.emailWorkflow.create({
            data: {
                tenantId: this.tenantId,
                id,
                name: data.name,
                triggerType: asString(data.triggerType),
                triggerConfig: asJsonInput(data.triggerConfig),
                recipientConfig: asJsonInput(data.recipientConfig),
                emailTemplateId: asNullableString(data.emailTemplateId),
                emailTemplateTenantId: asNullableString(data.emailTemplateTenantId),
                lastTriggeredAt: asNullableDate(data.lastTriggeredAt),
                isActive: asBool(data.isActive, true),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.name !== undefined)
                patch.name = data.name;
            if (data.triggerType !== undefined)
                patch.triggerType = asString(data.triggerType);
            if (data.triggerConfig !== undefined)
                patch.triggerConfig = asJsonInput(data.triggerConfig);
            if (data.recipientConfig !== undefined)
                patch.recipientConfig = asJsonInput(data.recipientConfig);
            if (data.emailTemplateId !== undefined)
                patch.emailTemplateId = asNullableString(data.emailTemplateId);
            if (data.emailTemplateTenantId !== undefined)
                patch.emailTemplateTenantId = asNullableString(data.emailTemplateTenantId);
            if (data.lastTriggeredAt !== undefined)
                patch.lastTriggeredAt = asNullableDate(data.lastTriggeredAt);
            if (data.isActive !== undefined)
                patch.isActive = asBool(data.isActive, true);
            const row = await this.prisma.emailWorkflow.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: patch,
            });
            return this.mapToManifestEntity(row);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.emailWorkflow.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.emailWorkflow.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            name: r.name ?? null,
            triggerType: r.triggerType ?? null,
            triggerConfig: r.triggerConfig ?? {},
            recipientConfig: r.recipientConfig ?? {},
            emailTemplateId: r.emailTemplateId ?? null,
            emailTemplateTenantId: r.emailTemplateTenantId ?? null,
            lastTriggeredAt: r.lastTriggeredAt ?? null,
            isActive: r.isActive ?? true,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
