export type IngredientItem = {
  ingredientId: string;
  ingredientName: string;
  category: string | null;
  baseQuantity: number;
  baseUnit: string;
  scaledQuantity: number;
  scaledUnit: string;
  dietarySubstitutions: string[];
  isOptional: boolean;
  preparationNotes: string | null;
  allergens: string[];
};
export type StationPrepList = {
  stationId: string;
  stationName: string;
  icon: string;
  color: string;
  totalIngredients: number;
  estimatedTime: number;
  ingredients: IngredientItem[];
  tasks: Array<{
    id: string;
    name: string;
    dueDate: Date;
    status: string;
    priority: number;
  }>;
};
export type PrepListGenerationResult = {
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  guestCount: number;
  batchMultiplier: number;
  dietaryRestrictions: string[];
  stationLists: StationPrepList[];
  totalIngredients: number;
  totalEstimatedTime: number;
  generatedAt: Date;
};
type GeneratePrepListInput = {
  eventId: string;
  batchMultiplier?: number;
  dietaryRestrictions?: string[];
  customInstructions?: string;
};
export declare function generatePrepList(
  input: GeneratePrepListInput
): Promise<PrepListGenerationResult>;
export declare function savePrepListToProductionBoard(
  eventId: string,
  prepList: PrepListGenerationResult
): Promise<{
  success: boolean;
  taskId?: string;
  error?: string;
}>;
/**
 * Save a generated prep list to the database for later viewing/editing
 */
export declare function savePrepListToDatabase(
  eventId: string,
  prepList: PrepListGenerationResult,
  name?: string
): Promise<{
  success: boolean;
  prepListId?: string;
  error?: string;
}>;
//# sourceMappingURL=actions.d.ts.map
