/**
 * BROKEN_PRISMA_READ batch 13 — TrainingModule + VarianceReport Prisma stores.
 *
 * TrainingModule  — tenant_staff.training_modules  (all snake_case fields)
 * VarianceReport  — tenant_inventory.variance_reports (camelCase fields, many Decimals)
 */
import { asBool, asNullableDate, asNullableNumber, asNullableString, asString, reportOp, toDecimalInput, toDecimalRequired, } from "./shared.js";
// ---------------------------------------------------------------------------
// TrainingModulePrismaStore
// ---------------------------------------------------------------------------
export class TrainingModulePrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.trainingModule.findMany({
            where: { tenant_id: this.tenantId, deleted_at: null },
            orderBy: { created_at: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.trainingModule.findFirst({
            where: { tenant_id: this.tenantId, id, deleted_at: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.trainingModule.create({
            data: {
                tenant_id: this.tenantId,
                id,
                title: asString(data.title),
                description: asNullableString(data.description),
                content_url: asNullableString(data.content_url ?? data.contentUrl),
                content_type: asString(data.content_type ?? data.contentType) || "document",
                duration_minutes: asNullableNumber(data.duration_minutes ?? data.durationMinutes),
                category: asNullableString(data.category),
                is_required: asBool(data.is_required ?? data.isRequired, false),
                is_active: asBool(data.is_active ?? data.isActive, true),
                created_by: asNullableString(data.created_by ?? data.createdBy),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.title !== undefined)
                patch.title = asString(data.title);
            if (data.description !== undefined)
                patch.description = asNullableString(data.description);
            if (data.content_url !== undefined)
                patch.content_url = asNullableString(data.content_url);
            if (data.contentUrl !== undefined)
                patch.content_url = asNullableString(data.contentUrl);
            if (data.content_type !== undefined)
                patch.content_type = asString(data.content_type);
            if (data.contentType !== undefined)
                patch.content_type = asString(data.contentType);
            if (data.duration_minutes !== undefined)
                patch.duration_minutes = asNullableNumber(data.duration_minutes);
            if (data.durationMinutes !== undefined)
                patch.duration_minutes = asNullableNumber(data.durationMinutes);
            if (data.category !== undefined)
                patch.category = asNullableString(data.category);
            if (data.is_required !== undefined)
                patch.is_required = asBool(data.is_required);
            if (data.isRequired !== undefined)
                patch.is_required = asBool(data.isRequired);
            if (data.is_active !== undefined)
                patch.is_active = asBool(data.is_active);
            if (data.isActive !== undefined)
                patch.is_active = asBool(data.isActive);
            const updated = await this.prisma.trainingModule.update({
                where: { tenant_id_id: { tenant_id: this.tenantId, id } },
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
            await this.prisma.trainingModule.update({
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
        await this.prisma.trainingModule.deleteMany({
            where: { tenant_id: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            title: row.title ?? "",
            description: row.description ?? null,
            contentUrl: row.content_url ?? null,
            contentType: row.content_type ?? "document",
            durationMinutes: row.duration_minutes ?? null,
            category: row.category ?? null,
            isRequired: row.is_required ?? false,
            isActive: row.is_active ?? true,
            createdBy: row.created_by ?? null,
            createdAt: row.created_at
                ? new Date(row.created_at).getTime()
                : 0,
            updatedAt: row.updated_at
                ? new Date(row.updated_at).getTime()
                : 0,
            deletedAt: row.deleted_at
                ? new Date(row.deleted_at).getTime()
                : null,
        };
    }
}
// ---------------------------------------------------------------------------
// VarianceReportPrismaStore
// ---------------------------------------------------------------------------
export class VarianceReportPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.varianceReport.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.varianceReport.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.varianceReport.create({
            data: {
                tenantId: this.tenantId,
                id,
                sessionId: asString(data.sessionId),
                reportType: asString(data.reportType),
                itemId: asString(data.itemId),
                itemNumber: asString(data.itemNumber),
                itemName: asString(data.itemName),
                expectedQuantity: toDecimalRequired(data.expectedQuantity, 0),
                countedQuantity: toDecimalRequired(data.countedQuantity, 0),
                variance: toDecimalRequired(data.variance, 0),
                variancePct: toDecimalRequired(data.variancePct, 0),
                accuracyScore: toDecimalRequired(data.accuracyScore, 0),
                status: asString(data.status) || "pending",
                adjustmentType: asNullableString(data.adjustmentType),
                adjustmentAmount: toDecimalInput(data.adjustmentAmount),
                adjustmentDate: asNullableDate(data.adjustmentDate),
                notes: asNullableString(data.notes),
                rootCause: asNullableString(data.rootCause),
                resolutionNotes: asNullableString(data.resolutionNotes),
                resolvedById: asNullableString(data.resolvedById),
                resolvedAt: asNullableDate(data.resolvedAt),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.status !== undefined)
                patch.status = asString(data.status);
            if (data.adjustmentType !== undefined)
                patch.adjustmentType = asNullableString(data.adjustmentType);
            if (data.adjustmentAmount !== undefined)
                patch.adjustmentAmount = toDecimalInput(data.adjustmentAmount);
            if (data.adjustmentDate !== undefined)
                patch.adjustmentDate = asNullableDate(data.adjustmentDate);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            if (data.rootCause !== undefined)
                patch.rootCause = asNullableString(data.rootCause);
            if (data.resolutionNotes !== undefined)
                patch.resolutionNotes = asNullableString(data.resolutionNotes);
            if (data.resolvedById !== undefined)
                patch.resolvedById = asNullableString(data.resolvedById);
            if (data.resolvedAt !== undefined)
                patch.resolvedAt = asNullableDate(data.resolvedAt);
            const updated = await this.prisma.varianceReport.update({
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
            await this.prisma.varianceReport.update({
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
        await this.prisma.varianceReport.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            sessionId: row.sessionId ?? "",
            reportType: row.reportType ?? "",
            itemId: row.itemId ?? "",
            itemNumber: row.itemNumber ?? "",
            itemName: row.itemName ?? "",
            expectedQuantity: String(row.expectedQuantity ?? "0"),
            countedQuantity: String(row.countedQuantity ?? "0"),
            variance: String(row.variance ?? "0"),
            variancePct: String(row.variancePct ?? "0"),
            accuracyScore: String(row.accuracyScore ?? "0"),
            status: row.status ?? "pending",
            adjustmentType: row.adjustmentType ?? null,
            adjustmentAmount: row.adjustmentAmount != null ? String(row.adjustmentAmount) : null,
            adjustmentDate: row.adjustmentDate
                ? new Date(row.adjustmentDate).getTime()
                : null,
            notes: row.notes ?? null,
            rootCause: row.rootCause ?? null,
            resolutionNotes: row.resolutionNotes ?? null,
            resolvedById: row.resolvedById ?? null,
            resolvedAt: row.resolvedAt
                ? new Date(row.resolvedAt).getTime()
                : null,
            generatedAt: row.generatedAt
                ? new Date(row.generatedAt).getTime()
                : 0,
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
