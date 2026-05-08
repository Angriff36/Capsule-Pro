/**
 * LaborBudget + Lead Prisma Stores — BROKEN_PRISMA_READ Batch 10
 *
 * Both entities use clean camelCase Prisma field names with @map for
 * snake_case DB columns. Standard soft-delete via deletedAt.
 */
import { asBool, asNullableNumber, asNullableString, asString, reportOp, toDecimalInput, toDecimalRequired, } from "./shared.js";
// ---------------------------------------------------------------------------
// LaborBudgetPrismaStore
// ---------------------------------------------------------------------------
export class LaborBudgetPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.laborBudget.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.laborBudget.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.laborBudget.create({
            data: {
                tenantId: this.tenantId,
                id,
                locationId: asNullableString(data.locationId),
                eventId: asNullableString(data.eventId),
                name: data.name ?? "",
                description: asNullableString(data.description),
                budgetType: data.budgetType ?? "monthly",
                periodStart: data.periodStart
                    ? new Date(data.periodStart)
                    : null,
                periodEnd: data.periodEnd
                    ? new Date(data.periodEnd)
                    : null,
                budgetTarget: toDecimalRequired(data.budgetTarget, 0),
                budgetUnit: data.budgetUnit ?? "hours",
                actualSpend: toDecimalInput(data.actualSpend),
                threshold80Pct: asBool(data.threshold80Pct, true),
                threshold90Pct: asBool(data.threshold90Pct, true),
                threshold100Pct: asBool(data.threshold100Pct, true),
                status: data.status ?? "active",
                overrideReason: asNullableString(data.overrideReason),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.locationId !== undefined)
                patch.locationId = data.locationId;
            if (data.eventId !== undefined)
                patch.eventId = data.eventId;
            if (data.name !== undefined)
                patch.name = data.name;
            if (data.description !== undefined)
                patch.description = data.description;
            if (data.budgetType !== undefined)
                patch.budgetType = data.budgetType;
            if (data.periodStart !== undefined)
                patch.periodStart = data.periodStart
                    ? new Date(data.periodStart)
                    : null;
            if (data.periodEnd !== undefined)
                patch.periodEnd = data.periodEnd
                    ? new Date(data.periodEnd)
                    : null;
            if (data.budgetTarget !== undefined)
                patch.budgetTarget = toDecimalRequired(data.budgetTarget, 0);
            if (data.budgetUnit !== undefined)
                patch.budgetUnit = data.budgetUnit;
            if (data.actualSpend !== undefined)
                patch.actualSpend = toDecimalInput(data.actualSpend);
            if (data.threshold80Pct !== undefined)
                patch.threshold80Pct = data.threshold80Pct;
            if (data.threshold90Pct !== undefined)
                patch.threshold90Pct = data.threshold90Pct;
            if (data.threshold100Pct !== undefined)
                patch.threshold100Pct = data.threshold100Pct;
            if (data.status !== undefined)
                patch.status = data.status;
            if (data.overrideReason !== undefined)
                patch.overrideReason = data.overrideReason;
            const updated = await this.prisma.laborBudget.update({
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
            await this.prisma.laborBudget.update({
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
        await this.prisma.laborBudget.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            locationId: row.locationId ?? null,
            eventId: row.eventId ?? null,
            name: row.name ?? "",
            description: row.description ?? null,
            budgetType: row.budgetType ?? "monthly",
            periodStart: row.periodStart
                ? new Date(row.periodStart).getTime()
                : null,
            periodEnd: row.periodEnd
                ? new Date(row.periodEnd).getTime()
                : null,
            budgetTarget: Number(row.budgetTarget ?? 0),
            budgetUnit: row.budgetUnit ?? "hours",
            actualSpend: row.actualSpend != null ? Number(row.actualSpend) : null,
            threshold80Pct: row.threshold80Pct ?? true,
            threshold90Pct: row.threshold90Pct ?? true,
            threshold100Pct: row.threshold100Pct ?? true,
            status: row.status ?? "active",
            overrideReason: row.overrideReason ?? null,
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
// LeadPrismaStore
// ---------------------------------------------------------------------------
export class LeadPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.lead.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.lead.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.lead.create({
            data: {
                tenantId: this.tenantId,
                id,
                source: asNullableString(data.source),
                companyName: asNullableString(data.companyName),
                contactName: asString(data.contactName),
                contactEmail: asNullableString(data.contactEmail),
                contactPhone: asNullableString(data.contactPhone),
                eventType: asNullableString(data.eventType),
                eventDate: data.eventDate
                    ? new Date(data.eventDate)
                    : null,
                estimatedGuests: asNullableNumber(data.estimatedGuests),
                estimatedValue: toDecimalInput(data.estimatedValue),
                status: data.status ?? "new",
                assignedTo: asNullableString(data.assignedTo),
                notes: asNullableString(data.notes),
                convertedToClientId: asNullableString(data.convertedToClientId),
                convertedAt: data.convertedAt
                    ? new Date(data.convertedAt)
                    : null,
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.source !== undefined)
                patch.source = data.source;
            if (data.companyName !== undefined)
                patch.companyName = data.companyName;
            if (data.contactName !== undefined)
                patch.contactName = data.contactName;
            if (data.contactEmail !== undefined)
                patch.contactEmail = data.contactEmail;
            if (data.contactPhone !== undefined)
                patch.contactPhone = data.contactPhone;
            if (data.eventType !== undefined)
                patch.eventType = data.eventType;
            if (data.eventDate !== undefined)
                patch.eventDate = data.eventDate
                    ? new Date(data.eventDate)
                    : null;
            if (data.estimatedGuests !== undefined)
                patch.estimatedGuests = data.estimatedGuests;
            if (data.estimatedValue !== undefined)
                patch.estimatedValue = toDecimalInput(data.estimatedValue);
            if (data.status !== undefined)
                patch.status = data.status;
            if (data.assignedTo !== undefined)
                patch.assignedTo = data.assignedTo;
            if (data.notes !== undefined)
                patch.notes = data.notes;
            if (data.convertedToClientId !== undefined)
                patch.convertedToClientId = data.convertedToClientId;
            if (data.convertedAt !== undefined)
                patch.convertedAt = data.convertedAt
                    ? new Date(data.convertedAt)
                    : null;
            const updated = await this.prisma.lead.update({
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
            await this.prisma.lead.update({
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
        await this.prisma.lead.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            source: row.source ?? null,
            companyName: row.companyName ?? null,
            contactName: row.contactName ?? "",
            contactEmail: row.contactEmail ?? null,
            contactPhone: row.contactPhone ?? null,
            eventType: row.eventType ?? null,
            eventDate: row.eventDate
                ? new Date(row.eventDate).getTime()
                : null,
            estimatedGuests: row.estimatedGuests != null ? Number(row.estimatedGuests) : null,
            estimatedValue: row.estimatedValue != null ? Number(row.estimatedValue) : null,
            status: row.status ?? "new",
            assignedTo: row.assignedTo ?? null,
            notes: row.notes ?? null,
            convertedToClientId: row.convertedToClientId ?? null,
            convertedAt: row.convertedAt
                ? new Date(row.convertedAt).getTime()
                : null,
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
