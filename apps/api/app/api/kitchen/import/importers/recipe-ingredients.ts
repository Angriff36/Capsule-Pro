import { database } from "@repo/database";
import { parseError as parseErrorToMessage } from "@repo/observability/error";
import {
  emptySummary,
  getRowLabel,
  parseBoolOpt,
  parseDecimalOpt,
  parseIntOpt,
  trimOpt,
} from "../lib/parse-helpers";
import { runKitchenImportCommand } from "../lib/manifest-command";
import { resolveUnitId } from "../lib/unit-resolver";
import type { CsvRow, ImportSummary, ImportUserContext } from "../lib/types";

async function findRecipeVersionId(
  tenantId: string,
  recipeName: string
): Promise<string | null> {
  const recipe = await database.recipe.findFirst({
    where: { tenantId, name: recipeName, deletedAt: null },
    select: { id: true },
  });

  if (!recipe) {
    return null;
  }

  const version = await database.recipeVersion.findFirst({
    where: { tenantId, recipeId: recipe.id, deletedAt: null },
    orderBy: { versionNumber: "desc" },
    select: { id: true },
  });

  return version?.id ?? null;
}

async function findIngredientId(
  tenantId: string,
  ingredientName: string
): Promise<string | null> {
  const ingredient = await database.ingredient.findFirst({
    where: { tenantId, name: ingredientName, deletedAt: null },
    select: { id: true },
  });

  return ingredient?.id ?? null;
}

export async function importRecipeIngredients(
  rows: CsvRow[],
  context: ImportUserContext
): Promise<ImportSummary> {
  const summary = emptySummary();
  const { tenantId, userId, userRole } = context;
  let sortCounter = 1;

  for (const row of rows) {
    const recipeName = trimOpt(row.recipe_name);
    const ingredientName = trimOpt(row.ingredient_name);
    const label = getRowLabel(row, ["recipe_name", "ingredient_name"]);

    if (!(recipeName && ingredientName)) {
      summary.errors.push(
        `${label}: recipe_name and ingredient_name are required, skipped`
      );
      summary.skipped++;
      continue;
    }

    const quantity = parseDecimalOpt(row.quantity);
    if (!quantity || quantity <= 0) {
      summary.errors.push(
        `"${recipeName}" / "${ingredientName}": quantity must be positive, skipped`
      );
      summary.skipped++;
      continue;
    }

    try {
      const recipeVersionId = await findRecipeVersionId(tenantId, recipeName);
      if (!recipeVersionId) {
        summary.errors.push(
          `"${recipeName}" / "${ingredientName}": Recipe not found, skipped`
        );
        summary.skipped++;
        continue;
      }

      const ingredientId = await findIngredientId(tenantId, ingredientName);
      if (!ingredientId) {
        summary.errors.push(
          `"${recipeName}" / "${ingredientName}": Ingredient not found, skipped`
        );
        summary.skipped++;
        continue;
      }

      const unitId = await resolveUnitId(
        trimOpt(row.unit) ?? trimOpt(row.unit_code),
        parseIntOpt(row.unit_id) ?? 1
      );
      const sortOrder = parseIntOpt(row.sort_order) ?? sortCounter;
      sortCounter = Math.max(sortCounter, sortOrder + 1);

      const result = await runKitchenImportCommand(
        { id: userId, tenantId, role: userRole },
        "RecipeIngredient",
        "create",
        {
          tenantId,
          recipeVersionId,
          ingredientId,
          quantity: quantity.toFixed(4),
          unitId,
          sortOrder,
          preparationNotes: trimOpt(row.preparation_notes) ?? "",
          isOptional: parseBoolOpt(row.is_optional),
        }
      );

      if (!result.ok) {
        throw new Error(
          `Failed to create RecipeIngredient via Manifest: ${result.message}`
        );
      }

      summary.imported++;
      summary.created.push(
        `Recipe ingredient: ${recipeName} → ${ingredientName} (${quantity})`
      );
    } catch (error) {
      summary.errors.push(
        `"${recipeName}" / "${ingredientName}": ${parseErrorToMessage(error)}`
      );
      summary.skipped++;
    }
  }

  return summary;
}
