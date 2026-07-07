export interface EventDishSummary {
  category: string | null;
  costPerPerson: number | null;
  course: string | null;
  dietaryTags: string[];
  dishId: string;
  linkId: string;
  name: string;
  presentationImageUrl: string | null;
  pricePerPerson: number | null;
  quantityServings: number;
  recipeId: string | null;
  recipeName: string | null;
}

export interface RecipeIngredientSummary {
  ingredientId: string;
  ingredientName: string;
  isOptional: boolean;
  preparationNotes: string | null;
  quantity: number;
  unitCode: string | null;
}

export interface RecipeStepSummary {
  durationMinutes: number | null;
  equipmentNeeded: string[];
  instruction: string;
  stepNumber: number;
  temperatureUnit: string | null;
  temperatureValue: number | null;
  tips: string | null;
}

export interface RecipeDetailSummary {
  cookTimeMinutes: number | null;
  ingredients: RecipeIngredientSummary[];
  instructions: string | null;
  prepTimeMinutes: number | null;
  recipeId: string;
  recipeName: string;
  restTimeMinutes: number | null;
  steps: RecipeStepSummary[];
  versionId: string;
  yieldQuantity: number;
  yieldUnitCode: string | null;
}

export interface InventoryCoverageItem {
  ingredientId: string;
  inventoryItemId: string;
  itemName: string;
  onHand: number | null;
  onHandUnitCode: string | null;
  parLevel: number | null;
}

export interface RelatedEventSummary {
  accessibilityOptions: string[];
  eventDate: string;
  eventFormat: string | null;
  eventType: string;
  featuredMediaUrl: string | null;
  guestCount: number;
  id: string;
  status: string;
  tags: string[];
  ticketPrice: number | null;
  ticketTier: string | null;
  title: string;
  venueAddress: string | null;
  venueName: string | null;
}
