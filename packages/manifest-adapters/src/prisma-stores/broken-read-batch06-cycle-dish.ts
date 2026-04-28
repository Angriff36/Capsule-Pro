/**
 * BROKEN_PRISMA_READ batch 06 — CycleCountSession + Dish stores.
 *
 * CycleCountSession → tenant_inventory.cycle_count_sessions
 * Dish              → tenant_kitchen.dishes
 *
 * Both use camelCase Prisma field names and composite key `tenantId_id`.
 * Soft-delete via `deletedAt`.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asNullableDate,
  asNullableNumber,
  asNullableString,
  asStringArray,
  type EntityInstance,
  reportOp,
  toDecimalInput,
  toDecimalRequired,
} from "./shared.js";

// ---------------------------------------------------------------------------
// CycleCountSessionPrismaStore  (tenant_inventory.cycle_count_sessions)
// ---------------------------------------------------------------------------

export class CycleCountSessionPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.cycleCountSession.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.cycleCountSession.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.cycleCountSession.create({
      data: {
        tenantId: this.tenantId,
        id,
        locationId: data.locationId as string,
        sessionId: data.sessionId as string,
        sessionName: data.sessionName as string,
        createdById: data.createdById as string,
        countType: asNullableString(data.countType) ?? "ad_hoc",
        status: asNullableString(data.status) ?? "draft",
        totalItems: asNullableNumber(data.totalItems) ?? 0,
        countedItems: asNullableNumber(data.countedItems) ?? 0,
        totalVariance: toDecimalRequired(data.totalVariance, 0),
        variancePercentage: toDecimalRequired(data.variancePercentage, 0),
        scheduledDate: asNullableDate(data.scheduledDate),
        startedAt: asNullableDate(data.startedAt),
        completedAt: asNullableDate(data.completedAt),
        finalizedAt: asNullableDate(data.finalizedAt),
        notes: asNullableString(data.notes),
        approvedById: asNullableString(data.approvedById),
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
      if (data.locationId !== undefined) patch.locationId = data.locationId;
      if (data.sessionId !== undefined) patch.sessionId = data.sessionId;
      if (data.sessionName !== undefined) patch.sessionName = data.sessionName;
      if (data.createdById !== undefined) patch.createdById = data.createdById;
      if (data.countType !== undefined)
        patch.countType = asNullableString(data.countType);
      if (data.status !== undefined)
        patch.status = asNullableString(data.status);
      if (data.totalItems !== undefined)
        patch.totalItems = asNullableNumber(data.totalItems);
      if (data.countedItems !== undefined)
        patch.countedItems = asNullableNumber(data.countedItems);
      if (data.totalVariance !== undefined)
        patch.totalVariance = toDecimalRequired(data.totalVariance, 0);
      if (data.variancePercentage !== undefined)
        patch.variancePercentage = toDecimalRequired(data.variancePercentage, 0);
      if (data.scheduledDate !== undefined)
        patch.scheduledDate = asNullableDate(data.scheduledDate);
      if (data.startedAt !== undefined)
        patch.startedAt = asNullableDate(data.startedAt);
      if (data.completedAt !== undefined)
        patch.completedAt = asNullableDate(data.completedAt);
      if (data.finalizedAt !== undefined)
        patch.finalizedAt = asNullableDate(data.finalizedAt);
      if (data.notes !== undefined) patch.notes = asNullableString(data.notes);
      if (data.approvedById !== undefined)
        patch.approvedById = asNullableString(data.approvedById);

      const row = await this.prisma.cycleCountSession.update({
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
      await this.prisma.cycleCountSession.update({
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
    await this.prisma.cycleCountSession.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      locationId: r.locationId ?? null,
      sessionId: r.sessionId ?? null,
      sessionName: r.sessionName ?? null,
      createdById: r.createdById ?? null,
      countType: r.countType ?? "ad_hoc",
      status: r.status ?? "draft",
      totalItems: r.totalItems ?? 0,
      countedItems: r.countedItems ?? 0,
      totalVariance: r.totalVariance ?? 0,
      variancePercentage: r.variancePercentage ?? 0,
      scheduledDate: r.scheduledDate ?? null,
      startedAt: r.startedAt ?? null,
      completedAt: r.completedAt ?? null,
      finalizedAt: r.finalizedAt ?? null,
      notes: r.notes ?? null,
      approvedById: r.approvedById ?? null,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// DishPrismaStore  (tenant_kitchen.dishes)
// ---------------------------------------------------------------------------

export class DishPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string,
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.dish.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.dish.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.dish.create({
      data: {
        tenantId: this.tenantId,
        id,
        recipeId: data.recipeId as string,
        name: data.name as string,
        dietaryTags: asStringArray(data.dietaryTags),
        allergens: asStringArray(data.allergens),
        pricePerPerson: toDecimalInput(data.pricePerPerson),
        costPerPerson: toDecimalInput(data.costPerPerson),
        minPrepLeadDays: asNullableNumber(data.minPrepLeadDays) ?? 0,
        isActive: asBool(data.isActive, true),
        description: asNullableString(data.description),
        category: asNullableString(data.category),
        serviceStyle: asNullableString(data.serviceStyle),
        defaultContainerId: asNullableString(data.defaultContainerId),
        presentationImageUrl: asNullableString(data.presentationImageUrl),
        portionSizeDescription: asNullableString(data.portionSizeDescription),
        maxPrepLeadDays: asNullableNumber(data.maxPrepLeadDays),
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
      if (data.recipeId !== undefined) patch.recipeId = data.recipeId;
      if (data.name !== undefined) patch.name = data.name;
      if (data.dietaryTags !== undefined)
        patch.dietaryTags = asStringArray(data.dietaryTags);
      if (data.allergens !== undefined)
        patch.allergens = asStringArray(data.allergens);
      if (data.pricePerPerson !== undefined)
        patch.pricePerPerson = toDecimalInput(data.pricePerPerson);
      if (data.costPerPerson !== undefined)
        patch.costPerPerson = toDecimalInput(data.costPerPerson);
      if (data.minPrepLeadDays !== undefined)
        patch.minPrepLeadDays = asNullableNumber(data.minPrepLeadDays) ?? 0;
      if (data.isActive !== undefined) patch.isActive = asBool(data.isActive, true);
      if (data.description !== undefined)
        patch.description = asNullableString(data.description);
      if (data.category !== undefined)
        patch.category = asNullableString(data.category);
      if (data.serviceStyle !== undefined)
        patch.serviceStyle = asNullableString(data.serviceStyle);
      if (data.defaultContainerId !== undefined)
        patch.defaultContainerId = asNullableString(data.defaultContainerId);
      if (data.presentationImageUrl !== undefined)
        patch.presentationImageUrl = asNullableString(data.presentationImageUrl);
      if (data.portionSizeDescription !== undefined)
        patch.portionSizeDescription = asNullableString(
          data.portionSizeDescription,
        );
      if (data.maxPrepLeadDays !== undefined)
        patch.maxPrepLeadDays = asNullableNumber(data.maxPrepLeadDays);

      const row = await this.prisma.dish.update({
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
      await this.prisma.dish.update({
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
    await this.prisma.dish.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      recipeId: r.recipeId ?? null,
      name: r.name ?? null,
      dietaryTags: r.dietaryTags ?? [],
      allergens: r.allergens ?? [],
      pricePerPerson: r.pricePerPerson ?? null,
      costPerPerson: r.costPerPerson ?? null,
      minPrepLeadDays: r.minPrepLeadDays ?? 0,
      isActive: r.isActive ?? true,
      description: r.description ?? null,
      category: r.category ?? null,
      serviceStyle: r.serviceStyle ?? null,
      defaultContainerId: r.defaultContainerId ?? null,
      presentationImageUrl: r.presentationImageUrl ?? null,
      portionSizeDescription: r.portionSizeDescription ?? null,
      maxPrepLeadDays: r.maxPrepLeadDays ?? null,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}
