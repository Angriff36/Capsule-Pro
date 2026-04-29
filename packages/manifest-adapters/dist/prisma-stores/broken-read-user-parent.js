/**
 * BROKEN_RAW_SQL parent workflow — User Prisma store.
 *
 * User — tenant_staff.employees
 *   - CamelCase Prisma fields (@map annotations → snake_case columns)
 *   - Composite key: tenantId_id
 *   - Soft-delete via deletedAt
 *   - Nullable Decimal columns: hourlyRate, salaryAnnual
 *   - EmploymentType enum field
 *   - Nullable date columns: terminationDate
 *   - Required date column: hireDate
 */
import { EmploymentType } from "@repo/database/standalone";
import { asNullableDate, asNullableString, reportOp, toDecimalInput, } from "./shared.js";
// ---------------------------------------------------------------------------
// UserPrismaStore
// ---------------------------------------------------------------------------
export class UserPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.user.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.user.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.user.create({
            data: {
                tenantId: this.tenantId,
                id,
                email: data.email ?? "",
                firstName: data.firstName ?? "Test",
                lastName: data.lastName ?? "User",
                role: data.role ?? "staff",
                authUserId: asNullableString(data.authUserId),
                employeeNumber: asNullableString(data.employeeNumber),
                phone: asNullableString(data.phone),
                employmentType: data.employmentType ??
                    EmploymentType.full_time,
                hourlyRate: toDecimalInput(data.hourlyRate),
                salaryAnnual: toDecimalInput(data.salaryAnnual),
                hireDate: asNullableDate(data.hireDate) ?? new Date(),
                terminationDate: asNullableDate(data.terminationDate),
                isActive: true,
                avatarUrl: asNullableString(data.avatarUrl),
                roleId: asNullableString(data.roleId),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.firstName !== undefined)
                patch.firstName = data.firstName;
            if (data.lastName !== undefined)
                patch.lastName = data.lastName;
            if (data.phone !== undefined)
                patch.phone = asNullableString(data.phone);
            if (data.employmentType !== undefined)
                patch.employmentType = data.employmentType;
            if (data.hourlyRate !== undefined)
                patch.hourlyRate = toDecimalInput(data.hourlyRate);
            if (data.salaryAnnual !== undefined)
                patch.salaryAnnual = toDecimalInput(data.salaryAnnual);
            if (data.avatarUrl !== undefined)
                patch.avatarUrl = asNullableString(data.avatarUrl);
            if (data.isActive !== undefined)
                patch.isActive = data.isActive;
            if (data.role !== undefined)
                patch.role = data.role;
            if (data.roleId !== undefined)
                patch.roleId = asNullableString(data.roleId);
            if (data.terminationDate !== undefined)
                patch.terminationDate = asNullableDate(data.terminationDate);
            const row = await this.prisma.user.update({
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
            await this.prisma.user.update({
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
        await this.prisma.user.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            email: r.email ?? "",
            firstName: r.firstName ?? "",
            lastName: r.lastName ?? "",
            role: r.role ?? "staff",
            authUserId: r.authUserId ?? null,
            employeeNumber: r.employeeNumber ?? null,
            phone: r.phone ?? null,
            employmentType: r.employmentType ?? "full_time",
            hourlyRate: r.hourlyRate ?? null,
            salaryAnnual: r.salaryAnnual ?? null,
            hireDate: r.hireDate ?? null,
            terminationDate: r.terminationDate ?? null,
            isActive: r.isActive ?? true,
            avatarUrl: r.avatarUrl ?? null,
            roleId: r.roleId ?? null,
            createdAt: r.createdAt ?? null,
            updatedAt: r.updatedAt ?? null,
            deletedAt: r.deletedAt ?? null,
        };
    }
}
