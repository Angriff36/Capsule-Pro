/**
 * Prisma stores for BROKEN_PRISMA_READ batch 01 (WasteEntry, Workflow).
 *
 * Pattern mirrors AlertsConfigPrismaStore in `../prisma-store.ts`.
 */
import { asBool, asJsonInput, asNullableDate, asNullableNumber, asNullableString, asString, reportOp, toDecimalInput, toDecimalRequired, } from "./shared";
// ---------------------------------------------------------------------------
// WasteEntry (tenant_kitchen.waste_entries)
// ---------------------------------------------------------------------------
export class WasteEntryPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.wasteEntry.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.wasteEntry.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.wasteEntry.create({
            data: {
                tenantId: this.tenantId,
                id,
                inventoryItemId: asString(data.inventoryItemId),
                reasonId: asNullableNumber(data.reasonId) ?? 0,
                quantity: toDecimalRequired(data.quantity),
                unitId: asNullableNumber(data.unitId),
                locationId: asNullableString(data.locationId),
                eventId: asNullableString(data.eventId),
                loggedBy: asString(data.loggedBy),
                loggedAt: asNullableDate(data.loggedAt) ?? new Date(),
                unitCost: toDecimalInput(data.unitCost),
                totalCost: toDecimalInput(data.totalCost),
                notes: asNullableString(data.notes),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.inventoryItemId !== undefined)
                patch.inventoryItemId = asString(data.inventoryItemId);
            if (data.reasonId !== undefined)
                patch.reasonId = asNullableNumber(data.reasonId) ?? 0;
            if (data.quantity !== undefined)
                patch.quantity = toDecimalInput(data.quantity);
            if (data.unitId !== undefined)
                patch.unitId = asNullableNumber(data.unitId);
            if (data.locationId !== undefined)
                patch.locationId = asNullableString(data.locationId);
            if (data.eventId !== undefined)
                patch.eventId = asNullableString(data.eventId);
            if (data.loggedBy !== undefined)
                patch.loggedBy = asString(data.loggedBy);
            if (data.loggedAt !== undefined)
                patch.loggedAt = asNullableDate(data.loggedAt);
            if (data.unitCost !== undefined)
                patch.unitCost = toDecimalInput(data.unitCost);
            if (data.totalCost !== undefined)
                patch.totalCost = toDecimalInput(data.totalCost);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            const row = await this.prisma.wasteEntry.update({
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
            await this.prisma.wasteEntry.update({
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
        await this.prisma.wasteEntry.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            inventoryItemId: r.inventoryItemId ?? "",
            reasonId: r.reasonId ?? 0,
            quantity: r.quantity ?? null,
            unitId: r.unitId ?? null,
            locationId: r.locationId ?? null,
            eventId: r.eventId ?? null,
            loggedBy: r.loggedBy ?? "",
            loggedAt: r.loggedAt ?? null,
            unitCost: r.unitCost ?? null,
            totalCost: r.totalCost ?? null,
            notes: r.notes ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// Workflow (tenant_admin.workflows)
// ---------------------------------------------------------------------------
export class WorkflowPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.workflow.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.workflow.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.workflow.create({
            data: {
                tenantId: this.tenantId,
                id,
                name: asString(data.name),
                description: asNullableString(data.description),
                trigger_type: asString(data.trigger_type ?? data.triggerType),
                triggerConfig: asJsonInput(data.triggerConfig),
                isActive: asBool(data.isActive, true),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.name !== undefined)
                patch.name = asString(data.name);
            if (data.description !== undefined)
                patch.description = asNullableString(data.description);
            if (data.trigger_type !== undefined)
                patch.trigger_type = asString(data.trigger_type);
            if (data.triggerType !== undefined)
                patch.trigger_type = asString(data.triggerType);
            if (data.triggerConfig !== undefined)
                patch.triggerConfig = asJsonInput(data.triggerConfig);
            if (data.isActive !== undefined)
                patch.isActive = asBool(data.isActive, true);
            const row = await this.prisma.workflow.update({
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
            await this.prisma.workflow.update({
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
        await this.prisma.workflow.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            name: r.name ?? "",
            description: r.description ?? null,
            trigger_type: r.trigger_type ?? "",
            triggerConfig: r.triggerConfig ?? {},
            isActive: r.isActive ?? true,
        };
    }
}
