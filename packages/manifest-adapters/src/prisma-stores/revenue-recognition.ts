/**
 * Prisma stores for RevenueRecognitionSchedule + RevenueRecognitionLine.
 *
 * RevenueRecognitionSchedule — `tenant_accounting.revenue_recognition_schedules`
 *   - Composite key: tenantId_id
 *   - Required Decimals: totalAmount, remainingAmount
 *   - Default Decimal: recognizedAmount (0)
 *   - Required DateTimes: startDate, endDate
 *   - Required Int (no default): recognitionPeriod
 *   - Int defaults: totalMilestones (0), completedMilestones (0)
 *   - Optional DateTimes: serviceStartDate, serviceEndDate, completedAt
 *   - JSON column: metadata
 *   - Soft-delete via deletedAt
 *   - Every manifest property maps to a relational column — no metadata-only
 *     stashing required for this entity.
 *
 * RevenueRecognitionLine — `tenant_accounting.revenue_recognition_lines`
 *   - Composite key: tenantId_id
 *   - FK to schedule via tenantId+scheduleId (cascade delete)
 *   - Required Decimal: amount
 *   - Default Decimal: recognizedAmount (0)
 *   - Int default: sequence (0)
 *   - Optional DateTimes: dueDate, recognizedAt
 *   - Optional Strings: milestoneId/Name/Description, description, notes
 *   - JSON column: metadata
 *   - Soft-delete via deletedAt
 *   - Every manifest property maps to a relational column.
 *
 * Adding these stores closes the "soft compliance" gap surfaced by
 * `pnpm manifest:audit-direct-writes` for the revenue-recognition routes —
 * runtime persistence now writes the relational columns, not a JSON blob.
 * It does NOT migrate the API route. See the route's top-of-file blocker for
 * the remaining cross-entity-transaction blocker on `recognize` / `reverse`.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asJsonInput,
  asNullableDate,
  asNullableNumber,
  asNullableString,
  asString,
  type EntityInstance,
  reportOp,
  toDecimalRequired,
} from "./shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Manifest IR declares `metadata: string = ""` for both entities, but the
 * runtime in practice passes either an object or undefined. Mirror the
 * existing CollectionCase store: treat anything other than a plain object as
 * `{}`.
 */
function asMetadataObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/**
 * Convert a Prisma DateTime row value to the manifest's number-epoch
 * representation. Returns null when the column is null.
 */
function dateToEpoch(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (value === null || value === undefined) return null;
  return null;
}

// ---------------------------------------------------------------------------
// RevenueRecognitionSchedulePrismaStore
// ---------------------------------------------------------------------------

