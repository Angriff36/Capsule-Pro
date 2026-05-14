export type Season = "spring" | "summer" | "fall" | "winter";
export type DietaryFlag =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "dairy-free"
  | "nut-free";
export type MenuCategory =
  | "appetizer"
  | "main"
  | "side"
  | "dessert"
  | "late-night";
export type ServiceStyle =
  | "plated"
  | "buffet"
  | "stations"
  | "family-style"
  | "drop-off"
  | "cocktail-reception";

export interface MenuCatalogItem {
  id: string;
  name: string;
  description: string;
  category: MenuCategory;
  dietaryFlags: DietaryFlag[];
  compatibleStyles: ServiceStyle[];
  seasons: Season[];
  pricePerPerson: number;
}

export interface MenuFormData {
  occasionType: string;
  season: Season;
  guestCount: number;
  serviceStyle: ServiceStyle | "";
  menuDirection: string;
  selectedItems: string[];
  dietaryCoverageNeeds: DietaryFlag[];
  dietaryCounts: Record<DietaryFlag, number>;
  addOnSelections: string[];
  barService: string;
  notes: string;
}

export interface MenuConstraintResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IngredientRollup {
  name: string;
  costPerPortion: number;
  unit: string;
}

export interface DishCost {
  costPerPortion: number;
  ingredients?: IngredientRollup[];
}

export interface CostDataProvider {
  getCOGS(dishId: string): Promise<DishCost | null>;
}

export interface MenuPricingConfig {
  enabled: boolean;
  showPerPerson: boolean;
}

export interface OwnerViewConfig {
  enabled: boolean;
}
