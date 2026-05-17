/**
 * Prisma stores for BROKEN_PRISMA_READ batch 15 — RolePolicy, TimeOffRequest.
 *
 * RolePolicy — tenant_staff.role_policies
 *   - Composite key: tenantId_id
 *   - Unique: tenantId_roleId
 *   - JSON column: permissions
 *   - Soft-delete via deletedAt
 *   - Prisma model: RolePolicy, client accessor: prisma.rolePolicy
 *
 * TimeOffRequest — tenant_staff.employee_time_off_requests
 *   - Composite key: tenant_id_id (snake_case fields)
 *   - Required fields: employee_id, request_type, start_date, end_date, hours
 *   - Status enum: PENDING, APPROVED, REJECTED, CANCELLED
 *   - Soft-delete via deleted_at
 *   - Prisma model: EmployeeTimeOffRequest, client accessor: prisma.timeOffRequest
 *   - Manifest entity name: "TimeOffRequest"
 */
import { asBool, asJsonInput, asNullableDate, asNullableString, asString, reportOp, toDecimalRequired, } from "./shared.js";
// ---------------------------------------------------------------------------
// RolePolicyPrismaStore
// ---------------------------------------------------------------------------
export class RolePolicyPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.rolePolicy.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.rolePolicy.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.rolePolicy.create({
            data: {
                tenantId: this.tenantId,
                id,
                roleId: asString(data.roleId),
                roleName: asString(data.roleName),
                permissions: asJsonInput(data.permissions),
                description: asNullableString(data.description),
                isActive: asBool(data.isActive, true),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.roleId !== undefined)
                patch.roleId = asString(data.roleId);
            if (data.roleName !== undefined)
                patch.roleName = asString(data.roleName);
            if (data.permissions !== undefined)
                patch.permissions = asJsonInput(data.permissions);
            if (data.description !== undefined)
                patch.description = asNullableString(data.description);
            if (data.isActive !== undefined)
                patch.isActive = asBool(data.isActive, true);
            const row = await this.prisma.rolePolicy.update({
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
            await this.prisma.rolePolicy.update({
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
        await this.prisma.rolePolicy.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            roleId: r.roleId ?? "",
            roleName: r.roleName ?? "",
            permissions: r.permissions ?? {},
            description: r.description ?? null,
            isActive: r.isActive ?? true,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// TimeOffRequestPrismaStore
// ---------------------------------------------------------------------------
// Maps manifest entity name "TimeOffRequest" to Prisma model
// "EmployeeTimeOffRequest" (table: tenant_staff.employee_time_off_requests).
// The model uses snake_case field names, so the composite key is
// tenant_id_id (not tenantId_id).
export class TimeOffRequestPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.timeOffRequest.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { submittedAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.timeOffRequest.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.timeOffRequest.create({
            data: {
                tenantId: this.tenantId,
                id,
                employeeId: asString(data.employeeId),
                requestType: asString(data.requestType) || "VACATION",
                startDate: asNullableDate(data.startDate) ?? new Date(),
                endDate: asNullableDate(data.endDate) ?? new Date(),
                hours: toDecimalRequired(data.hours, 0),
                reason: asNullableString(data.reason),
                status: asString(data.status) || "PENDING",
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.employeeId !== undefined)
                patch.employeeId = asString(data.employeeId);
            if (data.requestType !== undefined)
                patch.requestType = asString(data.requestType);
            if (data.startDate !== undefined)
                patch.startDate = asNullableDate(data.startDate);
            if (data.endDate !== undefined)
                patch.endDate = asNullableDate(data.endDate);
            if (data.hours !== undefined)
                patch.hours = toDecimalRequired(data.hours, 0);
            if (data.reason !== undefined)
                patch.reason = asNullableString(data.reason);
            if (data.status !== undefined)
                patch.status = asString(data.status);
            if (data.reviewedBy !== undefined)
                patch.reviewedBy = asNullableString(data.reviewedBy);
            if (data.reviewedAt !== undefined)
                patch.reviewedAt = asNullableDate(data.reviewedAt);
            if (data.rejectionReason !== undefined)
                patch.rejectionReason = asNullableString(data.rejectionReason);
            const row = await this.prisma.timeOffRequest.update({
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
            await this.prisma.timeOffRequest.update({
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
        await this.prisma.timeOffRequest.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            employeeId: r.employeeId ?? "",
            requestType: r.requestType ?? "",
            startDate: r.startDate ?? null,
            endDate: r.endDate ?? null,
            hours: r.hours ?? 0,
            reason: r.reason ?? null,
            status: r.status ?? "PENDING",
            submittedAt: r.submittedAt ?? null,
            reviewedBy: r.reviewedBy ?? null,
            reviewedAt: r.reviewedAt ?? null,
            rejectionReason: r.rejectionReason ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
