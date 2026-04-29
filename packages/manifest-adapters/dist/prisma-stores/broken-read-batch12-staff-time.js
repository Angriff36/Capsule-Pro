/**
 * Staff + Time Prisma Stores — BROKEN_PRISMA_READ Batch 12
 *
 * TimeEntryPrismaStore — time_entries table in tenant_staff.
 *   Mixed naming: camelCase (tenantId, employeeId, clockIn) alongside
 *   snake_case (shift_id, approved_by, approved_at, deleted_at).
 *   Soft-delete via deleted_at (snake_case). Composite key tenantId_id.
 *
 * TimecardEditRequestPrismaStore — timecard_edit_requests table in tenant_staff.
 *   CamelCase Prisma fields, NO soft-delete (hard delete).
 *   Composite key tenantId_id.
 *
 * TrainingAssignmentPrismaStore — training_assignments table in tenant_staff.
 *   All snake_case Prisma field names, soft-delete via deleted_at.
 *   Composite key tenant_id_id.
 */
import { asBool, asNullableDate, asNullableNumber, asNullableString, asString, reportOp, } from "./shared.js";
// ---------------------------------------------------------------------------
// TimeEntryPrismaStore
// ---------------------------------------------------------------------------
export class TimeEntryPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.timeEntry.findMany({
            where: { tenantId: this.tenantId, deleted_at: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.timeEntry.findFirst({
            where: { tenantId: this.tenantId, id, deleted_at: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.timeEntry.create({
            data: {
                tenantId: this.tenantId,
                id,
                employeeId: asString(data.employeeId),
                locationId: asNullableString(data.locationId),
                shift_id: asNullableString(data.shiftId ?? data.shift_id),
                clockIn: data.clockIn
                    ? new Date(data.clockIn)
                    : new Date(),
                clockOut: asNullableDate(data.clockOut),
                breakMinutes: data.breakMinutes ?? 0,
                notes: asNullableString(data.notes),
                approved_by: asNullableString(data.approvedBy ?? data.approved_by),
                approved_at: asNullableDate(data.approvedAt ?? data.approved_at),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.clockOut !== undefined)
                patch.clockOut = asNullableDate(data.clockOut);
            if (data.breakMinutes !== undefined)
                patch.breakMinutes = data.breakMinutes;
            if (data.notes !== undefined)
                patch.notes = data.notes;
            if (data.approvedBy !== undefined || data.approved_by !== undefined)
                patch.approved_by = asNullableString(data.approvedBy ?? data.approved_by);
            if (data.approvedAt !== undefined || data.approved_at !== undefined)
                patch.approved_at = asNullableDate(data.approvedAt ?? data.approved_at);
            const updated = await this.prisma.timeEntry.update({
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
            // Soft delete — sets deleted_at (snake_case field)
            await this.prisma.timeEntry.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
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
        await this.prisma.timeEntry.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            employeeId: row.employeeId ?? "",
            locationId: row.locationId ?? null,
            shiftId: row.shift_id ?? null,
            clockIn: row.clockIn
                ? new Date(row.clockIn).getTime()
                : 0,
            clockOut: row.clockOut
                ? new Date(row.clockOut).getTime()
                : null,
            breakMinutes: row.breakMinutes ?? 0,
            notes: row.notes ?? null,
            approvedBy: row.approved_by ?? null,
            approvedAt: row.approved_at
                ? new Date(row.approved_at).getTime()
                : null,
            createdAt: row.createdAt
                ? new Date(row.createdAt).getTime()
                : 0,
            updatedAt: row.updatedAt
                ? new Date(row.updatedAt).getTime()
                : 0,
            deletedAt: row.deleted_at
                ? new Date(row.deleted_at).getTime()
                : null,
        };
    }
}
// ---------------------------------------------------------------------------
// TimecardEditRequestPrismaStore
// ---------------------------------------------------------------------------
export class TimecardEditRequestPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.timecardEditRequest.findMany({
            where: { tenantId: this.tenantId },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.timecardEditRequest.findFirst({
            where: { tenantId: this.tenantId, id },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.timecardEditRequest.create({
            data: {
                tenantId: this.tenantId,
                id,
                timeEntryId: asString(data.timeEntryId),
                employeeId: asString(data.employeeId),
                requestedClockIn: asNullableDate(data.requestedClockIn),
                requestedClockOut: asNullableDate(data.requestedClockOut),
                requestedBreakMinutes: asNullableNumber(data.requestedBreakMinutes),
                reason: asString(data.reason),
                status: (data.status ?? "pending") || "pending",
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.status !== undefined)
                patch.status = data.status;
            if (data.reason !== undefined)
                patch.reason = data.reason;
            if (data.requestedClockIn !== undefined)
                patch.requestedClockIn = asNullableDate(data.requestedClockIn);
            if (data.requestedClockOut !== undefined)
                patch.requestedClockOut = asNullableDate(data.requestedClockOut);
            if (data.requestedBreakMinutes !== undefined)
                patch.requestedBreakMinutes = data.requestedBreakMinutes;
            const updated = await this.prisma.timecardEditRequest.update({
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
            await this.prisma.timecardEditRequest.delete({
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
        await this.prisma.timecardEditRequest.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            timeEntryId: row.timeEntryId ?? "",
            employeeId: row.employeeId ?? "",
            requestedClockIn: row.requestedClockIn
                ? new Date(row.requestedClockIn).getTime()
                : null,
            requestedClockOut: row.requestedClockOut
                ? new Date(row.requestedClockOut).getTime()
                : null,
            requestedBreakMinutes: row.requestedBreakMinutes ?? null,
            reason: row.reason ?? "",
            status: row.status ?? "pending",
            createdAt: row.createdAt
                ? new Date(row.createdAt).getTime()
                : 0,
            updatedAt: row.updatedAt
                ? new Date(row.updatedAt).getTime()
                : 0,
        };
    }
}
// ---------------------------------------------------------------------------
// TrainingAssignmentPrismaStore
// ---------------------------------------------------------------------------
export class TrainingAssignmentPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.trainingAssignment.findMany({
            where: { tenant_id: this.tenantId, deleted_at: null },
            orderBy: { created_at: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.trainingAssignment.findFirst({
            where: { tenant_id: this.tenantId, id, deleted_at: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.trainingAssignment.create({
            data: {
                tenant_id: this.tenantId,
                id,
                module_id: asString(data.moduleId ?? data.module_id),
                employee_id: asNullableString(data.employeeId ?? data.employee_id),
                assigned_to_all: asBool(data.assignedToAll ?? data.assigned_to_all, false),
                assigned_by: asString(data.assignedBy ?? data.assigned_by),
                due_date: asNullableDate(data.dueDate ?? data.due_date),
                status: (data.status ?? "assigned") || "assigned",
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.status !== undefined)
                patch.status = data.status;
            if (data.dueDate !== undefined || data.due_date !== undefined)
                patch.due_date = asNullableDate(data.dueDate ?? data.due_date);
            if (data.assignedToAll !== undefined || data.assigned_to_all !== undefined)
                patch.assigned_to_all = data.assignedToAll ?? data.assigned_to_all;
            patch.updated_at = new Date();
            const updated = await this.prisma.trainingAssignment.update({
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
            // Soft delete — sets deleted_at (snake_case field)
            await this.prisma.trainingAssignment.update({
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
        await this.prisma.trainingAssignment.deleteMany({
            where: { tenant_id: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            moduleId: row.module_id ?? "",
            employeeId: row.employee_id ?? null,
            assignedToAll: row.assigned_to_all ?? false,
            assignedBy: row.assigned_by ?? "",
            dueDate: row.due_date
                ? new Date(row.due_date).getTime()
                : null,
            status: row.status ?? "assigned",
            assignedAt: row.assigned_at
                ? new Date(row.assigned_at).getTime()
                : 0,
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
