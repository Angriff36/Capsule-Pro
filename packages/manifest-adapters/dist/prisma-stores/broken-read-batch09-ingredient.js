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
import { asBool, asNullableNumber, asNullableString, asStringArray, reportOp, toDecimalInput, } from "./shared";
// ---------------------------------------------------------------------------
// IngredientPrismaStore  (tenant_kitchen.ingredients)
// ---------------------------------------------------------------------------
export class IngredientPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.ingredient.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.ingredient.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.ingredient.create({
            data: {
                tenantId: this.tenantId,
                id,
                name: data.name ?? "Unnamed Ingredient",
                category: asNullableString(data.category),
                defaultUnitId: data.defaultUnitId ?? 1,
                densityGPerMl: toDecimalInput(data.densityGPerMl),
                shelfLifeDays: asNullableNumber(data.shelfLifeDays),
                storageInstructions: asNullableString(data.storageInstructions),
                allergens: asStringArray(data.allergens),
                isActive: asBool(data.isActive, true),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.name !== undefined)
                patch.name = data.name;
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
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.ingredient.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.ingredient.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
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
