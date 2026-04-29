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
        const rows = await this.prisma.employee_availability.findMany({
            where: { tenant_id: this.tenantId, deleted_at: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.employee_availability.findFirst({
            where: { tenant_id: this.tenantId, id, deleted_at: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.employee_availability.create({
            data: {
                tenant_id: this.tenantId,
                id,
                employee_id: data.employee_id,
                day_of_week: data.day_of_week,
                start_time: data.start_time,
                end_time: data.end_time,
                is_available: asBool(data.is_available, true),
                effective_from: asNullableDate(data.effective_from) ?? new Date(),
                effective_until: asNullableDate(data.effective_until),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.employee_id !== undefined)
                patch.employee_id = data.employee_id;
            if (data.day_of_week !== undefined)
                patch.day_of_week = data.day_of_week;
            if (data.start_time !== undefined)
                patch.start_time = data.start_time;
            if (data.end_time !== undefined)
                patch.end_time = data.end_time;
            if (data.is_available !== undefined)
                patch.is_available = asBool(data.is_available, true);
            if (data.effective_from !== undefined)
                patch.effective_from = asNullableDate(data.effective_from);
            if (data.effective_until !== undefined)
                patch.effective_until = asNullableDate(data.effective_until);
            const row = await this.prisma.employee_availability.update({
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
            await this.prisma.employee_availability.update({
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
        await this.prisma.employee_availability.deleteMany({
            where: { tenant_id: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenant_id: r.tenant_id,
            employee_id: r.employee_id ?? null,
            day_of_week: r.day_of_week ?? null,
            start_time: r.start_time ?? null,
            end_time: r.end_time ?? null,
            is_available: r.is_available ?? true,
            effective_from: r.effective_from ?? null,
            effective_until: r.effective_until ?? null,
            created_at: r.created_at ?? null,
            updated_at: r.updated_at ?? null,
            deleted_at: r.deleted_at ?? null,
        };
    }
}
