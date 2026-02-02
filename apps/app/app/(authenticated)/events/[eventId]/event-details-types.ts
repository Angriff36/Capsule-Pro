export type EventDishSummary = {
  linkId: string;
  dishId: string;
  name: string;
  category: string | null;
  recipeId: string | null;
  recipeName: string | null;
  course: string | null;
  quantityServings: number;
  dietaryTags: string[];
  presentationImageUrl: string | null;
  pricePerPerson: number | null;
  costPerPerson: number | null;
};

export type RecipeIngredientSummary = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitCode: string | null;
  preparationNotes: string | null;
  isOptional: boolean;
};

export type RecipeStepSummary = {
  stepNumber: number;
  instruction: string;
  durationMinutes: number | null;
  temperatureValue: number | null;
  temperatureUnit: string | null;
  equipmentNeeded: string[];
  tips: string | null;
};

export type RecipeDetailSummary = {
  recipeId: string;
  recipeName: string;
  versionId: string;
  yieldQuantity: number;
  yieldUnitCode: string | null;
  instructions: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  restTimeMinutes: number | null;
  ingredients: RecipeIngredientSummary[];
  steps: RecipeStepSummary[];
};

export type InventoryCoverageItem = {
  ingredientId: string;
  inventoryItemId: string;
  itemName: string;
  onHand: number | null;
  onHandUnitCode: string | null;
  parLevel: number | null;
};

export type RelatedEventSummary = {
  id: string;
  title: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  status: string;
  venueName: string | null;
  venueAddress: string | null;
  ticketPrice: number | null;
  ticketTier: string | null;
  eventFormat: string | null;
  accessibilityOptions: string[];
  featuredMediaUrl: string | null;
  tags: string[];
};
