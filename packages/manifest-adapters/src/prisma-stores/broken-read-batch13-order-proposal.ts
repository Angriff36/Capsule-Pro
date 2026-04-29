/**
 * BROKEN_PRISMA_READ batch 13 — PurchaseOrderItem + ProposalLineItem Prisma stores.
 *
 * PurchaseOrderItem — tenant_inventory.purchase_order_items (camelCase, Decimals)
 * ProposalLineItem  — tenant_crm.proposal_line_items         (camelCase, Decimals)
 */

import type { PrismaClient } from "@repo/database/standalone";
import {
  asNullableString,
  asString,
  type EntityInstance,
  reportOp,
  toDecimalInput,
  toDecimalRequired,
} from "./shared.js";

// ---------------------------------------------------------------------------
// PurchaseOrderItemPrismaStore
// ---------------------------------------------------------------------------

export class PurchaseOrderItemPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.purchaseOrderItem.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.purchaseOrderItem.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) || crypto.randomUUID();
    const row = await this.prisma.purchaseOrderItem.create({
      data: {
        tenantId: this.tenantId,
        id,
        purchaseOrderId: asString(data.purchaseOrderId),
        itemId: asString(data.itemId),
        quantityOrdered: toDecimalRequired(data.quantityOrdered, 0),
        quantityReceived: toDecimalRequired(data.quantityReceived, 0),
        unitId: (data.unitId as number) ?? 1,
        unitCost: toDecimalRequired(data.unitCost, 0),
        totalCost: toDecimalRequired(data.totalCost, 0),
        qualityStatus: asNullableString(data.qualityStatus) ?? "pending",
        discrepancyType: asNullableString(data.discrepancyType),
        discrepancyAmount: toDecimalInput(data.discrepancyAmount),
        notes: asNullableString(data.notes),
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
      if (data.quantityOrdered !== undefined)
        patch.quantityOrdered = toDecimalRequired(data.quantityOrdered, 0);
      if (data.quantityReceived !== undefined)
        patch.quantityReceived = toDecimalRequired(data.quantityReceived, 0);
      if (data.unitCost !== undefined)
        patch.unitCost = toDecimalRequired(data.unitCost, 0);
      if (data.totalCost !== undefined)
        patch.totalCost = toDecimalRequired(data.totalCost, 0);
      if (data.qualityStatus !== undefined)
        patch.qualityStatus = asNullableString(data.qualityStatus);
      if (data.discrepancyType !== undefined)
        patch.discrepancyType = asNullableString(data.discrepancyType);
      if (data.discrepancyAmount !== undefined)
        patch.discrepancyAmount = toDecimalInput(data.discrepancyAmount);
      if (data.notes !== undefined) patch.notes = asNullableString(data.notes);

      const updated = await this.prisma.purchaseOrderItem.update({
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
      await this.prisma.purchaseOrderItem.update({
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
    await this.prisma.purchaseOrderItem.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      purchaseOrderId: (row.purchaseOrderId as string) ?? "",
      itemId: (row.itemId as string) ?? "",
      quantityOrdered: String(row.quantityOrdered ?? "0"),
      quantityReceived: String(row.quantityReceived ?? "0"),
      unitId: (row.unitId as number) ?? 1,
      unitCost: String(row.unitCost ?? "0"),
      totalCost: String(row.totalCost ?? "0"),
      qualityStatus: (row.qualityStatus as string) ?? "pending",
      discrepancyType: (row.discrepancyType as string) ?? null,
      discrepancyAmount:
        row.discrepancyAmount != null ? String(row.discrepancyAmount) : null,
      notes: (row.notes as string) ?? null,
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
// ProposalLineItemPrismaStore
// ---------------------------------------------------------------------------

export class ProposalLineItemPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.proposalLineItem.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.proposalLineItem.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) || crypto.randomUUID();
    const row = await this.prisma.proposalLineItem.create({
      data: {
        tenantId: this.tenantId,
        id,
        proposalId: asString(data.proposalId),
        itemType: asString(data.itemType),
        category: asString(data.category),
        description: asString(data.description),
        quantity: toDecimalRequired(data.quantity, 0),
        unitOfMeasure: asNullableString(data.unitOfMeasure),
        unitPrice: toDecimalRequired(data.unitPrice, 0),
        total: toDecimalRequired(data.total, 0),
        totalPrice: toDecimalRequired(data.totalPrice, 0),
        sortOrder: (data.sortOrder as number) ?? 0,
        notes: asNullableString(data.notes),
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
      if (data.itemType !== undefined) patch.itemType = asString(data.itemType);
      if (data.category !== undefined) patch.category = asString(data.category);
      if (data.description !== undefined)
        patch.description = asString(data.description);
      if (data.quantity !== undefined)
        patch.quantity = toDecimalRequired(data.quantity, 0);
      if (data.unitOfMeasure !== undefined)
        patch.unitOfMeasure = asNullableString(data.unitOfMeasure);
      if (data.unitPrice !== undefined)
        patch.unitPrice = toDecimalRequired(data.unitPrice, 0);
      if (data.total !== undefined)
        patch.total = toDecimalRequired(data.total, 0);
      if (data.totalPrice !== undefined)
        patch.totalPrice = toDecimalRequired(data.totalPrice, 0);
      if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
      if (data.notes !== undefined) patch.notes = asNullableString(data.notes);

      const updated = await this.prisma.proposalLineItem.update({
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
      await this.prisma.proposalLineItem.update({
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
    await this.prisma.proposalLineItem.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      proposalId: (row.proposalId as string) ?? "",
      itemType: (row.itemType as string) ?? "",
      category: (row.category as string) ?? "",
      description: (row.description as string) ?? "",
      quantity: String(row.quantity ?? "0"),
      unitOfMeasure: (row.unitOfMeasure as string) ?? null,
      unitPrice: String(row.unitPrice ?? "0"),
      total: String(row.total ?? "0"),
      totalPrice: String(row.totalPrice ?? "0"),
      sortOrder: (row.sortOrder as number) ?? 0,
      notes: (row.notes as string) ?? null,
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
// Minimal Store<T> interface (local re-declaration)
// ---------------------------------------------------------------------------

interface Store<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | undefined>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
}