export class RevenueRecognitionSchedulePrismaStore
  implements Store<EntityInstance>
{
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.revenueRecognitionSchedule.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.revenueRecognitionSchedule.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();

    const row = await this.prisma.revenueRecognitionSchedule.create({
      data: {
        tenantId: this.tenantId,
        id,
        invoiceId: asString(data.invoiceId),
        eventId: asString(data.eventId),
        contractId: asNullableString(data.contractId),
        clientId: asString(data.clientId),
        totalAmount: toDecimalRequired(data.totalAmount, 0),
        recognizedAmount: toDecimalRequired(data.recognizedAmount, 0),
        remainingAmount: toDecimalRequired(
          data.remainingAmount ?? data.totalAmount,
          0
        ),
        method: asString(data.method) || "IMMEDIATE",
        status: asString(data.status) || "PENDING",
        startDate: asNullableDate(data.startDate) ?? new Date(),
        endDate: asNullableDate(data.endDate) ?? new Date(),
        recognitionPeriod: asNullableNumber(data.recognitionPeriod) ?? 0,
        serviceStartDate: asNullableDate(data.serviceStartDate),
        serviceEndDate: asNullableDate(data.serviceEndDate),
        totalMilestones: asNullableNumber(data.totalMilestones) ?? 0,
        completedMilestones: asNullableNumber(data.completedMilestones) ?? 0,
        description: asNullableString(data.description),
        notes: asNullableString(data.notes),
        metadata: asJsonInput(asMetadataObject(data.metadata)),
        completedAt: asNullableDate(data.completedAt),
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

      if (data.invoiceId !== undefined)
        patch.invoiceId = asString(data.invoiceId);
      if (data.eventId !== undefined) patch.eventId = asString(data.eventId);
      if (data.contractId !== undefined)
        patch.contractId = asNullableString(data.contractId);
      if (data.clientId !== undefined) patch.clientId = asString(data.clientId);
      if (data.totalAmount !== undefined)
        patch.totalAmount = toDecimalRequired(data.totalAmount, 0);
      if (data.recognizedAmount !== undefined)
        patch.recognizedAmount = toDecimalRequired(data.recognizedAmount, 0);
      if (data.remainingAmount !== undefined)
        patch.remainingAmount = toDecimalRequired(data.remainingAmount, 0);
      if (data.method !== undefined) patch.method = asString(data.method);
      if (data.status !== undefined) patch.status = asString(data.status);
      if (data.startDate !== undefined)
        patch.startDate = asNullableDate(data.startDate) ?? new Date();
      if (data.endDate !== undefined)
        patch.endDate = asNullableDate(data.endDate) ?? new Date();
      if (data.recognitionPeriod !== undefined)
        patch.recognitionPeriod = asNullableNumber(data.recognitionPeriod) ?? 0;
      if (data.serviceStartDate !== undefined)
        patch.serviceStartDate = asNullableDate(data.serviceStartDate);
      if (data.serviceEndDate !== undefined)
        patch.serviceEndDate = asNullableDate(data.serviceEndDate);
      if (data.totalMilestones !== undefined)
        patch.totalMilestones = asNullableNumber(data.totalMilestones) ?? 0;
      if (data.completedMilestones !== undefined)
        patch.completedMilestones =
          asNullableNumber(data.completedMilestones) ?? 0;
      if (data.description !== undefined)
        patch.description = asNullableString(data.description);
      if (data.notes !== undefined)
        patch.notes = asNullableString(data.notes);
      if (data.metadata !== undefined)
        patch.metadata = asJsonInput(asMetadataObject(data.metadata));
      if (data.completedAt !== undefined)
        patch.completedAt = asNullableDate(data.completedAt);

      const row = await this.prisma.revenueRecognitionSchedule.update({
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
      await this.prisma.revenueRecognitionSchedule.update({
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
    await this.prisma.revenueRecognitionSchedule.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      invoiceId: (r.invoiceId as string) ?? "",
      eventId: (r.eventId as string) ?? "",
      contractId: (r.contractId as string) ?? "",
      clientId: (r.clientId as string) ?? "",
      totalAmount: r.totalAmount ?? 0,
      recognizedAmount: r.recognizedAmount ?? 0,
      remainingAmount: r.remainingAmount ?? 0,
      method: (r.method as string) ?? "IMMEDIATE",
      status: (r.status as string) ?? "PENDING",
      startDate: dateToEpoch(r.startDate) ?? 0,
      endDate: dateToEpoch(r.endDate) ?? 0,
      recognitionPeriod: (r.recognitionPeriod as number) ?? 0,
      serviceStartDate: dateToEpoch(r.serviceStartDate) ?? 0,
      serviceEndDate: dateToEpoch(r.serviceEndDate) ?? 0,
      totalMilestones: (r.totalMilestones as number) ?? 0,
      completedMilestones: (r.completedMilestones as number) ?? 0,
      description: (r.description as string) ?? "",
      notes: (r.notes as string) ?? "",
      metadata: r.metadata ?? {},
      createdAt: dateToEpoch(r.createdAt) ?? 0,
      updatedAt: dateToEpoch(r.updatedAt) ?? 0,
      completedAt: dateToEpoch(r.completedAt) ?? 0,
      deletedAt: dateToEpoch(r.deletedAt),
    };
  }
}

// ---------------------------------------------------------------------------
// RevenueRecognitionLinePrismaStore
// ---------------------------------------------------------------------------

export class RevenueRecognitionLinePrismaStore
  implements Store<EntityInstance>
{
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.revenueRecognitionLine.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: [{ scheduleId: "asc" }, { sequence: "asc" }],
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.revenueRecognitionLine.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();

    const row = await this.prisma.revenueRecognitionLine.create({
      data: {
        tenantId: this.tenantId,
        id,
        scheduleId: asString(data.scheduleId),
        sequence: asNullableNumber(data.sequence) ?? 0,
        amount: toDecimalRequired(data.amount, 0),
        recognizedAmount: toDecimalRequired(data.recognizedAmount, 0),
        status: asString(data.status) || "PENDING",
        dueDate: asNullableDate(data.dueDate),
        recognizedAt: asNullableDate(data.recognizedAt),
        milestoneId: asNullableString(data.milestoneId),
        milestoneName: asNullableString(data.milestoneName),
        milestoneDescription: asNullableString(data.milestoneDescription),
        description: asNullableString(data.description),
        notes: asNullableString(data.notes),
        metadata: asJsonInput(asMetadataObject(data.metadata)),
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

      if (data.scheduleId !== undefined)
        patch.scheduleId = asString(data.scheduleId);
      if (data.sequence !== undefined)
        patch.sequence = asNullableNumber(data.sequence) ?? 0;
      if (data.amount !== undefined)
        patch.amount = toDecimalRequired(data.amount, 0);
      if (data.recognizedAmount !== undefined)
        patch.recognizedAmount = toDecimalRequired(data.recognizedAmount, 0);
      if (data.status !== undefined) patch.status = asString(data.status);
      if (data.dueDate !== undefined)
        patch.dueDate = asNullableDate(data.dueDate);
      if (data.recognizedAt !== undefined)
        patch.recognizedAt = asNullableDate(data.recognizedAt);
      if (data.milestoneId !== undefined)
        patch.milestoneId = asNullableString(data.milestoneId);
      if (data.milestoneName !== undefined)
        patch.milestoneName = asNullableString(data.milestoneName);
      if (data.milestoneDescription !== undefined)
        patch.milestoneDescription = asNullableString(data.milestoneDescription);
      if (data.description !== undefined)
        patch.description = asNullableString(data.description);
      if (data.notes !== undefined)
        patch.notes = asNullableString(data.notes);
      if (data.metadata !== undefined)
        patch.metadata = asJsonInput(asMetadataObject(data.metadata));

      const row = await this.prisma.revenueRecognitionLine.update({
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
      await this.prisma.revenueRecognitionLine.update({
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
    await this.prisma.revenueRecognitionLine.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      scheduleId: (r.scheduleId as string) ?? "",
      sequence: (r.sequence as number) ?? 0,
      amount: r.amount ?? 0,
      recognizedAmount: r.recognizedAmount ?? 0,
      status: (r.status as string) ?? "PENDING",
      dueDate: dateToEpoch(r.dueDate) ?? 0,
      recognizedAt: dateToEpoch(r.recognizedAt) ?? 0,
      milestoneId: (r.milestoneId as string) ?? "",
      milestoneName: (r.milestoneName as string) ?? "",
      milestoneDescription: (r.milestoneDescription as string) ?? "",
      description: (r.description as string) ?? "",
      notes: (r.notes as string) ?? "",
      metadata: r.metadata ?? {},
      createdAt: dateToEpoch(r.createdAt) ?? 0,
      updatedAt: dateToEpoch(r.updatedAt) ?? 0,
      deletedAt: dateToEpoch(r.deletedAt),
    };
  }
}
