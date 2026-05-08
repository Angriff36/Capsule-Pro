/**
 * Payroll Stores — BROKEN_PRISMA_READ Batch 11
 *
 * Three stores:
 *   PayrollApprovalHistoryPrismaStore — uses the ApprovalHistory Prisma model
 *     with polymorphic entityType filter ("payroll_run").
 *   PayrollPeriodPrismaStore — payroll_periods table, snake_case fields,
 *     soft-delete via deleted_at.
 *   PayrollRunPrismaStore — payroll_runs table, snake_case fields,
 *     soft-delete via deleted_at, Decimal fields for monetary totals.
 */
import { asJsonInput, asNullableString, asString, reportOp, toDecimalRequired, } from "./shared.js";
// ---------------------------------------------------------------------------
// PayrollApprovalHistoryPrismaStore
// ---------------------------------------------------------------------------
export class PayrollApprovalHistoryPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.approvalHistory.findMany({
            where: { tenantId: this.tenantId, entityType: "payroll_run" },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.approvalHistory.findFirst({
            where: { tenantId: this.tenantId, id, entityType: "payroll_run" },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.approvalHistory.create({
            data: {
                tenantId: this.tenantId,
                id,
                entityType: "payroll_run",
                entityId: asString(data.entityId),
                action: asString(data.action),
                performedBy: asString(data.performedBy),
                performedAt: data.performedAt
                    ? new Date(data.performedAt)
                    : new Date(),
                previousStatus: asNullableString(data.previousStatus),
                newStatus: asString(data.newStatus),
                notes: asNullableString(data.notes),
                metadata: asJsonInput(data.metadata),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.action !== undefined)
                patch.action = data.action;
            if (data.previousStatus !== undefined)
                patch.previousStatus = data.previousStatus;
            if (data.newStatus !== undefined)
                patch.newStatus = data.newStatus;
            if (data.notes !== undefined)
                patch.notes = data.notes;
            if (data.metadata !== undefined)
                patch.metadata = data.metadata;
            const updated = await this.prisma.approvalHistory.update({
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
            // Hard delete — no deletedAt column on ApprovalHistory
            await this.prisma.approvalHistory.delete({
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
        await this.prisma.approvalHistory.deleteMany({
            where: { tenantId: this.tenantId, entityType: "payroll_run" },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            entityType: row.entityType ?? "",
            entityId: row.entityId ?? "",
            action: row.action ?? "",
            performedBy: row.performedBy ?? "",
            performedAt: row.performedAt
                ? new Date(row.performedAt).getTime()
                : 0,
            previousStatus: row.previousStatus ?? null,
            newStatus: row.newStatus ?? "",
            notes: row.notes ?? null,
            metadata: row.metadata ?? {},
            createdAt: row.createdAt
                ? new Date(row.createdAt).getTime()
                : 0,
        };
    }
}
// ---------------------------------------------------------------------------
// PayrollPeriodPrismaStore
// ---------------------------------------------------------------------------
export class PayrollPeriodPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.payroll_periods.findMany({
            where: { tenant_id: this.tenantId, deleted_at: null },
            orderBy: { created_at: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.payroll_periods.findFirst({
            where: { tenant_id: this.tenantId, id, deleted_at: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.payroll_periods.create({
            data: {
                tenant_id: this.tenantId,
                id,
                period_start: (data.periodStart ?? data.period_start)
                    ? new Date((data.periodStart ?? data.period_start))
                    : new Date(),
                period_end: (data.periodEnd ?? data.period_end)
                    ? new Date((data.periodEnd ?? data.period_end))
                    : new Date(),
                status: (data.status ?? "open") || "open",
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.status !== undefined)
                patch.status = data.status;
            if (data.periodStart !== undefined || data.period_start !== undefined)
                patch.period_start = new Date((data.periodStart ?? data.period_start));
            if (data.periodEnd !== undefined || data.period_end !== undefined)
                patch.period_end = new Date((data.periodEnd ?? data.period_end));
            patch.updated_at = new Date();
            const updated = await this.prisma.payroll_periods.update({
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
            // Soft delete — sets deleted_at
            await this.prisma.payroll_periods.update({
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
        await this.prisma.payroll_periods.deleteMany({
            where: { tenant_id: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            periodStart: row.period_start
                ? new Date(row.period_start).getTime()
                : 0,
            periodEnd: row.period_end
                ? new Date(row.period_end).getTime()
                : 0,
            status: row.status ?? "open",
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
// PayrollRunPrismaStore
// ---------------------------------------------------------------------------
export class PayrollRunPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.payroll_runs.findMany({
            where: { tenant_id: this.tenantId, deleted_at: null },
            orderBy: { created_at: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.payroll_runs.findFirst({
            where: { tenant_id: this.tenantId, id, deleted_at: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id || crypto.randomUUID();
        const row = await this.prisma.payroll_runs.create({
            data: {
                tenant_id: this.tenantId,
                id,
                payroll_period_id: (data.payrollPeriodId ?? data.payroll_period_id) ?? "",
                run_date: (data.runDate ?? data.run_date)
                    ? new Date((data.runDate ?? data.run_date))
                    : new Date(),
                status: (data.status ?? "pending") || "pending",
                total_gross: toDecimalRequired(data.totalGross ?? data.total_gross, 0),
                total_deductions: toDecimalRequired(data.totalDeductions ?? data.total_deductions, 0),
                total_net: toDecimalRequired(data.totalNet ?? data.total_net, 0),
                approved_by: asNullableString(data.approvedBy ?? data.approved_by),
                approved_at: (data.approvedAt ?? data.approved_at)
                    ? new Date((data.approvedAt ?? data.approved_at))
                    : null,
                paid_at: (data.paidAt ?? data.paid_at)
                    ? new Date((data.paidAt ?? data.paid_at))
                    : null,
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.status !== undefined)
                patch.status = data.status;
            if (data.totalGross !== undefined || data.total_gross !== undefined)
                patch.total_gross = toDecimalRequired(data.totalGross ?? data.total_gross, 0);
            if (data.totalDeductions !== undefined ||
                data.total_deductions !== undefined)
                patch.total_deductions = toDecimalRequired(data.totalDeductions ?? data.total_deductions, 0);
            if (data.totalNet !== undefined || data.total_net !== undefined)
                patch.total_net = toDecimalRequired(data.totalNet ?? data.total_net, 0);
            if (data.approvedBy !== undefined || data.approved_by !== undefined)
                patch.approved_by = data.approvedBy ?? data.approved_by;
            if (data.approvedAt !== undefined || data.approved_at !== undefined)
                patch.approved_at =
                    (data.approvedAt ?? data.approved_at)
                        ? new Date((data.approvedAt ?? data.approved_at))
                        : null;
            if (data.paidAt !== undefined || data.paid_at !== undefined)
                patch.paid_at =
                    (data.paidAt ?? data.paid_at)
                        ? new Date((data.paidAt ?? data.paid_at))
                        : null;
            patch.updated_at = new Date();
            const updated = await this.prisma.payroll_runs.update({
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
            // Soft delete — sets deleted_at
            await this.prisma.payroll_runs.update({
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
        await this.prisma.payroll_runs.deleteMany({
            where: { tenant_id: this.tenantId },
        });
    }
    mapToManifestEntity(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            payrollPeriodId: row.payroll_period_id ?? "",
            runDate: row.run_date
                ? new Date(row.run_date).getTime()
                : 0,
            status: row.status ?? "pending",
            totalGross: Number(row.total_gross ?? 0),
            totalDeductions: Number(row.total_deductions ?? 0),
            totalNet: Number(row.total_net ?? 0),
            approvedBy: row.approved_by ?? null,
            approvedAt: row.approved_at
                ? new Date(row.approved_at).getTime()
                : null,
            paidAt: row.paid_at
                ? new Date(row.paid_at).getTime()
                : null,
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
