/**
 * BROKEN_PRISMA_READ batch 06 — EmployeeAvailability store.
 *
 * EmployeeAvailability → tenant_staff.employee_availability
 *   - Snake_case Prisma model & fields (employee_availability, tenant_id, employee_id, etc.)
 *   - Composite key: tenant_id_id
 *   - Soft-delete via deleted_at
 *   - Time fields (start_time, end_time) are @db.Time(6), passed through as strings
 */
import { asBool, asNullableDate, reportOp, } from "./shared.js";
// ---------------------------------------------------------------------------
// EmployeeAvailabilityPrismaStore  (tenant_staff.employee_availability — snake_case)
// ---------------------------------------------------------------------------
export class EmployeeAvailabilityPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.employeeAvailability.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.employeeAvailability.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.employeeAvailability.create({
            data: {
                tenantId: this.tenantId,
                id,
                employeeId: data.employeeId,
                dayOfWeek: data.dayOfWeek,
                startTime: data.startTime,
                endTime: data.endTime,
                isAvailable: asBool(data.is_available, true),
                effectiveFrom: asNullableDate(data.effective_from) ?? new Date(),
                effectiveUntil: asNullableDate(data.effective_until),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.employeeId !== undefined)
                patch.employeeId = data.employeeId;
            if (data.dayOfWeek !== undefined)
                patch.dayOfWeek = data.dayOfWeek;
            if (data.startTime !== undefined)
                patch.startTime = data.startTime;
            if (data.endTime !== undefined)
                patch.endTime = data.endTime;
            if (data.is_available !== undefined)
                patch.is_available = asBool(data.is_available, true);
            if (data.effective_from !== undefined)
                patch.effective_from = asNullableDate(data.effective_from);
            if (data.effective_until !== undefined)
                patch.effective_until = asNullableDate(data.effective_until);
            const row = await this.prisma.employeeAvailability.update({
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
            await this.prisma.employeeAvailability.update({
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
        await this.prisma.employeeAvailability.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            employeeId: r.employeeId ?? null,
            dayOfWeek: r.dayOfWeek ?? null,
            startTime: r.startTime ?? null,
            endTime: r.endTime ?? null,
            isAvailable: r.is_available ?? true,
            effectiveFrom: r.effective_from ?? null,
            effectiveUntil: r.effective_until ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
