/**
 * OverrideAudit Prisma Store — BROKEN_PRISMA_READ Batch 11
 *
 * override_audit is an append-only audit table in tenant_kitchen.
 * No deletedAt or updatedAt columns — hard-delete semantics for delete(),
 * no soft-delete filtering in getAll/getById.
 */
import { asNullableString, asString, reportOp, } from "./shared.js";
export class OverrideAuditPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.overrideAudit.findMany({
            where: { tenantId: this.tenantId },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.overrideAudit.findFirst({
            where: { tenantId: this.tenantId, id },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.overrideAudit.create({
            data: {
                tenantId: this.tenantId,
                id,
                entityType: asString(data.entityType),
                entityId: asString(data.entityId),
                constraintId: asString(data.constraintId),
                guardExpression: asNullableString(data.guardExpression),
                overriddenBy: asString(data.overriddenBy),
                overrideReason: asString(data.overrideReason),
                authorizedBy: asNullableString(data.authorizedBy),
                authorizedAt: data.authorizedAt
                    ? new Date(data.authorizedAt)
                    : null,
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.guardExpression !== undefined)
                patch.guardExpression = data.guardExpression;
            if (data.overrideReason !== undefined)
                patch.overrideReason = data.overrideReason;
            if (data.authorizedBy !== undefined)
                patch.authorizedBy = data.authorizedBy;
            if (data.authorizedAt !== undefined)
                patch.authorizedAt = data.authorizedAt
                    ? new Date(data.authorizedAt)
                    : null;
            const updated = await this.prisma.overrideAudit.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: patch,
            });
            return this.mapToManifestEntity(updated);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            // Hard delete — no deletedAt column
            await this.prisma.overrideAudit.delete({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.overrideAudit.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            entityType: row.entityType ?? "",
            entityId: row.entityId ?? "",
            constraintId: row.constraintId ?? "",
            guardExpression: row.guardExpression ?? null,
            overriddenBy: row.overriddenBy ?? "",
            overrideReason: row.overrideReason ?? "",
            authorizedBy: row.authorizedBy ?? null,
            authorizedAt: row.authorizedAt
                ? new Date(row.authorizedAt).getTime()
                : null,
            createdAt: row.createdAt
                ? new Date(row.createdAt).getTime()
                : 0,
        };
    }
}
