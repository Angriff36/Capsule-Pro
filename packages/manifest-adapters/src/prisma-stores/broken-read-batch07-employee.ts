/**
 * BROKEN_PRISMA_READ batch 07 — EmployeeCertification + EmployeeDeduction stores.
 *
 * EmployeeCertification → tenant_staff.employee_certifications
 *   - Snake_case Prisma model & fields (employee_certifications, tenant_id, deleted_at, etc.)
 *   - Composite key: tenant_id_id
 *
 * EmployeeDeduction    → tenant_staff.employee_deductions (PascalCase model)
 *   - CamelCase Prisma field names, composite key tenant_id_id
 *   - Nullable Decimal columns: amount, percentage, max_annual_amount
 *
 * Both soft-delete via their respective deleted_at fields.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asNullableDate,
  asNullableString,
  type EntityInstance,
  reportOp,
  toDecimalInput,
} from "./shared.js";

// ---------------------------------------------------------------------------
// EmployeeCertificationPrismaStore  (tenant_staff.employee_certifications — snake_case)
// ---------------------------------------------------------------------------

export class EmployeeCertificationPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.employeeCertification.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.employeeCertification.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.employeeCertification.create({
      data: {
        tenantId: this.tenantId,
        id,
        employeeId: data.employeeId as string,
        certificationType: data.certification_type as string,
        certificationName: data.certificationName as string,
        issuedDate: asNullableDate(data.issued_date) ?? new Date(),
        expiryDate: asNullableDate(data.expiry_date),
        documentUrl: asNullableString(data.document_url),
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
      if (data.employeeId !== undefined) patch.employeeId = data.employeeId;
      if (data.certification_type !== undefined)
        patch.certification_type = data.certification_type;
      if (data.certificationName !== undefined)
        patch.certificationName = data.certificationName;
      if (data.issued_date !== undefined)
        patch.issued_date = asNullableDate(data.issued_date);
      if (data.expiry_date !== undefined)
        patch.expiry_date = asNullableDate(data.expiry_date);
      if (data.document_url !== undefined)
        patch.document_url = asNullableString(data.document_url);

      const row = await this.prisma.employeeCertification.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(row);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.employeeCertification.update({
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
    await this.prisma.employeeCertification.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      employeeId: r.employeeId ?? null,
      certificationType: r.certification_type ?? null,
      certificationName: r.certificationName ?? null,
      issuedDate: r.issued_date ?? null,
      expiryDate: r.expiry_date ?? null,
      documentUrl: r.document_url ?? null,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// EmployeeDeductionPrismaStore  (tenant_staff.employee_deductions — camelCase model)
// ---------------------------------------------------------------------------

export class EmployeeDeductionPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.employeeDeduction.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.employeeDeduction.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.employeeDeduction.create({
      data: {
        tenantId: this.tenantId,
        id,
        employeeId: data.employeeId as string,
        type: data.type as string,
        name: data.name as string,
        amount: toDecimalInput(data.amount),
        percentage: toDecimalInput(data.percentage),
        isPreTax: asBool(data.isPreTax, false),
        effectiveDate: asNullableDate(data.effectiveDate) ?? new Date(),
        endDate: asNullableDate(data.endDate),
        maxAnnualAmount: toDecimalInput(data.maxAnnualAmount),
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
      if (data.employeeId !== undefined) patch.employeeId = data.employeeId;
      if (data.type !== undefined) patch.type = data.type;
      if (data.name !== undefined) patch.name = data.name;
      if (data.amount !== undefined) patch.amount = toDecimalInput(data.amount);
      if (data.percentage !== undefined)
        patch.percentage = toDecimalInput(data.percentage);
      if (data.isPreTax !== undefined)
        patch.isPreTax = asBool(data.isPreTax, false);
      if (data.effectiveDate !== undefined)
        patch.effectiveDate = asNullableDate(data.effectiveDate);
      if (data.endDate !== undefined)
        patch.endDate = asNullableDate(data.endDate);
      if (data.maxAnnualAmount !== undefined)
        patch.maxAnnualAmount = toDecimalInput(data.maxAnnualAmount);

      const row = await this.prisma.employeeDeduction.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(row);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.employeeDeduction.update({
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
    await this.prisma.employeeDeduction.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      employeeId: r.employeeId ?? null,
      type: r.type ?? null,
      name: r.name ?? null,
      amount: r.amount ?? null,
      percentage: r.percentage ?? null,
      isPreTax: r.isPreTax ?? false,
      effectiveDate: r.effectiveDate ?? null,
      endDate: r.endDate ?? null,
      maxAnnualAmount: r.maxAnnualAmount ?? null,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}
