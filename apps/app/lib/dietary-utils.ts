/**
 * @module dietary-utils
 * @intent Utility functions for calculating dietary properties from ingredients
 * @responsibility Auto-calculate vegan/vegetarian/GF/DF status from ingredient data
 * @domain Kitchen
 * @tags dietary, allergens, utilities, vegan, gluten-free
 * @canonical true
 */

/**
 * The Big 9 allergens as defined by FDA
 */
export const BIG_9_ALLERGENS = [
  "milk",
  "eggs",
  "fish",
  "crustacean shellfish",
  "tree nuts",
  "peanuts",
  "wheat",
  "soybeans",
  "sesame",
] as const;

export type Big9Allergen = (typeof BIG_9_ALLERGENS)[number];

/**
 * Common dairy-derived allergens and ingredients
 */
const DAIRY_ALLERGENS = [
  "milk",
  "dairy",
  "lactose",
  "casein",
  "whey",
  "butter",
  "cream",
  "cheese",
  "yogurt",
  "lactalbumin",
  "lactoglobulin",
];

/**
 * Common egg-derived allergens and ingredients
 */
const EGG_ALLERGENS = [
  "eggs",
  "egg",
  "albumin",
  "ovalbumin",
  "ovomucin",
  "ovomucoid",
  "lysozyme",
  "livetin",
  "mayonnaise",
];

/**
 * Common gluten-containing grains and ingredients
 */
const GLUTEN_SOURCES = [
  "wheat",
  "gluten",
  "barley",
  "rye",
  "triticale",
  "farro",
  "spelt",
  "kamut",
  "semolina",
  "bulgur",
  "farina",
  "seitan",
  "bread crumbs",
  "flour",
  "malt",
  "brewer's yeast",
];

/**
 * Gluten-free grain alternatives (safe for GF)
 */
const GLUTEN_FREE_GRAINS = [
  "rice",
  "corn",
  "quinoa",
  "buckwheat",
  "millet",
  "oats",
  "sorghum",
  "teff",
  "amaranth",
];

/**
 * Animal-derived categories that indicate non-vegan/non-vegetarian
 */
const MEAT_CATEGORIES = [
  "meat",
  "poultry",
  "beef",
  "pork",
  "chicken",
  "turkey",
  "lamb",
  "venison",
  "bacon",
  "sausage",
  "ham",
  "prosciutto",
];

/**
 * Seafood categories
 */
const SEAFOOD_CATEGORIES = [
  "fish",
  "seafood",
  "shellfish",
  "crustacean",
  "salmon",
  "tuna",
  "cod",
  "shrimp",
  "crab",
  "lobster",
  "clam",
  "mussel",
  "oyster",
  "scallop",
  "anchovy",
  "sardine",
];

/**
 * Animal product categories (non-vegan but potentially vegetarian)
 */
const ANIMAL_DERIVED_CATEGORIES = [
  "honey",
  "gelatin",
  "rennet",
  "lard",
  "suet",
  "cochineal",
  "carmine",
  "shellac",
  "isinglass",
  "lanolin",
  "beeswax",
];

/**
 * Ingredient with allergen and category information
 */
export interface IngredientWithAllergens {
  name: string;
  allergens: string[];
  category?: string | null;
}

/**
 * Calculated dietary properties
 */
export interface DietaryProperties {
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  containsEggs: boolean;
  containsMeat: boolean;
  containsSeafood: boolean;
  allergenWarnings: string[];
  dietaryTags: string[];
}

/**
 * Normalize allergen string for comparison
 */
function normalizeAllergen(allergen: string): string {
  return allergen.toLowerCase().trim();
}

/**
 * Check if any allergen matches a list of target allergens
 */
function hasAllergenMatch(
  ingredientAllergens: string[],
  targetAllergens: readonly string[]
): boolean {
  const normalizedIngredient = ingredientAllergens.map(normalizeAllergen);
  const normalizedTarget = targetAllergens.map(normalizeAllergen);

  return normalizedIngredient.some((allergen) =>
    normalizedTarget.some((target) =>
      allergen.includes(target) || target.includes(allergen)
    )
  );
}

