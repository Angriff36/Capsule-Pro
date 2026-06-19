import { parseError as parseErrorToMessage } from "@repo/observability/error";
import { runKitchenImportCommand } from "../lib/manifest-command";
import {
  emptySummary,
  mergeImportSummaries,
  parseDecimalOpt,
  parseIntOpt,
  parseListOpt,
  trimOpt,
} from "../lib/parse-helpers";
import {
  isRecipeSheetFormat,
  parseRecipeSheets,
} from "../lib/recipe-sheet-parser";
import type { RecipeSheet } from "../lib/recipe-sheet-types";
import type { CsvRow, ImportSummary, ImportUserContext } from "../lib/types";
import { importRecipeSheets } from "./recipe-sheets";

async function importLegacyRecipeRows(
  rows: CsvRow[],
  context: ImportUserContext
): Promise<ImportSummary> {
  const summary = emptySummary();
  const { tenantId, userId, userRole } = context;

  for (const row of rows) {
    const name = trimOpt(row.name);
    if (!name) {
      summary.errors.push("Row missing recipe name, skipped");
      summary.skipped++;
      continue;
    }

    try {
      const recipeResult = await runKitchenImportCommand(
        { id: userId, tenantId, role: userRole },
        "Recipe",
        "create",
        {
          tenantId,
          name,
          category: trimOpt(row.category) ?? "",
          cuisineType: trimOpt(row.cuisine_type) ?? "",
          description: trimOpt(row.description) ?? "",
          tags: parseListOpt(row.tags),
        }
      );

      if (!recipeResult.ok) {
        throw new Error(
          `Failed to create Recipe via Manifest: ${recipeResult.message}`
        );
      }

      const recipeId = (recipeResult.result as { id: string }).id;
      const yieldQty = parseDecimalOpt(row.yield_quantity) ?? 1;
      const yieldUnitId = parseIntOpt(row.yield_unit) ?? 1;

      const versionResult = await runKitchenImportCommand(
        { id: userId, tenantId, role: userRole },
        "RecipeVersion",
        "create",
        {
          // Property seeds (bootstrapped onto the new instance by name).
          tenantId,
          recipeId,
          name: row.version_name?.trim() || name,
          versionNumber: 1,
          yieldDescription: trimOpt(row.yield_description) ?? "",
          category: trimOpt(row.category) ?? "",
          cuisineType: trimOpt(row.cuisine_type) ?? "",
          description: trimOpt(row.description) ?? "",
          tags: parseListOpt(row.tags),
          // Command params (must match RecipeVersion.create's signature, not the
          // property names): yieldQty/yieldUnit/prepTime/cookTime/restTime/
          // difficulty/instructionsText/notesText.
          yieldQty,
          yieldUnit: yieldUnitId,
          prepTime: parseIntOpt(row.prep_time_minutes) ?? 0,
          cookTime: parseIntOpt(row.cook_time_minutes) ?? 0,
          restTime: parseIntOpt(row.rest_time_minutes) ?? 0,
          difficulty: parseIntOpt(row.difficulty_level) ?? 1,
          instructionsText: trimOpt(row.instructions) ?? "",
          notesText: trimOpt(row.notes) ?? "",
        }
      );

      if (!versionResult.ok) {
        throw new Error(
          `Failed to create RecipeVersion via Manifest: ${versionResult.message}`
        );
      }

      summary.imported++;
      summary.created.push(`Recipe: ${name}`);
    } catch (error) {
      summary.errors.push(`"${name}": ${parseErrorToMessage(error)}`);
      summary.skipped++;
    }
  }

  return summary;
}

export async function importRecipes(
  rows: CsvRow[],
  context: ImportUserContext,
  documentSheets: RecipeSheet[] = [],
  documentWarnings: string[] = []
): Promise<ImportSummary> {
  const summaries: ImportSummary[] = [];

  if (documentWarnings.length > 0) {
    const warningSummary = emptySummary();
    warningSummary.errors.push(...documentWarnings);
    summaries.push(warningSummary);
  }

  if (documentSheets.length > 0) {
    summaries.push(await importRecipeSheets(documentSheets, context));
  }

  if (rows.length > 0) {
    if (isRecipeSheetFormat(rows)) {
      summaries.push(
        await importRecipeSheets(parseRecipeSheets(rows), context)
      );
    } else {
      summaries.push(await importLegacyRecipeRows(rows, context));
    }
  }

  if (summaries.length === 0) {
    return emptySummary();
  }

  return mergeImportSummaries(...summaries);
}
