/**
 * Prisma stores for BROKEN_PRISMA_READ batch 03
 * (ChartOfAccount, Client).
 *
 * Pattern mirrors AlertsConfigPrismaStore in `../prisma-store.ts`.
 *
 * Note: ChartOfAccount has NO `deletedAt` column — it does not support
 * soft-delete. `delete` performs a hard delete; `getAll`/`getById` do not
 * filter by deletedAt.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asNullableNumber,
  asNullableString,
  asString,
  asStringArray,
  type EntityInstance,
  reportOp,
} from "./shared";

// ---------------------------------------------------------------------------
// ChartOfAccount (tenant_accounting.chart_of_accounts)
// ---------------------------------------------------------------------------

type AccountTypeLiteral =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE";

const VALID_ACCOUNT_TYPES = new Set<AccountTypeLiteral>([
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
]);

function coerceAccountType(value: unknown): AccountTypeLiteral {
  const v = String(value ?? "").toUpperCase() as AccountTypeLiteral;
  return VALID_ACCOUNT_TYPES.has(v) ? v : "ASSET";
}

export class ChartOfAccountPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.chartOfAccount.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.chartOfAccount.findFirst({
      where: { tenantId: this.tenantId, id },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.chartOfAccount.create({
      data: {
        tenantId: this.tenantId,
        id,
        accountNumber: asString(data.accountNumber),
        accountName: asString(data.accountName),
        accountType: coerceAccountType(data.accountType),
        parentId: asNullableString(data.parentId),
        isActive: asBool(data.isActive, true),
        description: asNullableString(data.description),
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
      if (data.accountNumber !== undefined)
        patch.accountNumber = asString(data.accountNumber);
      if (data.accountName !== undefined)
        patch.accountName = asString(data.accountName);
      if (data.accountType !== undefined)
        patch.accountType = coerceAccountType(data.accountType);
      if (data.parentId !== undefined)
        patch.parentId = asNullableString(data.parentId);
      if (data.isActive !== undefined)
        patch.isActive = asBool(data.isActive, true);
      if (data.description !== undefined)
        patch.description = asNullableString(data.description);
      const row = await this.prisma.chartOfAccount.update({
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
      await this.prisma.chartOfAccount.delete({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.chartOfAccount.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      accountNumber: (r.accountNumber as string) ?? "",
      accountName: (r.accountName as string) ?? "",
      accountType: (r.accountType as string) ?? "ASSET",
      parentId: (r.parentId as string) ?? null,
      isActive: r.isActive ?? true,
      description: (r.description as string) ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// Client (tenant_crm.clients)
// ---------------------------------------------------------------------------

export class ClientPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.client.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.client.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.client.create({
      data: {
        tenantId: this.tenantId,
        id,
        clientType: asString(data.clientType) || "company",
        company_name: asNullableString(data.company_name ?? data.companyName),
        first_name: asNullableString(data.first_name ?? data.firstName),
        last_name: asNullableString(data.last_name ?? data.lastName),
        email: asNullableString(data.email),
        phone: asNullableString(data.phone),
        website: asNullableString(data.website),
        addressLine1: asNullableString(data.addressLine1),
        addressLine2: asNullableString(data.addressLine2),
        city: asNullableString(data.city),
        stateProvince: asNullableString(data.stateProvince),
        postalCode: asNullableString(data.postalCode),
        countryCode: asNullableString(data.countryCode),
        defaultPaymentTerms: asNullableNumber(data.defaultPaymentTerms) ?? 30,
        taxExempt: asBool(data.taxExempt, false),
        taxId: asNullableString(data.taxId),
        notes: asNullableString(data.notes),
        tags: asStringArray(data.tags),
        source: asNullableString(data.source),
        assignedTo: asNullableString(data.assignedTo),
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
      if (data.clientType !== undefined)
        patch.clientType = asString(data.clientType);
      if (data.company_name !== undefined)
        patch.company_name = asNullableString(data.company_name);
      if (data.companyName !== undefined)
        patch.company_name = asNullableString(data.companyName);
      if (data.first_name !== undefined)
        patch.first_name = asNullableString(data.first_name);
      if (data.firstName !== undefined)
        patch.first_name = asNullableString(data.firstName);
      if (data.last_name !== undefined)
        patch.last_name = asNullableString(data.last_name);
      if (data.lastName !== undefined)
        patch.last_name = asNullableString(data.lastName);
      if (data.email !== undefined) patch.email = asNullableString(data.email);
      if (data.phone !== undefined) patch.phone = asNullableString(data.phone);
      if (data.website !== undefined)
        patch.website = asNullableString(data.website);
      if (data.addressLine1 !== undefined)
        patch.addressLine1 = asNullableString(data.addressLine1);
      if (data.addressLine2 !== undefined)
        patch.addressLine2 = asNullableString(data.addressLine2);
      if (data.city !== undefined) patch.city = asNullableString(data.city);
      if (data.stateProvince !== undefined)
        patch.stateProvince = asNullableString(data.stateProvince);
      if (data.postalCode !== undefined)
        patch.postalCode = asNullableString(data.postalCode);
      if (data.countryCode !== undefined)
        patch.countryCode = asNullableString(data.countryCode);
      if (data.defaultPaymentTerms !== undefined)
        patch.defaultPaymentTerms =
          asNullableNumber(data.defaultPaymentTerms) ?? 30;
      if (data.taxExempt !== undefined)
        patch.taxExempt = asBool(data.taxExempt, false);
      if (data.taxId !== undefined) patch.taxId = asNullableString(data.taxId);
      if (data.notes !== undefined) patch.notes = asNullableString(data.notes);
      if (data.tags !== undefined) patch.tags = asStringArray(data.tags);
      if (data.source !== undefined)
        patch.source = asNullableString(data.source);
      if (data.assignedTo !== undefined)
        patch.assignedTo = asNullableString(data.assignedTo);
      const row = await this.prisma.client.update({
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
      await this.prisma.client.update({
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
    await this.prisma.client.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      clientType: (r.clientType as string) ?? "company",
      company_name: (r.company_name as string) ?? null,
      first_name: (r.first_name as string) ?? null,
      last_name: (r.last_name as string) ?? null,
      email: (r.email as string) ?? null,
      phone: (r.phone as string) ?? null,
      website: (r.website as string) ?? null,
      addressLine1: (r.addressLine1 as string) ?? null,
      addressLine2: (r.addressLine2 as string) ?? null,
      city: (r.city as string) ?? null,
      stateProvince: (r.stateProvince as string) ?? null,
      postalCode: (r.postalCode as string) ?? null,
      countryCode: (r.countryCode as string) ?? null,
      defaultPaymentTerms: r.defaultPaymentTerms ?? 30,
      taxExempt: r.taxExempt ?? false,
      taxId: (r.taxId as string) ?? null,
      notes: (r.notes as string) ?? null,
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      source: (r.source as string) ?? null,
      assignedTo: (r.assignedTo as string) ?? null,
    };
  }
}