/**
 * Check if ingredient name or category matches a list of terms
 */
function matchesCategory(
  name: string,
  category: string | null | undefined,
  terms: readonly string[]
): boolean {
  const normalizedName = name.toLowerCase();
  const normalizedCategory = category?.toLowerCase() ?? "";

  return terms.some(
    (term) =>
      normalizedName.includes(term) ||
      normalizedCategory.includes(term) ||
      term.includes(normalizedName) ||
      term.includes(normalizedCategory)
  );
}

/**
 * Check if a single ingredient contains dairy
 */
export function ingredientContainsDairy(ingredient: IngredientWithAllergens): boolean {
  return (
    hasAllergenMatch(ingredient.allergens, DAIRY_ALLERGENS) ||
    matchesCategory(ingredient.name, ingredient.category, DAIRY_ALLERGENS)
  );
}

/**
 * Check if a single ingredient contains eggs
 */
export function ingredientContainsEggs(ingredient: IngredientWithAllergens): boolean {
  return (
    hasAllergenMatch(ingredient.allergens, EGG_ALLERGENS) ||
    matchesCategory(ingredient.name, ingredient.category, EGG_ALLERGENS)
  );
}

/**
 * Check if a single ingredient contains gluten
 */
export function ingredientContainsGluten(ingredient: IngredientWithAllergens): boolean {
  // First check if it's explicitly gluten-free
  const allergenLower = ingredient.allergens.map((a) => a.toLowerCase());
  if (allergenLower.includes("gluten-free") || allergenLower.includes("gf")) {
    return false;
  }

  // Check if it's a known gluten-free grain
  if (matchesCategory(ingredient.name, ingredient.category, GLUTEN_FREE_GRAINS)) {
    return false;
  }

  return (
    hasAllergenMatch(ingredient.allergens, GLUTEN_SOURCES) ||
    matchesCategory(ingredient.name, ingredient.category, GLUTEN_SOURCES)
  );
}

/**
 * Check if a single ingredient is meat
 */
export function ingredientIsMeat(ingredient: IngredientWithAllergens): boolean {
  return matchesCategory(ingredient.name, ingredient.category, MEAT_CATEGORIES);
}

/**
 * Check if a single ingredient is seafood
 */
export function ingredientIsSeafood(ingredient: IngredientWithAllergens): boolean {
  return (
    hasAllergenMatch(ingredient.allergens, ["fish", "shellfish", "crustacean"]) ||
    matchesCategory(ingredient.name, ingredient.category, SEAFOOD_CATEGORIES)
  );
}

/**
 * Check if a single ingredient is animal-derived (non-vegan)
 */
export function ingredientIsAnimalDerived(ingredient: IngredientWithAllergens): boolean {
  return (
    ingredientContainsDairy(ingredient) ||
    ingredientContainsEggs(ingredient) ||
    ingredientIsMeat(ingredient) ||
    ingredientIsSeafood(ingredient) ||
    matchesCategory(ingredient.name, ingredient.category, ANIMAL_DERIVED_CATEGORIES)
  );
}

/**
 * Calculate dietary properties from a list of ingredients
 */
