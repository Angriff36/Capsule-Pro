/**
 * PrepComment + PricingTier Prisma Stores — BROKEN_PRISMA_READ Batch 12
 *
 * PrepCommentPrismaStore — prep_comments table in tenant_kitchen.
 *   CamelCase Prisma fields, soft-delete via deletedAt.
 *
 * PricingTierPrismaStore — pricing_tiers table in tenant_inventory.
 *   CamelCase Prisma fields, soft-delete via deletedAt.
 *   Decimal fields for minQuantity, maxQuantity, unitCost, discountPercent.
 */
import { asBool, asNullableDate, asNullableString, asString, reportOp, toDecimalInput, toDecimalRequired, } from "./shared";
// ---------------------------------------------------------------------------
// PrepCommentPrismaStore
// ---------------------------------------------------------------------------
export class PrepCommentPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.prepComment.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.prepComment.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.prepComment.create({
            data: {
                tenantId: this.tenantId,
                id,
                taskId: asString(data.taskId),
                employeeId: asString(data.employeeId),
                commentText: asString(data.commentText),
                isResolved: asBool(data.isResolved, false),
                resolvedAt: asNullableDate(data.resolvedAt),
                resolvedBy: asNullableString(data.resolvedBy),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.commentText !== undefined)
                patch.commentText = data.commentText;
            if (data.isResolved !== undefined)
                patch.isResolved = data.isResolved;
            if (data.resolvedAt !== undefined)
                patch.resolvedAt = asNullableDate(data.resolvedAt);
            if (data.resolvedBy !== undefined)
                patch.resolvedBy = asNullableString(data.resolvedBy);
            const updated = await this.prisma.prepComment.update({
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
            await this.prisma.prepComment.update({
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
        await this.prisma.prepComment.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            taskId: row.taskId ?? "",
            employeeId: row.employeeId ?? "",
            commentText: row.commentText ?? "",
            isResolved: row.isResolved ?? false,
            resolvedAt: row.resolvedAt
                ? new Date(row.resolvedAt).getTime()
                : null,
            resolvedBy: row.resolvedBy ?? null,
            createdAt: row.createdAt
                ? new Date(row.createdAt).getTime()
                : 0,
            updatedAt: row.updatedAt
                ? new Date(row.updatedAt).getTime()
                : 0,
            deletedAt: row.deletedAt
                ? new Date(row.deletedAt).getTime()
                : null,
        };
    }
}
// ---------------------------------------------------------------------------
// PricingTierPrismaStore
// ---------------------------------------------------------------------------
export class PricingTierPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.pricingTier.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.pricingTier.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.pricingTier.create({
            data: {
                tenantId: this.tenantId,
                id,
                catalogEntryId: asString(data.catalogEntryId),
                tierName: asString(data.tierName),
                minQuantity: toDecimalRequired(data.minQuantity, 0),
                maxQuantity: toDecimalInput(data.maxQuantity),
                unitCost: toDecimalRequired(data.unitCost, 0),
                discountPercent: toDecimalInput(data.discountPercent),
                effectiveFrom: asNullableDate(data.effectiveFrom),
                effectiveTo: asNullableDate(data.effectiveTo),
                isActive: asBool(data.isActive, true),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.tierName !== undefined)
                patch.tierName = data.tierName;
            if (data.minQuantity !== undefined)
                patch.minQuantity = toDecimalRequired(data.minQuantity, 0);
            if (data.maxQuantity !== undefined)
                patch.maxQuantity = toDecimalInput(data.maxQuantity);
            if (data.unitCost !== undefined)
                patch.unitCost = toDecimalRequired(data.unitCost, 0);
            if (data.discountPercent !== undefined)
                patch.discountPercent = toDecimalInput(data.discountPercent);
            if (data.effectiveFrom !== undefined)
                patch.effectiveFrom = asNullableDate(data.effectiveFrom);
            if (data.effectiveTo !== undefined)
                patch.effectiveTo = asNullableDate(data.effectiveTo);
            if (data.isActive !== undefined)
                patch.isActive = data.isActive;
            const updated = await this.prisma.pricingTier.update({
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
            await this.prisma.pricingTier.update({
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
        await this.prisma.pricingTier.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            catalogEntryId: row.catalogEntryId ?? "",
            tierName: row.tierName ?? "",
            minQuantity: Number(row.minQuantity ?? 0),
            maxQuantity: row.maxQuantity != null ? Number(row.maxQuantity) : null,
            unitCost: Number(row.unitCost ?? 0),
            discountPercent: row.discountPercent != null ? Number(row.discountPercent) : null,
            effectiveFrom: row.effectiveFrom
                ? new Date(row.effectiveFrom).getTime()
                : null,
            effectiveTo: row.effectiveTo
                ? new Date(row.effectiveTo).getTime()
                : null,
            isActive: row.isActive ?? true,
            createdAt: row.createdAt
                ? new Date(row.createdAt).getTime()
                : 0,
            updatedAt: row.updatedAt
                ? new Date(row.updatedAt).getTime()
                : 0,
            deletedAt: row.deletedAt
                ? new Date(row.deletedAt).getTime()
                : null,
        };
    }
}
