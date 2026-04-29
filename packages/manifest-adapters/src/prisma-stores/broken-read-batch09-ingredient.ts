/**
 * BROKEN_PRISMA_READ batch 09 — Ingredient store.
 *
 * Ingredient → tenant_kitchen.ingredients
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Nullable Decimal: densityGPerMl
 *   - Nullable Int/SmallInt: shelfLifeDays
 *   - Nullable String: category, storageInstructions
 *   - String[]: allergens
 *   - Boolean: isActive
 *
 * Replaces the inline IngredientPrismaStore in prisma-store.ts.
 * Soft-deletes via deletedAt.
 */

import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import {
  asBool,
  asNullableNumber,
  asNullableString,
  asStringArray,
  type EntityInstance,
  reportOp,
  toDecimalInput,
} from "./shared.js";

// ---------------------------------------------------------------------------
// IngredientPrismaStore  (tenant_kitchen.ingredients)
// ---------------------------------------------------------------------------

export class IngredientPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.ingredient.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.ingredient.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.ingredient.create({
      data: {
        tenantId: this.tenantId,
        id,
        name: (data.name as string) ?? "Unnamed Ingredient",
        category: asNullableString(data.category),
        defaultUnitId: (data.defaultUnitId as number) ?? 1,
        densityGPerMl: toDecimalInput(data.densityGPerMl),
        shelfLifeDays: asNullableNumber(data.shelfLifeDays),
        storageInstructions: asNullableString(data.storageInstructions),
        allergens: asStringArray(data.allergens),
        isActive: asBool(data.isActive, true),
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
      if (data.name !== undefined) patch.name = data.name;
      if (data.category !== undefined)
        patch.category = asNullableString(data.category);
      if (data.defaultUnitId !== undefined)
        patch.defaultUnitId = data.defaultUnitId;
      if (data.densityGPerMl !== undefined)
        patch.densityGPerMl = toDecimalInput(data.densityGPerMl);
      if (data.shelfLifeDays !== undefined)
        patch.shelfLifeDays = asNullableNumber(data.shelfLifeDays);
      if (data.storageInstructions !== undefined)
        patch.storageInstructions = asNullableString(data.storageInstructions);
      if (data.allergens !== undefined)
        patch.allergens = asStringArray(data.allergens);
      if (data.isActive !== undefined)
        patch.isActive = asBool(data.isActive, true);

      const row = await this.prisma.ingredient.update({
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
      await this.prisma.ingredient.update({
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
    await this.prisma.ingredient.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: Record<string, unknown>): EntityInstance {
    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      name: r.name ?? "",
      category: r.category ?? null,
      defaultUnitId: r.defaultUnitId ?? 1,
      densityGPerMl: r.densityGPerMl ?? null,
      shelfLifeDays: r.shelfLifeDays ?? null,
      storageInstructions: r.storageInstructions ?? null,
      allergens: r.allergens ?? [],
      isActive: r.isActive ?? true,
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
      deletedAt: r.deletedAt ?? null,
    };
  }
}
