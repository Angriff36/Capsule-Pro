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
  category: MenuCategory;
  compatibleStyles: ServiceStyle[];
  description: string;
  dietaryFlags: DietaryFlag[];
  id: string;
  name: string;
  pricePerPerson: number;
  seasons: Season[];
}

export interface MenuFormData {
  addOnSelections: string[];
  barService: string;
  dietaryCounts: Record<DietaryFlag, number>;
  dietaryCoverageNeeds: DietaryFlag[];
  guestCount: number;
  menuDirection: string;
  notes: string;
  occasionType: string;
  season: Season;
  selectedItems: string[];
  serviceStyle: ServiceStyle | "";
}

export interface MenuConstraintResult {
  errors: string[];
  valid: boolean;
  warnings: string[];
}

export interface IngredientRollup {
  costPerPortion: number;
  name: string;
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
