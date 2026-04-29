/**
 * InventoryTransaction Prisma Store — BROKEN_PRISMA_READ Batch 10
 *
 * inventory_transactions uses mixed snake_case/camelCase Prisma field names
 * (unit_cost, total_cost, transaction_date, storage_location_id, employee_id
 * are snake_case WITHOUT @map). It has NO deletedAt and NO updatedAt columns,
 * so this store uses hard-delete semantics and omits soft-delete filtering.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asNullableString,
  type EntityInstance,
  reportOp,
  toDecimalInput,
  toDecimalRequired,
} from "./shared.js";

export class InventoryTransactionPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.inventoryTransaction.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { transaction_date: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.inventoryTransaction.findFirst({
      where: { tenantId: this.tenantId, id },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string) || crypto.randomUUID();
    const row = await this.prisma.inventoryTransaction.create({
      data: {
        tenantId: this.tenantId,
        id,
        itemId: ((data.itemId ?? data.item_id) as string) ?? "",
        transactionType:
          ((data.transactionType ?? data.transaction_type) as string) ??
          "adjustment",
        quantity: toDecimalRequired(data.quantity ?? data.quantityChange, 0),
        unit_cost: toDecimalRequired(data.unitCost ?? data.unit_cost, 0),
        total_cost: toDecimalInput(data.totalCost ?? data.total_cost),
        reference: asNullableString(data.reference),
        notes: asNullableString(data.notes),
        transaction_date:
          (data.transactionDate ?? data.transaction_date)
            ? new Date(
                (data.transactionDate ?? data.transaction_date) as
                  | number
                  | string
              )
            : new Date(),
        storage_location_id:
          ((data.storageLocationId ?? data.storage_location_id) as string) ??
          "00000000-0000-0000-0000-000000000000",
        reason: ((data.reason as string) ?? "") || "",
        referenceType: asNullableString(
          data.referenceType ?? data.reference_type
        ),
        referenceId: asNullableString(data.referenceId ?? data.reference_id),
        employee_id: asNullableString(data.employeeId ?? data.employee_id),
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

      if (
        data.transactionType !== undefined ||
        data.transaction_type !== undefined
      )
        patch.transactionType = data.transactionType ?? data.transaction_type;
      if (data.quantity !== undefined || data.quantityChange !== undefined)
        patch.quantity = toDecimalRequired(
          data.quantity ?? data.quantityChange,
          0
        );
      if (data.unitCost !== undefined || data.unit_cost !== undefined)
        patch.unit_cost = toDecimalRequired(data.unitCost ?? data.unit_cost, 0);
      if (data.totalCost !== undefined || data.total_cost !== undefined)
        patch.total_cost = toDecimalInput(data.totalCost ?? data.total_cost);
      if (data.reference !== undefined) patch.reference = data.reference;
      if (data.notes !== undefined) patch.notes = data.notes;
      if (
        data.transactionDate !== undefined ||
        data.transaction_date !== undefined
      )
        patch.transaction_date =
          (data.transactionDate ?? data.transaction_date)
            ? new Date(
                (data.transactionDate ?? data.transaction_date) as
                  | number
                  | string
              )
            : new Date();
      if (data.reason !== undefined) patch.reason = data.reason;
      if (data.referenceType !== undefined || data.reference_type !== undefined)
        patch.referenceType = data.referenceType ?? data.reference_type;
      if (data.referenceId !== undefined || data.reference_id !== undefined)
        patch.referenceId = data.referenceId ?? data.reference_id;
      if (data.employeeId !== undefined || data.employee_id !== undefined)
        patch.employee_id = data.employeeId ?? data.employee_id;
      if (
        data.storageLocationId !== undefined ||
        data.storage_location_id !== undefined
      )
        patch.storage_location_id =
          data.storageLocationId ?? data.storage_location_id;

      const updated = await this.prisma.inventoryTransaction.update({
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
      // Hard delete — no deletedAt column on inventory_transactions
      await this.prisma.inventoryTransaction.delete({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.inventoryTransaction.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(row: Record<string, unknown>): EntityInstance {
    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      itemId: row.itemId as string,
      transactionType: row.transactionType as string,
      quantity: Number(row.quantity ?? 0),
      unitCost: Number(row.unit_cost ?? 0),
      totalCost: row.total_cost != null ? Number(row.total_cost) : null,
      reference: (row.reference as string) ?? null,
      notes: (row.notes as string) ?? null,
      transactionDate: row.transaction_date
        ? new Date(row.transaction_date as string | Date).getTime()
        : 0,
      createdAt: row.createdAt
        ? new Date(row.createdAt as string | Date).getTime()
        : 0,
      storageLocationId: (row.storage_location_id as string) ?? "",
      reason: (row.reason as string) ?? "",
      referenceType: (row.referenceType as string) ?? null,
      referenceId: (row.referenceId as string) ?? null,
      employeeId: (row.employee_id as string) ?? null,
    };
  }
}
