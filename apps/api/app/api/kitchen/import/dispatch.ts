import { importDishes } from "./importers/dishes";
import { importEvents } from "./importers/events";
import { importIngredients } from "./importers/ingredients";
import { importPrepLists } from "./importers/prep-lists";
import { importRecipeIngredients } from "./importers/recipe-ingredients";
import { importRecipes } from "./importers/recipes";
import type {
  CsvRow,
  ImportSummary,
  ImportType,
  ImportUserContext,
} from "./lib/types";

export async function dispatchKitchenImport(
  importType: ImportType,
  rows: CsvRow[],
  context: ImportUserContext,
  options?: {
    documentSheets?: import("./lib/recipe-sheet-types").RecipeSheet[];
    documentWarnings?: string[];
  }
): Promise<ImportSummary> {
  switch (importType) {
    case "recipes":
      return importRecipes(
        rows,
        context,
        options?.documentSheets ?? [],
        options?.documentWarnings ?? []
      );
    case "dishes":
      return importDishes(rows, context);
    case "prep-lists":
      return importPrepLists(rows, context);
    case "ingredients":
      return importIngredients(rows, context);
    case "recipe-ingredients":
      return importRecipeIngredients(rows, context);
    case "events":
      return importEvents(rows, context);
  }
}
