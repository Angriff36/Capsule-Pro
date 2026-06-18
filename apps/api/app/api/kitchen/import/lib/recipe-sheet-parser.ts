import { parseDurationToMinutes } from "./duration-parse";
import { parseQuantityText } from "./quantity-parse";
import { parseBoolOpt, parseIntOpt, trimOpt } from "./parse-helpers";
import type { RecipeSheet } from "./recipe-sheet-types";
import type { CsvRow } from "./types";

const ALLERGEN_LABELS: Record<string, string> = {
  dairy: "Dairy",
  eggs: "Eggs",
  wheat_gluten: "Wheat/Gluten",
  wheat: "Wheat/Gluten",
  gluten: "Wheat/Gluten",
  soy: "Soy",
  peanuts: "Peanuts",
  tree_nuts: "Tree Nuts",
  fish: "Fish",
  shellfish: "Shellfish",
  sesame: "Sesame",
};

const PACKAGING_LABELS: Record<string, string> = {
  drop_off: "DROP-OFF (ready to serve)",
  bring_hot: "BRING-HOT (hot hold + serve)",
  cook_on_site: "COOK ON-SITE (finish cooking at event)",
};

export function isRecipeSheetFormat(rows: CsvRow[]): boolean {
  if (rows.length === 0) {
    return false;
  }

  const headers = Object.keys(rows[0] ?? {});
  const hasSectionColumn =
    headers.includes("section") &&
    (headers.includes("value") || headers.includes("amount"));

  if (!hasSectionColumn) {
    return false;
  }

  return rows.some((row) => {
    const section = trimOpt(row.section)?.toLowerCase();
    return (
      section === "recipe_info" ||
      section === "ingredient" ||
      section === "instruction" ||
      section === "recipe_start"
    );
  });
}

function normalizeInfoKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function createEmptySheet(recipeName = ""): RecipeSheet {
  return {
    recipeName,
    yieldQuantity: 1,
    yieldUnit: "ea",
    yieldDescription: "",
    portionSize: "",
    servings: "",
    activePrepMinutes: 0,
    passiveCookMinutes: 0,
    totalTimeMinutes: 0,
    versionLabel: "",
    allergens: [],
    equipment: [],
    ingredients: [],
    instructions: [],
    packaging: [],
  };
}

function applyRecipeInfo(sheet: RecipeSheet, key: string, value: string) {
  const normalized = normalizeInfoKey(key);

  switch (normalized) {
    case "recipe_name":
    case "name":
      sheet.recipeName = value;
      break;
    case "yield_total":
    case "yield":
    case "yield_total_batch":
    case "total_batch": {
      const parsed = parseQuantityText(value);
      sheet.yieldQuantity = parsed.quantity;
      sheet.yieldUnit = parsed.unit;
      sheet.yieldDescription = parsed.description;
      break;
    }
    case "portion_size":
      sheet.portionSize = value;
      break;
    case "servings":
    case "servings_portions":
      sheet.servings = value;
      break;
    case "active_prep_time":
    case "prep_time":
      sheet.activePrepMinutes = parseDurationToMinutes(value);
      break;
    case "passive_cook_time":
    case "cook_time":
      sheet.passiveCookMinutes = parseDurationToMinutes(value);
      break;
    case "total_time":
      sheet.totalTimeMinutes = parseDurationToMinutes(value);
      break;
    case "version":
    case "version_number":
      sheet.versionLabel = value;
      break;
    default:
      break;
  }
}

function applyAllergen(sheet: RecipeSheet, key: string, value: string) {
  const normalized = normalizeInfoKey(key);
  const label = ALLERGEN_LABELS[normalized];
  if (!label) {
    return;
  }

  const marked =
    parseBoolOpt(value) ||
    ["x", "checked", "yes", "true", "1"].includes(value.trim().toLowerCase());

  if (marked) {
    sheet.allergens.push(label);
  }
}

function getRowValue(row: CsvRow): string {
  return trimOpt(row.value) ?? trimOpt(row.amount) ?? "";
}

/** Parse section-based recipe sheet CSV rows into one or more recipe sheets. */
export function parseRecipeSheets(rows: CsvRow[]): RecipeSheet[] {
  const sheets: RecipeSheet[] = [];
  let current = createEmptySheet();

  for (const row of rows) {
    const section = trimOpt(row.section)?.toLowerCase();
    if (!section) {
      continue;
    }

    if (section === "recipe_start") {
      if (current.recipeName.trim()) {
        sheets.push(current);
      }
      current = createEmptySheet(trimOpt(row.value) ?? trimOpt(row.key) ?? "");
      continue;
    }

    const key = trimOpt(row.key) ?? "";
    const value = getRowValue(row);

    switch (section) {
      case "recipe_info":
        applyRecipeInfo(current, key, value);
        break;
      case "allergen":
        applyAllergen(current, key, value);
        break;
      case "equipment":
        if (value) {
          current.equipment.push(value);
        } else if (key) {
          current.equipment.push(key);
        }
        break;
      case "ingredient": {
        const name = key || value;
        const amount = value || (trimOpt(row.amount) ?? "");
        if (!name) {
          break;
        }
        const parsed = parseQuantityText(amount);
        current.ingredients.push({
          name,
          amount,
          quantity: parsed.quantity,
          unit: parsed.unit,
        });
        break;
      }
      case "instruction": {
        const stepNumber = parseIntOpt(key) ?? current.instructions.length + 1;
        const text = value || key;
        if (!text) {
          break;
        }
        current.instructions.push({ stepNumber, text });
        break;
      }
      case "packaging": {
        const type = PACKAGING_LABELS[normalizeInfoKey(key)] ?? key;
        if (type && value) {
          current.packaging.push({ type, notes: value });
        }
        break;
      }
      default:
        break;
    }
  }

  if (current.recipeName.trim()) {
    sheets.push(current);
  }

  return sheets;
}
