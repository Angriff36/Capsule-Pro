/**
 * BROKEN_RAW_SQL parent workflow — PurchaseRequisition Prisma store.
 *
 * PurchaseRequisition — tenant_inventory.purchase_requisitions
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Required Decimals (default 0): subtotal, estimatedTax, estimatedShipping, estimatedTotal
 *   - Status lifecycle: draft → pending → approved → rejected / converted
 *   - Approval chain: managerApproval → financeApproval
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
} from "./shared.js";

// ---------------------------------------------------------------------------
// PurchaseRequisitionPrismaStore
// ---------------------------------------------------------------------------

export class PurchaseRequisitionPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.purchaseRequisition.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.purchaseRequisition.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.purchaseRequisition.create({
      data: {
        tenantId: this.tenantId,
        id,
        requisitionNumber:
          (data.requisitionNumber as string) ?? `REQ-${Date.now()}`,
        requestedBy: (data.requestedBy as string) ?? crypto.randomUUID(),
        requestDate: asNullableDate(data.requestDate) ?? new Date(),
        requiredBy: asNullableDate(data.requiredBy),
        locationId: asNullableString(data.locationId),
        department: asNullableString(data.department),
        justification: asNullableString(data.justification),
        status: asNullableString(data.status) ?? "draft",
        subtotal: toDecimalRequired(data.subtotal, 0),
        estimatedTax: toDecimalRequired(data.estimatedTax, 0),
        estimatedShipping: toDecimalRequired(data.estimatedShipping, 0),
        estimatedTotal: toDecimalRequired(data.estimatedTotal, 0),
        approvedBy: asNullableString(data.approvedBy),
        approvedAt: asNullableDate(data.approvedAt),
        managerApprovalBy: asNullableString(data.managerApprovalBy),
        managerApprovalAt: asNullableDate(data.managerApprovalAt),
        financeApprovalBy: asNullableString(data.financeApprovalBy),
        financeApprovalAt: asNullableDate(data.financeApprovalAt),
        convertedToPoId: asNullableString(data.convertedToPoId),
        convertedAt: asNullableDate(data.convertedAt),
        rejectionReason: asNullableString(data.rejectionReason),
        notes: asNullableString(data.notes),
        submittedAt: asNullableDate(data.submittedAt),
        itemCategory: asNullableString(data.itemCategory),
        priority: asNullableString(data.priority) ?? "normal",
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
      if (data.requisitionNumber !== undefined)
        patch.requisitionNumber = data.requisitionNumber;
      if (data.requestedBy !== undefined)
        patch.requestedBy = asNullableString(data.requestedBy);
      if (data.requestDate !== undefined)
        patch.requestDate = asNullableDate(data.requestDate);
      if (data.requiredBy !== undefined)
        patch.requiredBy = asNullableDate(data.requiredBy);
      if (data.locationId !== undefined)
        patch.locationId = asNullableString(data.locationId);
      if (data.department !== undefined)
        patch.department = asNullableString(data.department);
      if (data.justification !== undefined)
        patch.justification = asNullableString(data.justification);
      if (data.status !== undefined)
        patch.status = asNullableString(data.status);
      if (data.subtotal !== undefined)
        patch.subtotal = toDecimalRequired(data.subtotal, 0);
      if (data.estimatedTax !== undefined)
        patch.estimatedTax = toDecimalRequired(data.estimatedTax, 0);
      if (data.estimatedShipping !== undefined)
        patch.estimatedShipping = toDecimalRequired(data.estimatedShipping, 0);
      if (data.estimatedTotal !== undefined)
        patch.estimatedTotal = toDecimalRequired(data.estimatedTotal, 0);
      if (data.approvedBy !== undefined)
        patch.approvedBy = asNullableString(data.approvedBy);
      if (data.approvedAt !== undefined)
        patch.approvedAt = asNullableDate(data.approvedAt);
      if (data.managerApprovalBy !== undefined)
        patch.managerApprovalBy = asNullableString(data.managerApprovalBy);
      if (data.managerApprovalAt !== undefined)
        patch.managerApprovalAt = asNullableDate(data.managerApprovalAt);
      if (data.financeApprovalBy !== undefined)
        patch.financeApprovalBy = asNullableString(data.financeApprovalBy);
      if (data.financeApprovalAt !== undefined)
        patch.financeApprovalAt = asNullableDate(data.financeApprovalAt);
      if (data.convertedToPoId !== undefined)
        patch.convertedToPoId = asNullableString(data.convertedToPoId);
      if (data.convertedAt !== undefined)
        patch.convertedAt = asNullableDate(data.convertedAt);
      if (data.rejectionReason !== undefined)
        patch.rejectionReason = asNullableString(data.rejectionReason);
      if (data.notes !== undefined) patch.notes = asNullableString(data.notes);
      if (data.submittedAt !== undefined)
        patch.submittedAt = asNullableDate(data.submittedAt);
      if (data.itemCategory !== undefined)
        patch.itemCategory = asNullableString(data.itemCategory);
      if (data.priority !== undefined)
        patch.priority = asNullableString(data.priority);

      const row = await this.prisma.purchaseRequisition.update({
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
      await this.prisma.purchaseRequisition.update({
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
    await this.prisma.purchaseRequisition.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    const status = (r.status as string) ?? "draft";
    const priority = (r.priority as string) ?? "normal";
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      requisitionNumber: r.requisitionNumber ?? "",
      requestedBy: r.requestedBy ?? "",
      requestDate: r.requestDate ?? null,
      requiredBy: r.requiredBy ?? null,
      locationId: r.locationId ?? null,
      department: r.department ?? null,
      justification: r.justification ?? null,
      status,
      subtotal: r.subtotal ?? 0,
      estimatedTax: r.estimatedTax ?? 0,
      estimatedShipping: r.estimatedShipping ?? 0,
      estimatedTotal: r.estimatedTotal ?? 0,
      approvedBy: r.approvedBy ?? null,
      approvedAt: r.approvedAt ?? null,
      managerApprovalBy: r.managerApprovalBy ?? null,
      managerApprovalAt: r.managerApprovalAt ?? null,
      financeApprovalBy: r.financeApprovalBy ?? null,
      financeApprovalAt: r.financeApprovalAt ?? null,
      convertedToPoId: r.convertedToPoId ?? null,
      convertedAt: r.convertedAt ?? null,
      rejectionReason: r.rejectionReason ?? null,
      notes: r.notes ?? null,
      submittedAt: r.submittedAt ?? null,
      itemCategory: r.itemCategory ?? null,
      priority,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
      // Computed fields — no Prisma columns; return defaults
      itemCount: 0,
      isDraft: status === "draft",
      isPending: status === "pending",
      isApproved: status === "approved",
      isRejected: status === "rejected",
      isConverted: status === "converted",
      isHighPriority: priority === "high",
      requiresFinanceApproval: false,
      isEditable: status === "draft",
    };
  }
}
