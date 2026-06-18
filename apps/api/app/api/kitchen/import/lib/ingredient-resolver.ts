import { database } from "@repo/database";
import { runKitchenImportCommand } from "./manifest-command";
import { resolveUnitId } from "./unit-resolver";
import type { ImportUserContext } from "./types";

export async function findOrCreateIngredientId(
  ingredientName: string,
  unitHint: string | null,
  context: ImportUserContext
): Promise<string | null> {
  const { tenantId, userId, userRole } = context;

  const existing = await database.ingredient.findFirst({
    where: { tenantId, name: ingredientName, deletedAt: null },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const defaultUnitId = await resolveUnitId(unitHint, 1);
  const result = await runKitchenImportCommand(
    { id: userId, tenantId, role: userRole },
    "Ingredient",
    "create",
    {
      tenantId,
      name: ingredientName,
      category: "",
      defaultUnitId,
      densityGPerMl: 0,
      shelfLifeDays: 0,
      storageInstructions: "",
      allergens: [],
    }
  );

  if (!result.ok) {
    return null;
  }

  return (result.result as { id?: string }).id ?? null;
}
