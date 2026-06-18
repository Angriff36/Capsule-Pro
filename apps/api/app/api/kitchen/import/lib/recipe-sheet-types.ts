export interface RecipeSheetIngredient {
  amount: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface RecipeSheetInstruction {
  stepNumber: number;
  text: string;
}

export interface RecipeSheetPackaging {
  notes: string;
  type: string;
}

export interface RecipeSheet {
  activePrepMinutes: number;
  allergens: string[];
  equipment: string[];
  ingredients: RecipeSheetIngredient[];
  instructions: RecipeSheetInstruction[];
  packaging: RecipeSheetPackaging[];
  passiveCookMinutes: number;
  portionSize: string;
  recipeName: string;
  servings: string;
  totalTimeMinutes: number;
  versionLabel: string;
  yieldDescription: string;
  yieldQuantity: number;
  yieldUnit: string;
}
