import { z } from "zod";
import type { RecipeSheet } from "./recipe-sheet-types";

const ingredientSchema = z.object({
  name: z.string(),
  amount: z.string().default(""),
  quantity: z.number().default(1),
  unit: z.string().default(""),
});

const instructionSchema = z.object({
  stepNumber: z.number().int().positive(),
  text: z.string(),
});

const packagingSchema = z.object({
  type: z.string(),
  notes: z.string(),
});

export const recipeSheetAiSchema = z.object({
  recipeName: z.string(),
  yieldQuantity: z.number().default(1),
  yieldUnit: z.string().default("ea"),
  yieldDescription: z.string().default(""),
  portionSize: z.string().default(""),
  servings: z.string().default(""),
  activePrepMinutes: z.number().int().nonnegative().default(0),
  passiveCookMinutes: z.number().int().nonnegative().default(0),
  totalTimeMinutes: z.number().int().nonnegative().default(0),
  versionLabel: z.string().default(""),
  allergens: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([]),
  ingredients: z.array(ingredientSchema).default([]),
  instructions: z.array(instructionSchema).default([]),
  packaging: z.array(packagingSchema).default([]),
});

export const recipeDocumentAiSchema = z.object({
  sheets: z.array(recipeSheetAiSchema).min(1),
});

export type RecipeSheetAi = z.infer<typeof recipeSheetAiSchema>;

// The AI-extraction contract: callers (e.g. Gemini) must hand the governed
// RecipeVersion.create command valid params. Models routinely emit
// yieldQuantity 0 and stuff "5 GALLONS" into the description, which the guard
// (yieldQty > 0) rejects. This is the deterministic seam every AI sheet passes
// through (zod .transform() is NOT reliably applied by generateObject), so the
// repair lives here.
function repairYieldQuantity(sheet: RecipeSheetAi): number {
  if (sheet.yieldQuantity > 0) {
    return sheet.yieldQuantity;
  }
  return Number.parseFloat(sheet.yieldDescription) || 1;
}

export function toRecipeSheet(sheet: RecipeSheetAi): RecipeSheet {
  return {
    recipeName: sheet.recipeName,
    yieldQuantity: repairYieldQuantity(sheet),
    yieldUnit: sheet.yieldUnit,
    yieldDescription: sheet.yieldDescription,
    portionSize: sheet.portionSize,
    servings: sheet.servings,
    activePrepMinutes: sheet.activePrepMinutes,
    passiveCookMinutes: sheet.passiveCookMinutes,
    totalTimeMinutes: sheet.totalTimeMinutes,
    versionLabel: sheet.versionLabel,
    allergens: sheet.allergens,
    equipment: sheet.equipment,
    ingredients: sheet.ingredients,
    instructions: sheet.instructions,
    packaging: sheet.packaging,
  };
}
