import { parseError as parseErrorToMessage } from "@repo/observability/error";
import { database } from "@repo/database";
import {
  emptySummary,
  parseDecimalOpt,
  parseListOpt,
  trimOpt,
} from "../lib/parse-helpers";
import { runKitchenImportCommand } from "../lib/manifest-command";
import type { CsvRow, ImportSummary, ImportUserContext } from "../lib/types";

export async function importPrepLists(
  rows: CsvRow[],
  context: ImportUserContext
): Promise<ImportSummary> {
  const summary = emptySummary();
  const { tenantId, userId, userRole } = context;

  const groups = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const listName = trimOpt(row.prep_list_name) ?? "__unnamed__";
    if (!groups.has(listName)) {
      groups.set(listName, []);
    }
    groups.get(listName)!.push(row);
  }

  for (const [listName, listRows] of Array.from(groups.entries())) {
    try {
      let eventId: string | undefined;
      const eventNumber = trimOpt(listRows[0]?.event_number);
      if (eventNumber) {
        const event = await database.event.findFirst({
          where: { tenantId, eventNumber, deletedAt: null },
          select: { id: true },
        });
        if (event) {
          eventId = event.id;
        } else {
          summary.errors.push(
            `"${listName}": Event #${eventNumber} not found, prep list skipped`
          );
          summary.skipped += listRows.length;
          continue;
        }
      }

      const batchMultiplier =
        parseDecimalOpt(listRows[0]?.batch_multiplier) ?? 1;
      const dietaryRestrictions = parseListOpt(
        listRows[0]?.dietary_restrictions
      );

      const prepListResult = await runKitchenImportCommand(
        { id: userId, tenantId, role: userRole },
        "PrepList",
        "create",
        {
          tenantId,
          eventId: eventId ?? "00000000-0000-0000-0000-000000000000",
          name: listName,
          batchMultiplier: batchMultiplier.toFixed(2),
          dietaryRestrictions,
          status: "draft",
          totalItems: listRows.length,
        }
      );

      if (!prepListResult.ok) {
        throw new Error(
          `Failed to create PrepList via Manifest: ${prepListResult.message}`
        );
      }

      const prepListId = (prepListResult.result as { id?: string }).id!;

      for (let i = 0; i < listRows.length; i++) {
        const row = listRows[i];
        const itemName = trimOpt(row.item_name) ?? `Item ${i + 1}`;
        const stationName = trimOpt(row.station_name) ?? "Unassigned";
        const baseQty = parseDecimalOpt(row.base_quantity) ?? 1;
        const baseUnit = trimOpt(row.base_unit) ?? "ea";

        const itemResult = await runKitchenImportCommand(
          { id: userId, tenantId, role: userRole },
          "PrepListItem",
          "create",
          {
            tenantId,
            prepListId,
            stationId: "",
            stationName,
            ingredientId: "00000000-0000-0000-0000-000000000000",
            ingredientName: itemName,
            baseQuantity: baseQty,
            baseUnit,
            scaledQuantity: baseQty * batchMultiplier,
            scaledUnit: baseUnit,
            preparationNotes: trimOpt(row.preparation_notes) ?? "",
            dishName: trimOpt(row.dish_name) ?? "",
            sortOrder: i,
          }
        );

        if (!itemResult.ok) {
          throw new Error(
            `Failed to create PrepListItem via Manifest: ${itemResult.message}`
          );
        }
      }

      summary.imported += listRows.length;
      summary.created.push(`Prep List: ${listName} (${listRows.length} items)`);
    } catch (error) {
      summary.errors.push(`"${listName}": ${parseErrorToMessage(error)}`);
      summary.skipped += listRows.length;
    }
  }

  return summary;
}
