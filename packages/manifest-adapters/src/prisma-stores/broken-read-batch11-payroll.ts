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

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asJsonInput,
  asNullableString,
  asString,
  type EntityInstance,
  reportOp,
  toDecimalRequired,
} from "./shared.js";

// ---------------------------------------------------------------------------
// PayrollApprovalHistoryPrismaStore
// ---------------------------------------------------------------------------

export class PayrollApprovalHistoryPrismaStore
  implements Store<EntityInstance>
{
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.approvalHistory.findMany({
      where: { tenantId: this.tenantId, entityType: "payroll_run" },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.approvalHistory.findFirst({
      where: { tenantId: this.tenantId, id, entityType: "payroll_run" },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) || crypto.randomUUID();
    const row = await this.prisma.approvalHistory.create({
      data: {
        tenantId: this.tenantId,
        id,
        entityType: "payroll_run",
        entityId: asString(data.entityId),
        action: asString(data.action),
        performedBy: asString(data.performedBy),
        performedAt: data.performedAt
          ? new Date(data.performedAt as number | string)
          : new Date(),
        previousStatus: asNullableString(data.previousStatus),
        newStatus: asString(data.newStatus),
        notes: asNullableString(data.notes),
        metadata: asJsonInput(data.metadata),
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.action !== undefined) patch.action = data.action;
      if (data.previousStatus !== undefined)
        patch.previousStatus = data.previousStatus;
      if (data.newStatus !== undefined) patch.newStatus = data.newStatus;
      if (data.notes !== undefined) patch.notes = data.notes;
      if (data.metadata !== undefined) patch.metadata = data.metadata;

      const updated = await this.prisma.approvalHistory.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Hard delete — no deletedAt column on ApprovalHistory
      await this.prisma.approvalHistory.delete({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.approvalHistory.deleteMany({
      where: { tenantId: this.tenantId, entityType: "payroll_run" },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      entityType: (row.entityType as string) ?? "",
      entityId: (row.entityId as string) ?? "",
      action: (row.action as string) ?? "",
      performedBy: (row.performedBy as string) ?? "",
      performedAt: row.performedAt
        ? new Date(row.performedAt as string | Date).getTime()
        : 0,
      previousStatus: (row.previousStatus as string) ?? null,
      newStatus: (row.newStatus as string) ?? "",
      notes: (row.notes as string) ?? null,
      metadata: row.metadata ?? {},
      createdAt: row.createdAt
        ? new Date(row.createdAt as string | Date).getTime()
        : 0,
    };
  }
}

// ---------------------------------------------------------------------------
// PayrollPeriodPrismaStore
// ---------------------------------------------------------------------------

export class PayrollPeriodPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.payrollPeriod.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.payrollPeriod.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) || crypto.randomUUID();
    const row = await this.prisma.payrollPeriod.create({
      data: {
        tenantId: this.tenantId,
        id,
        periodStart:
          (data.periodStart ?? data.periodStart)
            ? new Date(
                (data.periodStart ?? data.periodStart) as number | string
              )
            : new Date(),
        periodEnd:
          (data.periodEnd ?? data.periodEnd)
            ? new Date((data.periodEnd ?? data.periodEnd) as number | string)
            : new Date(),
        status: ((data.status as string) ?? "open") || "open",
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.status !== undefined) patch.status = data.status;
      if (data.periodStart !== undefined || data.periodStart !== undefined)
        patch.periodStart = new Date(
          (data.periodStart ?? data.periodStart) as number | string
        );
      if (data.periodEnd !== undefined || data.periodEnd !== undefined)
        patch.periodEnd = new Date(
          (data.periodEnd ?? data.periodEnd) as number | string
        );
      patch.updatedAt = new Date();

      const updated = await this.prisma.payrollPeriod.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Soft delete — sets deleted_at
      await this.prisma.payrollPeriod.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.payrollPeriod.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      periodStart: row.periodStart
        ? new Date(row.periodStart as string | Date).getTime()
        : 0,
      periodEnd: row.periodEnd
        ? new Date(row.periodEnd as string | Date).getTime()
        : 0,
      status: (row.status as string) ?? "open",
      createdAt: row.createdAt
        ? new Date(row.createdAt as string | Date).getTime()
        : 0,
      updatedAt: row.updatedAt
        ? new Date(row.updatedAt as string | Date).getTime()
        : 0,
      deletedAt: row.deletedAt
        ? new Date(row.deletedAt as string | Date).getTime()
        : null,
    };
  }
}

// ---------------------------------------------------------------------------
// PayrollRunPrismaStore
// ---------------------------------------------------------------------------

export class PayrollRunPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.payrollRun.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.payrollRun.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) || crypto.randomUUID();
    const row = await this.prisma.payrollRun.create({
      data: {
        tenantId: this.tenantId,
        id,
        payrollPeriodId:
          ((data.payrollPeriodId ?? data.payroll_period_id) as string) ?? "",
        runDate:
          (data.runDate ?? data.run_date)
            ? new Date((data.runDate ?? data.run_date) as number | string)
            : new Date(),
        status: ((data.status as string) ?? "pending") || "pending",
        totalGross: toDecimalRequired(data.totalGross ?? data.total_gross, 0),
        totalDeductions: toDecimalRequired(
          data.totalDeductions ?? data.total_deductions,
          0
        ),
        totalNet: toDecimalRequired(data.totalNet ?? data.total_net, 0),
        approvedBy: asNullableString(data.approvedBy ?? data.approved_by),
        approvedAt:
          (data.approvedAt ?? data.approved_at)
            ? new Date((data.approvedAt ?? data.approved_at) as number | string)
            : null,
        paidAt:
          (data.paidAt ?? data.paid_at)
            ? new Date((data.paidAt ?? data.paid_at) as number | string)
            : null,
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.status !== undefined) patch.status = data.status;
      if (data.totalGross !== undefined || data.total_gross !== undefined)
        patch.total_gross = toDecimalRequired(
          data.totalGross ?? data.total_gross,
          0
        );
      if (
        data.totalDeductions !== undefined ||
        data.total_deductions !== undefined
      )
        patch.total_deductions = toDecimalRequired(
          data.totalDeductions ?? data.total_deductions,
          0
        );
      if (data.totalNet !== undefined || data.total_net !== undefined)
        patch.total_net = toDecimalRequired(data.totalNet ?? data.total_net, 0);
      if (data.approvedBy !== undefined || data.approved_by !== undefined)
        patch.approved_by = data.approvedBy ?? data.approved_by;
      if (data.approvedAt !== undefined || data.approved_at !== undefined)
        patch.approved_at =
          (data.approvedAt ?? data.approved_at)
            ? new Date((data.approvedAt ?? data.approved_at) as number | string)
            : null;
      if (data.paidAt !== undefined || data.paid_at !== undefined)
        patch.paid_at =
          (data.paidAt ?? data.paid_at)
            ? new Date((data.paidAt ?? data.paid_at) as number | string)
            : null;
      patch.updatedAt = new Date();

      const updated = await this.prisma.payrollRun.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Soft delete — sets deleted_at
      await this.prisma.payrollRun.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.payrollRun.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      payrollPeriodId: (row.payroll_period_id as string) ?? "",
      runDate: row.run_date
        ? new Date(row.run_date as string | Date).getTime()
        : 0,
      status: (row.status as string) ?? "pending",
      totalGross: Number(row.total_gross ?? 0),
      totalDeductions: Number(row.total_deductions ?? 0),
      totalNet: Number(row.total_net ?? 0),
      approvedBy: (row.approved_by as string) ?? null,
      approvedAt: row.approved_at
        ? new Date(row.approved_at as string | Date).getTime()
        : null,
      paidAt: row.paid_at
        ? new Date(row.paid_at as string | Date).getTime()
        : null,
      createdAt: row.createdAt
        ? new Date(row.createdAt as string | Date).getTime()
        : 0,
      updatedAt: row.updatedAt
        ? new Date(row.updatedAt as string | Date).getTime()
        : 0,
      deletedAt: row.deletedAt
        ? new Date(row.deletedAt as string | Date).getTime()
        : null,
    };
  }
}
