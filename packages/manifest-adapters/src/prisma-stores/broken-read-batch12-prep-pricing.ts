/**
 * PrepComment + PricingTier Prisma Stores — BROKEN_PRISMA_READ Batch 12
 *
 * PrepCommentPrismaStore — prep_comments table in tenant_kitchen.
 *   CamelCase Prisma fields, soft-delete via deletedAt.
 *
 * PricingTierPrismaStore — pricing_tiers table in tenant_inventory.
 *   CamelCase Prisma fields, soft-delete via deletedAt.
 *   Decimal fields for minQuantity, maxQuantity, unitCost, discountPercent.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asNullableDate,
  asNullableString,
  asString,
  toDecimalInput,
  toDecimalRequired,
  type EntityInstance,
  reportOp,
} from "./shared.js";

// ---------------------------------------------------------------------------
// PrepCommentPrismaStore
// ---------------------------------------------------------------------------

export class PrepCommentPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.prepComment.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.prepComment.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) || crypto.randomUUID();
    const row = await this.prisma.prepComment.create({
      data: {
        tenantId: this.tenantId,
        id,
        taskId: asString(data.taskId),
        employeeId: asString(data.employeeId),
        commentText: asString(data.commentText),
        isResolved: asBool(data.isResolved, false),
        resolvedAt: asNullableDate(data.resolvedAt),
        resolvedBy: asNullableString(data.resolvedBy),
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
      if (data.commentText !== undefined) patch.commentText = data.commentText;
      if (data.isResolved !== undefined) patch.isResolved = data.isResolved;
      if (data.resolvedAt !== undefined)
        patch.resolvedAt = asNullableDate(data.resolvedAt);
      if (data.resolvedBy !== undefined)
        patch.resolvedBy = asNullableString(data.resolvedBy);

      const updated = await this.prisma.prepComment.update({
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
      await this.prisma.prepComment.update({
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
    await this.prisma.prepComment.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      taskId: (row.taskId as string) ?? "",
      employeeId: (row.employeeId as string) ?? "",
      commentText: (row.commentText as string) ?? "",
      isResolved: (row.isResolved as boolean) ?? false,
      resolvedAt: row.resolvedAt
        ? new Date(row.resolvedAt as string | Date).getTime()
        : null,
      resolvedBy: (row.resolvedBy as string) ?? null,
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
// PricingTierPrismaStore
// ---------------------------------------------------------------------------

export class PricingTierPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.pricingTier.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.pricingTier.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) || crypto.randomUUID();
    const row = await this.prisma.pricingTier.create({
      data: {
        tenantId: this.tenantId,
        id,
        catalogEntryId: asString(data.catalogEntryId),
        tierName: asString(data.tierName),
        minQuantity: toDecimalRequired(data.minQuantity, 0),
        maxQuantity: toDecimalInput(data.maxQuantity),
        unitCost: toDecimalRequired(data.unitCost, 0),
        discountPercent: toDecimalInput(data.discountPercent),
        effectiveFrom: asNullableDate(data.effectiveFrom),
        effectiveTo: asNullableDate(data.effectiveTo),
        isActive: asBool(data.isActive, true),
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
      if (data.tierName !== undefined) patch.tierName = data.tierName;
      if (data.minQuantity !== undefined)
        patch.minQuantity = toDecimalRequired(data.minQuantity, 0);
      if (data.maxQuantity !== undefined)
        patch.maxQuantity = toDecimalInput(data.maxQuantity);
      if (data.unitCost !== undefined)
        patch.unitCost = toDecimalRequired(data.unitCost, 0);
      if (data.discountPercent !== undefined)
        patch.discountPercent = toDecimalInput(data.discountPercent);
      if (data.effectiveFrom !== undefined)
        patch.effectiveFrom = asNullableDate(data.effectiveFrom);
      if (data.effectiveTo !== undefined)
        patch.effectiveTo = asNullableDate(data.effectiveTo);
      if (data.isActive !== undefined) patch.isActive = data.isActive;

      const updated = await this.prisma.pricingTier.update({
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
      await this.prisma.pricingTier.update({
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
    await this.prisma.pricingTier.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      catalogEntryId: (row.catalogEntryId as string) ?? "",
      tierName: (row.tierName as string) ?? "",
      minQuantity: Number(row.minQuantity ?? 0),
      maxQuantity: row.maxQuantity != null ? Number(row.maxQuantity) : null,
      unitCost: Number(row.unitCost ?? 0),
      discountPercent:
        row.discountPercent != null ? Number(row.discountPercent) : null,
      effectiveFrom: row.effectiveFrom
        ? new Date(row.effectiveFrom as string | Date).getTime()
        : null,
      effectiveTo: row.effectiveTo
        ? new Date(row.effectiveTo as string | Date).getTime()
        : null,
      isActive: (row.isActive as boolean) ?? true,
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