export function calculateDietaryProperties(
  ingredients: IngredientWithAllergens[]
): DietaryProperties {
  const containsDairy = ingredients.some(ingredientContainsDairy);
  const containsEggs = ingredients.some(ingredientContainsEggs);
  const containsGluten = ingredients.some(ingredientContainsGluten);
  const containsMeat = ingredients.some(ingredientIsMeat);
  const containsSeafood = ingredients.some(ingredientIsSeafood);
  const containsAnimalDerived = ingredients.some(ingredientIsAnimalDerived);

  // Vegan = no animal products at all
  const isVegan = !containsAnimalDerived;

  // Vegetarian = no meat or seafood, but eggs/dairy allowed
  const isVegetarian = !containsMeat && !containsSeafood;

  // Gluten-free = no gluten-containing ingredients
  const isGlutenFree = !containsGluten;

  // Dairy-free = no dairy
  const isDairyFree = !containsDairy;

  // Build dietary tags
  const dietaryTags: string[] = [];
  if (isVegan) dietaryTags.push("vegan");
  if (isVegetarian && !isVegan) dietaryTags.push("vegetarian");
  if (isGlutenFree) dietaryTags.push("gluten-free");
  if (isDairyFree) dietaryTags.push("dairy-free");

  // Build allergen warnings
  const allergenWarnings: string[] = [];
  if (containsDairy) allergenWarnings.push("Contains dairy");
  if (containsEggs) allergenWarnings.push("Contains eggs");
  if (containsGluten) allergenWarnings.push("Contains gluten/wheat");
  if (containsMeat) allergenWarnings.push("Contains meat");
  if (containsSeafood) allergenWarnings.push("Contains fish/shellfish");

  // Check for Big 9 allergens explicitly listed
  const big9Found = new Set<string>();
  for (const ingredient of ingredients) {
    for (const allergen of ingredient.allergens) {
      const normalized = normalizeAllergen(allergen);
      for (const big9 of BIG_9_ALLERGENS) {
        if (normalized.includes(big9) || big9.includes(normalized)) {
          big9Found.add(big9);
        }
      }
    }
  }

  for (const allergen of big9Found) {
    if (!allergenWarnings.some((w) => w.toLowerCase().includes(allergen))) {
      allergenWarnings.push(`Contains ${allergen}`);
    }
  }

  return {
    isVegan,
    isVegetarian,
    isGlutenFree,
    isDairyFree,
    containsEggs,
    containsMeat,
    containsSeafood,
    allergenWarnings,
    dietaryTags,
  };
}

/**
 * Get all unique allergens from a list of ingredients
 */
export function getAllergensFromIngredients(
  ingredients: IngredientWithAllergens[]
): string[] {
  const allergenSet = new Set<string>();

  for (const ingredient of ingredients) {
    for (const allergen of ingredient.allergens) {
      allergenSet.add(normalizeAllergen(allergen));
    }
  }

  return Array.from(allergenSet).sort();
}

/**
 * Check if dietary tags indicate a specific diet
 */
export function hasDietaryTag(tags: string[], tag: string): boolean {
  const normalizedTag = tag.toLowerCase();
  return tags.some((t) => t.toLowerCase() === normalizedTag);
}

/**
 * Dietary tag display configuration
 */
export const DIETARY_TAG_CONFIG = {
  vegan: {
    label: "Vegan",
    color: "bg-green-100 text-green-800 border-green-300",
    icon: "🌱",
  },
  vegetarian: {
    label: "Vegetarian",
    color: "bg-lime-100 text-lime-800 border-lime-300",
    icon: "🥬",
  },
  "gluten-free": {
    label: "Gluten-Free",
    color: "bg-amber-100 text-amber-800 border-amber-300",
    icon: "🌾",
  },
  "dairy-free": {
    label: "Dairy-Free",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: "🥛",
  },
  "nut-free": {
    label: "Nut-Free",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: "🥜",
  },
  "soy-free": {
    label: "Soy-Free",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    icon: "🫘",
  },
  keto: {
    label: "Keto",
    color: "bg-purple-100 text-purple-800 border-purple-300",
    icon: "🥑",
  },
  paleo: {
    label: "Paleo",
    color: "bg-stone-100 text-stone-800 border-stone-300",
    icon: "🍖",
  },
  halal: {
    label: "Halal",
    color: "bg-teal-100 text-teal-800 border-teal-300",
    icon: "☪️",
  },
  kosher: {
    label: "Kosher",
    color: "bg-indigo-100 text-indigo-800 border-indigo-300",
    icon: "✡️",
  },
} as const;

export type DietaryTag = keyof typeof DIETARY_TAG_CONFIG;
