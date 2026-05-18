/**
 * BROKEN_PRISMA_READ batch 13 — ScheduleShift + ShipmentItem Prisma stores.
 *
 * ScheduleShift — tenant_staff.schedule_shifts  (mixed: camelCase + snake_case shift_start/shift_end/role_during_shift)
 * ShipmentItem  — tenant_inventory.shipment_items (camelCase, Decimals)
 */
import { asNullableDate, asNullableNumber, asNullableString, asString, reportOp, toDecimalInput, toDecimalRequired, } from "./shared";
// ---------------------------------------------------------------------------
// ScheduleShiftPrismaStore
// ---------------------------------------------------------------------------
export class ScheduleShiftPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.scheduleShift.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.scheduleShift.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.scheduleShift.create({
            data: {
                tenantId: this.tenantId,
                id,
                scheduleId: asString(data.scheduleId),
                employeeId: asString(data.employeeId),
                locationId: asString(data.locationId),
                shift_start: asNullableDate(data.shift_start ?? data.shiftStart) ?? new Date(),
                shift_end: asNullableDate(data.shift_end ?? data.shiftEnd) ?? new Date(),
                role_during_shift: asNullableString(data.role_during_shift ?? data.roleDuringShift),
                notes: asNullableString(data.notes),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.shift_start !== undefined)
                patch.shift_start = asNullableDate(data.shift_start);
            if (data.shiftStart !== undefined)
                patch.shift_start = asNullableDate(data.shiftStart);
            if (data.shift_end !== undefined)
                patch.shift_end = asNullableDate(data.shift_end);
            if (data.shiftEnd !== undefined)
                patch.shift_end = asNullableDate(data.shiftEnd);
            if (data.role_during_shift !== undefined)
                patch.role_during_shift = asNullableString(data.role_during_shift);
            if (data.roleDuringShift !== undefined)
                patch.role_during_shift = asNullableString(data.roleDuringShift);
            if (data.notes !== undefined)
                patch.notes = asNullableString(data.notes);
            const updated = await this.prisma.scheduleShift.update({
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
            await this.prisma.scheduleShift.update({
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
        await this.prisma.scheduleShift.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            scheduleId: row.scheduleId ?? "",
            employeeId: row.employeeId ?? "",
            locationId: row.locationId ?? "",
            shiftStart: row.shift_start
                ? new Date(row.shift_start).getTime()
                : 0,
            shiftEnd: row.shift_end
                ? new Date(row.shift_end).getTime()
                : 0,
            roleDuringShift: row.role_during_shift ?? null,
            notes: row.notes ?? null,
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
// ShipmentItemPrismaStore
// ---------------------------------------------------------------------------
export class ShipmentItemPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.shipmentItem.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.shipmentItem.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.shipmentItem.create({
            data: {
                tenantId: this.tenantId,
                id,
                shipmentId: asString(data.shipmentId),
                itemId: asString(data.itemId),
                quantityShipped: toDecimalRequired(data.quantityShipped, 0),
                quantityReceived: toDecimalRequired(data.quantityReceived, 0),
                quantityDamaged: toDecimalRequired(data.quantityDamaged, 0),
                unitId: asNullableNumber(data.unitId),
                unitCost: toDecimalInput(data.unitCost),
                totalCost: toDecimalRequired(data.totalCost, 0),
                condition: asNullableString(data.condition) ?? "good",
                conditionNotes: asNullableString(data.conditionNotes),
                lotNumber: asNullableString(data.lotNumber),
                expirationDate: asNullableDate(data.expirationDate),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.quantityShipped !== undefined)
                patch.quantityShipped = toDecimalRequired(data.quantityShipped, 0);
            if (data.quantityReceived !== undefined)
                patch.quantityReceived = toDecimalRequired(data.quantityReceived, 0);
            if (data.quantityDamaged !== undefined)
                patch.quantityDamaged = toDecimalRequired(data.quantityDamaged, 0);
            if (data.unitId !== undefined)
                patch.unitId = asNullableNumber(data.unitId);
            if (data.unitCost !== undefined)
                patch.unitCost = toDecimalInput(data.unitCost);
            if (data.totalCost !== undefined)
                patch.totalCost = toDecimalRequired(data.totalCost, 0);
            if (data.condition !== undefined)
                patch.condition = asNullableString(data.condition);
            if (data.conditionNotes !== undefined)
                patch.conditionNotes = asNullableString(data.conditionNotes);
            if (data.lotNumber !== undefined)
                patch.lotNumber = asNullableString(data.lotNumber);
            if (data.expirationDate !== undefined)
                patch.expirationDate = asNullableDate(data.expirationDate);
            const updated = await this.prisma.shipmentItem.update({
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
            await this.prisma.shipmentItem.update({
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
        await this.prisma.shipmentItem.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            shipmentId: row.shipmentId ?? "",
            itemId: row.itemId ?? "",
            quantityShipped: String(row.quantityShipped ?? "0"),
            quantityReceived: String(row.quantityReceived ?? "0"),
            quantityDamaged: String(row.quantityDamaged ?? "0"),
            unitId: row.unitId ?? null,
            unitCost: row.unitCost != null ? String(row.unitCost) : null,
            totalCost: String(row.totalCost ?? "0"),
            condition: row.condition ?? "good",
            conditionNotes: row.conditionNotes ?? null,
            lotNumber: row.lotNumber ?? null,
            expirationDate: row.expirationDate
                ? new Date(row.expirationDate).getTime()
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
