/**
 * BROKEN_RAW_SQL parent workflow — PurchaseOrder Prisma store.
 *
 * PurchaseOrder — tenant_inventory.purchase_orders
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Required Decimals (default 0): subtotal, taxAmount, shippingAmount, total
 *   - Status lifecycle: draft → submitted → approved → ordered → received / cancelled
 *   - Timestamp fields: submittedAt, receivedAt
 *   - Soft-delete via deletedAt
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asNullableDate,
  asNullableString,
  type EntityInstance,
  reportOp,
  toDecimalRequired,
} from "./shared";

// ---------------------------------------------------------------------------
// PurchaseOrderPrismaStore
// ---------------------------------------------------------------------------

export class PurchaseOrderPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.purchaseOrder.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.purchaseOrder.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.purchaseOrder.create({
      data: {
        tenantId: this.tenantId,
        id,
        poNumber: (data.poNumber as string) ?? `PO-${Date.now()}`,
        vendorId: (data.vendorId as string) ?? crypto.randomUUID(),
        locationId: asNullableString(data.locationId) ?? crypto.randomUUID(),
        orderDate: asNullableDate(data.orderDate) ?? new Date(),
        expectedDeliveryDate: asNullableDate(data.expectedDeliveryDate),
        actualDeliveryDate: asNullableDate(data.actualDeliveryDate),
        status: asNullableString(data.status) ?? "draft",
        subtotal: toDecimalRequired(data.subtotal, 0),
        taxAmount: toDecimalRequired(data.taxAmount, 0),
        shippingAmount: toDecimalRequired(data.shippingAmount, 0),
        total: toDecimalRequired(data.total, 0),
        notes: asNullableString(data.notes),
        submittedBy: asNullableString(data.submittedBy),
        submittedAt: asNullableDate(data.submittedAt),
        receivedBy: asNullableString(data.receivedBy),
        receivedAt: asNullableDate(data.receivedAt),
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
      if (data.poNumber !== undefined) patch.poNumber = data.poNumber;
      if (data.vendorId !== undefined)
        patch.vendorId = asNullableString(data.vendorId);
      if (data.locationId !== undefined)
        patch.locationId = asNullableString(data.locationId);
      if (data.orderDate !== undefined)
        patch.orderDate = asNullableDate(data.orderDate);
      if (data.expectedDeliveryDate !== undefined)
        patch.expectedDeliveryDate = asNullableDate(data.expectedDeliveryDate);
      if (data.actualDeliveryDate !== undefined)
        patch.actualDeliveryDate = asNullableDate(data.actualDeliveryDate);
      if (data.status !== undefined)
        patch.status = asNullableString(data.status);
      if (data.subtotal !== undefined)
        patch.subtotal = toDecimalRequired(data.subtotal, 0);
      if (data.taxAmount !== undefined)
        patch.taxAmount = toDecimalRequired(data.taxAmount, 0);
      if (data.shippingAmount !== undefined)
        patch.shippingAmount = toDecimalRequired(data.shippingAmount, 0);
      if (data.total !== undefined)
        patch.total = toDecimalRequired(data.total, 0);
      if (data.notes !== undefined) patch.notes = asNullableString(data.notes);
      if (data.submittedBy !== undefined)
        patch.submittedBy = asNullableString(data.submittedBy);
      if (data.submittedAt !== undefined)
        patch.submittedAt = asNullableDate(data.submittedAt);
      if (data.receivedBy !== undefined)
        patch.receivedBy = asNullableString(data.receivedBy);
      if (data.receivedAt !== undefined)
        patch.receivedAt = asNullableDate(data.receivedAt);

      const row = await this.prisma.purchaseOrder.update({
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
      await this.prisma.purchaseOrder.update({
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
    await this.prisma.purchaseOrder.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      poNumber: r.poNumber ?? "",
      vendorId: r.vendorId ?? "",
      locationId: r.locationId ?? null,
      orderDate: r.orderDate ?? null,
      expectedDeliveryDate: r.expectedDeliveryDate ?? null,
      actualDeliveryDate: r.actualDeliveryDate ?? null,
      status: r.status ?? "draft",
      subtotal: r.subtotal ?? 0,
      taxAmount: r.taxAmount ?? 0,
      shippingAmount: r.shippingAmount ?? 0,
      total: r.total ?? 0,
      notes: r.notes ?? null,
      submittedBy: r.submittedBy ?? null,
      submittedAt: r.submittedAt ?? null,
      receivedBy: r.receivedBy ?? null,
      receivedAt: r.receivedAt ?? null,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}
