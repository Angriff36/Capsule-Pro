/**
 * BROKEN_PRISMA_READ batch 08 — EventProfitability + EventReport stores.
 *
 * EventProfitability → tenant_events.event_profitability
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Many required Decimal fields (all @default(0)): budgetedRevenue,
 *     budgetedFoodCost, budgetedLaborCost, budgetedOverhead,
 *     budgetedTotalCost, budgetedGrossMargin, budgetedGrossMarginPct,
 *     actualRevenue, actualFoodCost, actualLaborCost, actualOverhead,
 *     actualTotalCost, actualGrossMargin, actualGrossMarginPct,
 *     revenueVariance, foodCostVariance, laborCostVariance,
 *     totalCostVariance, marginVariancePct
 *
 * EventReport → tenant_events.event_reports
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Json fields: checklistData (required), parsedEventData (nullable),
 *     reportConfig (nullable)
 *   - Nullable Int: autoFillScore, completion
 *   - Nullable DateTime: reviewedAt, completedAt
 *
 * Both soft-delete via deletedAt.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asJsonInput,
  asNullableDate,
  asNullableNumber,
  asNullableString,
  type EntityInstance,
  reportOp,
  toDecimalRequired,
} from "./shared.js";

// ---------------------------------------------------------------------------
// EventProfitabilityPrismaStore  (tenant_events.event_profitability)
// ---------------------------------------------------------------------------

export class EventProfitabilityPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.eventProfitability.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.eventProfitability.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.eventProfitability.create({
      data: {
        tenantId: this.tenantId,
        id,
        eventId: data.eventId as string,
        budgetedRevenue: toDecimalRequired(data.budgetedRevenue, 0),
        budgetedFoodCost: toDecimalRequired(data.budgetedFoodCost, 0),
        budgetedLaborCost: toDecimalRequired(data.budgetedLaborCost, 0),
        budgetedOverhead: toDecimalRequired(data.budgetedOverhead, 0),
        budgetedTotalCost: toDecimalRequired(data.budgetedTotalCost, 0),
        budgetedGrossMargin: toDecimalRequired(data.budgetedGrossMargin, 0),
        budgetedGrossMarginPct: toDecimalRequired(
          data.budgetedGrossMarginPct,
          0,
        ),
        actualRevenue: toDecimalRequired(data.actualRevenue, 0),
        actualFoodCost: toDecimalRequired(data.actualFoodCost, 0),
        actualLaborCost: toDecimalRequired(data.actualLaborCost, 0),
        actualOverhead: toDecimalRequired(data.actualOverhead, 0),
        actualTotalCost: toDecimalRequired(data.actualTotalCost, 0),
        actualGrossMargin: toDecimalRequired(data.actualGrossMargin, 0),
        actualGrossMarginPct: toDecimalRequired(data.actualGrossMarginPct, 0),
        revenueVariance: toDecimalRequired(data.revenueVariance, 0),
        foodCostVariance: toDecimalRequired(data.foodCostVariance, 0),
        laborCostVariance: toDecimalRequired(data.laborCostVariance, 0),
        totalCostVariance: toDecimalRequired(data.totalCostVariance, 0),
        marginVariancePct: toDecimalRequired(data.marginVariancePct, 0),
        calculationMethod: asNullableString(data.calculationMethod) ?? "auto",
        notes: asNullableString(data.notes),
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
      if (data.eventId !== undefined) patch.eventId = data.eventId;
      if (data.budgetedRevenue !== undefined)
        patch.budgetedRevenue = toDecimalRequired(data.budgetedRevenue, 0);
      if (data.budgetedFoodCost !== undefined)
        patch.budgetedFoodCost = toDecimalRequired(data.budgetedFoodCost, 0);
      if (data.budgetedLaborCost !== undefined)
        patch.budgetedLaborCost = toDecimalRequired(data.budgetedLaborCost, 0);
      if (data.budgetedOverhead !== undefined)
        patch.budgetedOverhead = toDecimalRequired(data.budgetedOverhead, 0);
      if (data.budgetedTotalCost !== undefined)
        patch.budgetedTotalCost = toDecimalRequired(
          data.budgetedTotalCost,
          0,
        );
      if (data.budgetedGrossMargin !== undefined)
        patch.budgetedGrossMargin = toDecimalRequired(
          data.budgetedGrossMargin,
          0,
        );
      if (data.budgetedGrossMarginPct !== undefined)
        patch.budgetedGrossMarginPct = toDecimalRequired(
          data.budgetedGrossMarginPct,
          0,
        );
      if (data.actualRevenue !== undefined)
        patch.actualRevenue = toDecimalRequired(data.actualRevenue, 0);
      if (data.actualFoodCost !== undefined)
        patch.actualFoodCost = toDecimalRequired(data.actualFoodCost, 0);
      if (data.actualLaborCost !== undefined)
        patch.actualLaborCost = toDecimalRequired(data.actualLaborCost, 0);
      if (data.actualOverhead !== undefined)
        patch.actualOverhead = toDecimalRequired(data.actualOverhead, 0);
      if (data.actualTotalCost !== undefined)
        patch.actualTotalCost = toDecimalRequired(data.actualTotalCost, 0);
      if (data.actualGrossMargin !== undefined)
        patch.actualGrossMargin = toDecimalRequired(data.actualGrossMargin, 0);
      if (data.actualGrossMarginPct !== undefined)
        patch.actualGrossMarginPct = toDecimalRequired(
          data.actualGrossMarginPct,
          0,
        );
      if (data.revenueVariance !== undefined)
        patch.revenueVariance = toDecimalRequired(data.revenueVariance, 0);
      if (data.foodCostVariance !== undefined)
        patch.foodCostVariance = toDecimalRequired(data.foodCostVariance, 0);
      if (data.laborCostVariance !== undefined)
        patch.laborCostVariance = toDecimalRequired(data.laborCostVariance, 0);
      if (data.totalCostVariance !== undefined)
        patch.totalCostVariance = toDecimalRequired(data.totalCostVariance, 0);
      if (data.marginVariancePct !== undefined)
        patch.marginVariancePct = toDecimalRequired(data.marginVariancePct, 0);
      if (data.calculationMethod !== undefined)
        patch.calculationMethod = asNullableString(data.calculationMethod);
      if (data.notes !== undefined)
        patch.notes = asNullableString(data.notes);

      const row = await this.prisma.eventProfitability.update({
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
      await this.prisma.eventProfitability.update({
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
    await this.prisma.eventProfitability.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      eventId: r.eventId ?? null,
      budgetedRevenue: r.budgetedRevenue ?? 0,
      budgetedFoodCost: r.budgetedFoodCost ?? 0,
      budgetedLaborCost: r.budgetedLaborCost ?? 0,
      budgetedOverhead: r.budgetedOverhead ?? 0,
      budgetedTotalCost: r.budgetedTotalCost ?? 0,
      budgetedGrossMargin: r.budgetedGrossMargin ?? 0,
      budgetedGrossMarginPct: r.budgetedGrossMarginPct ?? 0,
      actualRevenue: r.actualRevenue ?? 0,
      actualFoodCost: r.actualFoodCost ?? 0,
      actualLaborCost: r.actualLaborCost ?? 0,
      actualOverhead: r.actualOverhead ?? 0,
      actualTotalCost: r.actualTotalCost ?? 0,
      actualGrossMargin: r.actualGrossMargin ?? 0,
      actualGrossMarginPct: r.actualGrossMarginPct ?? 0,
      revenueVariance: r.revenueVariance ?? 0,
      foodCostVariance: r.foodCostVariance ?? 0,
      laborCostVariance: r.laborCostVariance ?? 0,
      totalCostVariance: r.totalCostVariance ?? 0,
      marginVariancePct: r.marginVariancePct ?? 0,
      calculatedAt: r.calculatedAt ?? null,
      calculationMethod: r.calculationMethod ?? "auto",
      notes: r.notes ?? null,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// EventReportPrismaStore  (tenant_events.event_reports)
// ---------------------------------------------------------------------------

export class EventReportPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.eventReport.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.eventReport.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.eventReport.create({
      data: {
        tenantId: this.tenantId,
        id,
        eventId: data.eventId as string,
        name: (data.name as string) ?? "Untitled Report",
        version: asNullableString(data.version) ?? "2025-01-01",
        status: asNullableString(data.status) ?? "draft",
        completion: asNullableNumber(data.completion) ?? 0,
        checklistData: asJsonInput(data.checklistData),
        parsedEventData: asJsonInput(data.parsedEventData),
        reportConfig: asJsonInput(data.reportConfig),
        autoFillScore: asNullableNumber(data.autoFillScore),
        reviewNotes: asNullableString(data.reviewNotes),
        reviewedBy: asNullableString(data.reviewedBy),
        reviewedAt: asNullableDate(data.reviewedAt),
        completedAt: asNullableDate(data.completedAt),
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
      if (data.eventId !== undefined) patch.eventId = data.eventId;
      if (data.name !== undefined) patch.name = data.name;
      if (data.version !== undefined)
        patch.version = asNullableString(data.version);
      if (data.status !== undefined)
        patch.status = asNullableString(data.status);
      if (data.completion !== undefined)
        patch.completion = asNullableNumber(data.completion) ?? 0;
      if (data.checklistData !== undefined)
        patch.checklistData = asJsonInput(data.checklistData);
      if (data.parsedEventData !== undefined)
        patch.parsedEventData = asJsonInput(data.parsedEventData);
      if (data.reportConfig !== undefined)
        patch.reportConfig = asJsonInput(data.reportConfig);
      if (data.autoFillScore !== undefined)
        patch.autoFillScore = asNullableNumber(data.autoFillScore);
      if (data.reviewNotes !== undefined)
        patch.reviewNotes = asNullableString(data.reviewNotes);
      if (data.reviewedBy !== undefined)
        patch.reviewedBy = asNullableString(data.reviewedBy);
      if (data.reviewedAt !== undefined)
        patch.reviewedAt = asNullableDate(data.reviewedAt);
      if (data.completedAt !== undefined)
        patch.completedAt = asNullableDate(data.completedAt);

      const row = await this.prisma.eventReport.update({
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
      await this.prisma.eventReport.update({
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
    await this.prisma.eventReport.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      eventId: r.eventId ?? null,
      name: r.name ?? "Untitled Report",
      version: r.version ?? "2025-01-01",
      status: r.status ?? "draft",
      completion: r.completion ?? 0,
      checklistData: r.checklistData ?? {},
      parsedEventData: r.parsedEventData ?? null,
      reportConfig: r.reportConfig ?? null,
      autoFillScore: r.autoFillScore ?? null,
      reviewNotes: r.reviewNotes ?? null,
      reviewedBy: r.reviewedBy ?? null,
      reviewedAt: r.reviewedAt ?? null,
      completedAt: r.completedAt ?? null,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}
