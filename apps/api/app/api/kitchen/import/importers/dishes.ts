import { database, Prisma } from "@repo/database";
import { parseError as parseErrorToMessage } from "@repo/observability/error";
import {
  emptySummary,
  parseDecimalOpt,
  parseIntOpt,
  parseListOpt,
  trimOpt,
} from "../lib/parse-helpers";
import { runKitchenImportCommand } from "../lib/manifest-command";
import type { CsvRow, ImportSummary, ImportUserContext } from "../lib/types";

export async function importDishes(
  rows: CsvRow[],
  context: ImportUserContext
): Promise<ImportSummary> {
  const summary = emptySummary();
  const { tenantId, userId, userRole } = context;

  for (const row of rows) {
    const name = trimOpt(row.name);
    if (!name) {
      summary.errors.push("Row missing dish name, skipped");
      summary.skipped++;
      continue;
    }

    try {
      let recipeId: string | undefined;
      const recipeName = trimOpt(row.recipe_name);
      if (recipeName) {
        const recipe = await database.recipe.findFirst({
          where: { tenantId, name: recipeName, deletedAt: null },
          select: { id: true },
        });
        if (!recipe) {
          summary.errors.push(
            `"${name}": Recipe "${recipeName}" not found, dish skipped`
          );
          summary.skipped++;
          continue;
        }
        recipeId = recipe.id;
      }

      if (!recipeId) {
        summary.errors.push(
          `"${name}": No recipe linked (set recipe_name column), dish skipped`
        );
        summary.skipped++;
        continue;
      }

      const pricePerPerson = parseDecimalOpt(row.price_per_person);
      const costPerPerson = parseDecimalOpt(row.cost_per_person);

      const dishResult = await runKitchenImportCommand(
        { id: userId, tenantId, role: userRole },
        "Dish",
        "create",
        {
          tenantId,
          recipeId,
          name,
          description: trimOpt(row.description) ?? "",
          category: trimOpt(row.category) ?? "",
          serviceStyle: trimOpt(row.service_style) ?? "",
          portionSizeDescription: trimOpt(row.portion_size_description) ?? "",
          dietaryTags: parseListOpt(row.dietary_tags),
          allergens: parseListOpt(row.allergens),
          pricePerPerson:
            pricePerPerson == null
              ? "0.00"
              : new Prisma.Decimal(pricePerPerson).toFixed(2),
          costPerPerson:
            costPerPerson == null
              ? "0.00"
              : new Prisma.Decimal(costPerPerson).toFixed(2),
          minPrepLeadDays: parseIntOpt(row.min_prep_lead_days) ?? 0,
          maxPrepLeadDays: parseIntOpt(row.max_prep_lead_days) ?? 0,
        }
      );

      if (!dishResult.ok) {
        throw new Error(`Failed to create Dish via Manifest: ${dishResult.message}`);
      }

      summary.imported++;
      summary.created.push(`Dish: ${name}`);
    } catch (error) {
      summary.errors.push(`"${name}": ${parseErrorToMessage(error)}`);
      summary.skipped++;
    }
  }

  return summary;
}
