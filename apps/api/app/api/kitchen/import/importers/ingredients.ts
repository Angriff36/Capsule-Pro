import { database } from "@repo/database";
import { parseError as parseErrorToMessage } from "@repo/observability/error";
import {
  emptySummary,
  parseIntOpt,
  parseListOpt,
  trimOpt,
} from "../lib/parse-helpers";
import { runKitchenImportCommand } from "../lib/manifest-command";
import { resolveUnitId } from "../lib/unit-resolver";
import type { CsvRow, ImportSummary, ImportUserContext } from "../lib/types";

export async function importIngredients(
  rows: CsvRow[],
  context: ImportUserContext
): Promise<ImportSummary> {
  const summary = emptySummary();
  const { tenantId, userId, userRole } = context;

  for (const row of rows) {
    const name = trimOpt(row.name);
    if (!name) {
      summary.errors.push("Row missing ingredient name, skipped");
      summary.skipped++;
      continue;
    }

    try {
      const existing = await database.ingredient.findFirst({
        where: { tenantId, name, deletedAt: null },
        select: { id: true },
      });

      if (existing) {
        summary.skipped++;
        summary.errors.push(`"${name}": Ingredient already exists, skipped`);
        continue;
      }

      const defaultUnitId = await resolveUnitId(
        trimOpt(row.default_unit) ?? trimOpt(row.unit),
        parseIntOpt(row.default_unit_id) ?? 1
      );

      const result = await runKitchenImportCommand(
        { id: userId, tenantId, role: userRole },
        "Ingredient",
        "create",
        {
          tenantId,
          name,
          category: trimOpt(row.category) ?? "",
          defaultUnitId,
          densityGPerMl: 0,
          shelfLifeDays: parseIntOpt(row.shelf_life_days) ?? 0,
          storageInstructions: trimOpt(row.storage_instructions) ?? "",
          allergens: parseListOpt(row.allergens),
        }
      );

      if (!result.ok) {
        throw new Error(
          `Failed to create Ingredient via Manifest: ${result.message}`
        );
      }

      summary.imported++;
      summary.created.push(`Ingredient: ${name}`);
    } catch (error) {
      summary.errors.push(`"${name}": ${parseErrorToMessage(error)}`);
      summary.skipped++;
    }
  }

  return summary;
}
