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
  asNullableNumber,
  asNullableString,
  type EntityInstance,
  reportOp,
  toDecimalInput,
} from "./shared.js";

// ---------------------------------------------------------------------------
// EmployeeCertificationPrismaStore  (tenant_staff.employee_certifications — snake_case)
// ---------------------------------------------------------------------------

export class EmployeeCertificationPrismaStore
  implements Store<EntityInstance>
{
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.employee_certifications.findMany({
      where: { tenant_id: this.tenantId, deleted_at: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.employee_certifications.findFirst({
      where: { tenant_id: this.tenantId, id, deleted_at: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.employee_certifications.create({
      data: {
        tenant_id: this.tenantId,
        id,
        employee_id: data.employee_id as string,
        certification_type: data.certification_type as string,
        certification_name: data.certification_name as string,
        issued_date: asNullableDate(data.issued_date) ?? new Date(),
        expiry_date: asNullableDate(data.expiry_date),
        document_url: asNullableString(data.document_url),
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>,
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.employee_id !== undefined) patch.employee_id = data.employee_id;
      if (data.certification_type !== undefined)
        patch.certification_type = data.certification_type;
      if (data.certification_name !== undefined)
        patch.certification_name = data.certification_name;
      if (data.issued_date !== undefined)
        patch.issued_date = asNullableDate(data.issued_date);
      if (data.expiry_date !== undefined)
        patch.expiry_date = asNullableDate(data.expiry_date);
      if (data.document_url !== undefined)
        patch.document_url = asNullableString(data.document_url);

      const row = await this.prisma.employee_certifications.update({
        where: { tenant_id_id: { tenant_id: this.tenantId, id } },
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
      await this.prisma.employee_certifications.update({
        where: { tenant_id_id: { tenant_id: this.tenantId, id } },
        data: { deleted_at: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.employee_certifications.deleteMany({
      where: { tenant_id: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenant_id: r.tenant_id as string,
      employee_id: r.employee_id ?? null,
      certification_type: r.certification_type ?? null,
      certification_name: r.certification_name ?? null,
      issued_date: r.issued_date ?? null,
      expiry_date: r.expiry_date ?? null,
      document_url: r.document_url ?? null,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at ?? null,
      deleted_at: r.deleted_at ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// EmployeeDeductionPrismaStore  (tenant_staff.employee_deductions — camelCase model)
// ---------------------------------------------------------------------------

export class EmployeeDeductionPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.employeeDeduction.findMany({
      where: { tenant_id: this.tenantId, deleted_at: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.employeeDeduction.findFirst({
      where: { tenant_id: this.tenantId, id, deleted_at: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.employeeDeduction.create({
      data: {
        tenant_id: this.tenantId,
        id,
        employee_id: data.employee_id as string,
        type: data.type as string,
        name: data.name as string,
        amount: toDecimalInput(data.amount),
        percentage: toDecimalInput(data.percentage),
        is_pre_tax: asBool(data.is_pre_tax, false),
        effective_date: asNullableDate(data.effective_date) ?? new Date(),
        end_date: asNullableDate(data.end_date),
        max_annual_amount: toDecimalInput(data.max_annual_amount),
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>,
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: Record<string, unknown> = {};
      if (data.employee_id !== undefined) patch.employee_id = data.employee_id;
      if (data.type !== undefined) patch.type = data.type;
      if (data.name !== undefined) patch.name = data.name;
      if (data.amount !== undefined)
        patch.amount = toDecimalInput(data.amount);
      if (data.percentage !== undefined)
        patch.percentage = toDecimalInput(data.percentage);
      if (data.is_pre_tax !== undefined)
        patch.is_pre_tax = asBool(data.is_pre_tax, false);
      if (data.effective_date !== undefined)
        patch.effective_date = asNullableDate(data.effective_date);
      if (data.end_date !== undefined)
        patch.end_date = asNullableDate(data.end_date);
      if (data.max_annual_amount !== undefined)
        patch.max_annual_amount = toDecimalInput(data.max_annual_amount);

      const row = await this.prisma.employeeDeduction.update({
        where: { tenant_id_id: { tenant_id: this.tenantId, id } },
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
        where: { tenant_id_id: { tenant_id: this.tenantId, id } },
        data: { deleted_at: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.employeeDeduction.deleteMany({
      where: { tenant_id: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenant_id: r.tenant_id as string,
      employee_id: r.employee_id ?? null,
      type: r.type ?? null,
      name: r.name ?? null,
      amount: r.amount ?? null,
      percentage: r.percentage ?? null,
      is_pre_tax: r.is_pre_tax ?? false,
      effective_date: r.effective_date ?? null,
      end_date: r.end_date ?? null,
      max_annual_amount: r.max_annual_amount ?? null,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at ?? null,
      deleted_at: r.deleted_at ?? null,
    };
  }
}
