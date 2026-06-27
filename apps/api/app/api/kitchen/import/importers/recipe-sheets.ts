import { parseError as parseErrorToMessage } from "@repo/observability/error";
import { findOrCreateIngredientId } from "../lib/ingredient-resolver";
import { runKitchenImportCommand } from "../lib/manifest-command";
import { emptySummary } from "../lib/parse-helpers";
import type { RecipeSheet } from "../lib/recipe-sheet-types";
import type { ImportSummary, ImportUserContext } from "../lib/types";
import { resolveUnitId } from "../lib/unit-resolver";

function buildInstructions(steps: RecipeSheet["instructions"]): string {
  return steps
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map((step) => `${step.stepNumber}. ${step.text}`)
    .join("\n");
}

function buildNotes(sheet: RecipeSheet): string {
  const sections: string[] = [];

  if (sheet.equipment.length > 0) {
    sections.push(`Equipment Needed:\n${sheet.equipment.join(", ")}`);
  }

  if (sheet.packaging.length > 0) {
    const packagingLines = sheet.packaging.map(
      (entry) => `${entry.type}: ${entry.notes}`
    );
    sections.push(`Packaging / Event Build:\n${packagingLines.join("\n")}`);
  }

  if (sheet.portionSize) {
    sections.push(`Portion Size: ${sheet.portionSize}`);
  }

  if (sheet.servings) {
    sections.push(`Servings / Portions: ${sheet.servings}`);
  }

  return sections.join("\n\n");
}

function buildTags(sheet: RecipeSheet): string[] {
  return sheet.allergens.map(
    (allergen) => `allergen:${allergen.toLowerCase()}`
  );
}

const VERSION_NUMBER_RE = /(\d+)/;

function parseVersionNumber(versionLabel: string): number {
  if (!versionLabel.trim()) {
    return 1;
  }

  if (versionLabel.includes(".")) {
    return 1;
  }

  const match = versionLabel.match(VERSION_NUMBER_RE);
  return match?.[1] ? Number.parseInt(match[1], 10) : 1;
}

export async function importRecipeSheet(
  sheet: RecipeSheet,
  context: ImportUserContext
): Promise<{ summaryLine: string; ingredientCount: number }> {
  const { tenantId, userId, userRole } = context;
  const recipeName = sheet.recipeName.trim();

  const recipeResult = await runKitchenImportCommand(
    { id: userId, tenantId, role: userRole },
    "Recipe",
    "create",
    {
      tenantId,
      name: recipeName,
      category: "",
      cuisineType: "",
      description: "",
      tags: buildTags(sheet),
    }
  );

  if (!recipeResult.ok) {
    throw new Error(
      `Failed to create Recipe via Manifest: ${recipeResult.message}`
    );
  }

  const recipeId = (recipeResult.result as { id: string }).id;
  const yieldUnitId = await resolveUnitId(sheet.yieldUnit, 1);
  const yieldDescription =
    sheet.yieldDescription ||
    [sheet.portionSize, sheet.servings].filter(Boolean).join(" · ");

  const versionResult = await runKitchenImportCommand(
    { id: userId, tenantId, role: userRole },
    "RecipeVersion",
    "create",
    {
      // Property seeds (bootstrapped onto the new instance by name).
      tenantId,
      recipeId,
      name: sheet.versionLabel
        ? `${recipeName} ${sheet.versionLabel}`
        : recipeName,
      versionNumber: parseVersionNumber(sheet.versionLabel),
      yieldDescription,
      category: "",
      cuisineType: "",
      description: "",
      tags: buildTags(sheet),
      // Command params (drive RecipeVersion.create's guards + mutates). These
      // names must match the command signature, NOT the property names —
      // yieldQty (not yieldQuantity), yieldUnit, prepTime, etc.
      yieldQty: sheet.yieldQuantity,
      yieldUnit: yieldUnitId,
      prepTime: sheet.activePrepMinutes,
      cookTime: sheet.passiveCookMinutes,
      restTime: 0,
      difficulty: 1,
      instructionsText: buildInstructions(sheet.instructions),
      notesText: buildNotes(sheet),
    }
  );

  if (!versionResult.ok) {
    throw new Error(
      `Failed to create RecipeVersion via Manifest: ${versionResult.message}`
    );
  }

  const recipeVersionId = (versionResult.result as { id: string }).id;
  let ingredientCount = 0;

  for (let index = 0; index < sheet.ingredients.length; index++) {
    const line = sheet.ingredients[index];
    if (!line) {
      continue;
    }
    const ingredientId = await findOrCreateIngredientId(
      line.name,
      line.unit,
      context
    );

    if (!ingredientId) {
      throw new Error(`Could not create ingredient "${line.name}"`);
    }

    const unitId = await resolveUnitId(line.unit, 1);
    const lineResult = await runKitchenImportCommand(
      { id: userId, tenantId, role: userRole },
      "RecipeIngredient",
      "create",
      {
        tenantId,
        recipeVersionId,
        ingredientId,
        quantity: line.quantity.toFixed(4),
        unitId,
        sortOrder: index + 1,
        preparationNotes: line.amount,
        isOptional: false,
      }
    );

    if (!lineResult.ok) {
      throw new Error(
        `Failed to add ingredient "${line.name}": ${lineResult.message}`
      );
    }

    ingredientCount++;
  }

  return {
    summaryLine: `Recipe sheet: ${recipeName} (${ingredientCount} ingredients, ${sheet.instructions.length} steps)`,
    ingredientCount,
  };
}

export async function importRecipeSheets(
  sheets: RecipeSheet[],
  context: ImportUserContext
): Promise<ImportSummary> {
  const summary = emptySummary();

  for (const sheet of sheets) {
    if (!sheet.recipeName.trim()) {
      summary.errors.push("Recipe sheet missing recipe_name, skipped");
      summary.skipped++;
      continue;
    }

    try {
      const result = await importRecipeSheet(sheet, context);
      summary.imported++;
      summary.created.push(result.summaryLine);
    } catch (error) {
      summary.errors.push(
        `"${sheet.recipeName}": ${parseErrorToMessage(error)}`
      );
      summary.skipped++;
    }
  }

  return summary;
}
