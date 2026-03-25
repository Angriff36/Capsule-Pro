/**
 * @module AllergenMatrixAPI
 * @intent Fetch allergen matrix data for recipes/dishes
 * @responsibility Query ingredient allergens and build Big 9 matrix via $queryRaw
 * @domain Kitchen
 * @tags allergens, matrix, big-9, api, queryRaw
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * The Big 9 allergens mapped to common allergen terms
 */
const ALLERGEN_MAPPINGS: Record<string, string[]> = {
  milk: ["milk", "dairy", "lactose", "casein", "whey", "butter", "cream", "cheese", "yogurt"],
  eggs: ["eggs", "egg", "albumin", "mayonnaise"],
  fish: ["fish", "salmon", "tuna", "cod", "anchovy", "sardine"],
  shellfish: ["shellfish", "crustacean", "shrimp", "crab", "lobster", "clam", "mussel", "oyster", "scallop"],
  tree_nuts: ["tree nuts", "almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia"],
  peanuts: ["peanuts", "peanut"],
  wheat: ["wheat", "gluten", "flour", "bread", "pasta", "semolina", "spelt"],
  soybeans: ["soy", "soybeans", "tofu", "edamame", "tempeh"],
  sesame: ["sesame", "tahini"],
};

type AllergenKey = keyof typeof ALLERGEN_MAPPINGS;

interface AllergenMatrixItem {
  id: string;
  name: string;
  category: string | null;
  dietaryTags: string[];
  allergens: Record<AllergenKey, boolean | null>;
  ingredientCount: number;
  allergenIngredients: Record<AllergenKey, string[]>;
}

/**
 * Normalize allergen string for matching
 */
function normalizeAllergen(allergen: string): string {
  return allergen.toLowerCase().trim();
}

/**
 * Check if any ingredient allergen matches a Big 9 category
 */
function checkAllergenCategory(
  ingredientAllergens: string[],
  categoryTerms: string[]
): { contains: boolean; matchedIngredients: string[] } {
  const matchedIngredients: string[] = [];

  for (const allergen of ingredientAllergens) {
    const normalized = normalizeAllergen(allergen);
    for (const term of categoryTerms) {
      if (normalized.includes(term) || term.includes(normalized)) {
        matchedIngredients.push(allergen);
        break;
      }
    }
  }

  return {
    contains: matchedIngredients.length > 0,
    matchedIngredients,
  };
}

/**
 * Build allergen matrix for dishes by querying ingredient allergens via $queryRaw
 */
async function buildDishMatrix(tenantId: string, dishIds?: string[]): Promise<AllergenMatrixItem[]> {
  // Query dishes with their recipe ingredients and allergens using $queryRaw
  const dishFilter = dishIds && dishIds.length > 0
    ? `AND d.id IN (${dishIds.map((id) => `'${id}'`).join(", ")})`
    : "";

  const query = `
    SELECT
      d.id,
      d.name,
      d.category,
      d.dietary_tags,
      d.allergens as dish_allergens,
      r.id as recipe_id,
      ri.ingredient_id,
      i.name as ingredient_name,
      i.allergens as ingredient_allergens
    FROM tenant_kitchen.dishes d
    LEFT JOIN tenant_kitchen.recipes r ON r.id = d.recipe_id AND r.tenant_id = d.tenant_id
    LEFT JOIN tenant_kitchen.recipe_ingredients ri ON ri.recipe_id = r.id AND ri.tenant_id = r.tenant_id
    LEFT JOIN tenant_kitchen.ingredients i ON i.id = ri.ingredient_id AND i.tenant_id = ri.tenant_id
    WHERE d.tenant_id = $1
      AND d.deleted_at IS NULL
      ${dishFilter}
    ORDER BY d.name
  `;

  const results = await database.$queryRawUnsafe<{
    id: string;
    name: string;
    category: string | null;
    dietary_tags: string[];
    dish_allergens: string[];
    recipe_id: string | null;
    ingredient_id: string | null;
    ingredient_name: string | null;
    ingredient_allergens: string[];
  }[]>(query, tenantId);

  // Group by dish
  const dishMap = new Map<string, {
    name: string;
    category: string | null;
    dietaryTags: string[];
    dishAllergens: string[];
    ingredients: Map<string, { name: string; allergens: string[] }>;
  }>();

  for (const row of results) {
    if (!dishMap.has(row.id)) {
      dishMap.set(row.id, {
        name: row.name,
        category: row.category,
        dietaryTags: row.dietary_tags || [],
        dishAllergens: row.dish_allergens || [],
        ingredients: new Map(),
      });
    }

    if (row.ingredient_id && row.ingredient_name) {
      dishMap.get(row.id)?.ingredients.set(row.ingredient_id, {
        name: row.ingredient_name,
        allergens: row.ingredient_allergens || [],
      });
    }
  }

  // Build matrix items
  const items: AllergenMatrixItem[] = [];

  for (const [id, dish] of dishMap) {
    // Collect all ingredient allergens
    const allIngredientAllergens: { name: string; allergens: string[] }[] = [];
    for (const ingredient of dish.ingredients.values()) {
      allIngredientAllergens.push(ingredient);
    }

    // Also include dish-level allergens
    const dishAllergenSet = new Set(dish.dishAllergens.map(normalizeAllergen));

    // Build allergen matrix
    const allergens: Record<AllergenKey, boolean | null> = {
      milk: null,
      eggs: null,
      fish: null,
      shellfish: null,
      tree_nuts: null,
      peanuts: null,
      wheat: null,
      soybeans: null,
      sesame: null,
    };

    const allergenIngredients: Record<AllergenKey, string[]> = {
      milk: [],
      eggs: [],
      fish: [],
      shellfish: [],
      tree_nuts: [],
      peanuts: [],
      wheat: [],
      soybeans: [],
      sesame: [],
    };

    // Check each Big 9 allergen
    for (const [key, terms] of Object.entries(ALLERGEN_MAPPINGS)) {
      const allergenKey = key as AllergenKey;
      let contains = false;
      const matched: string[] = [];

      // Check ingredient allergens
      for (const ingredient of allIngredientAllergens) {
        const result = checkAllergenCategory(ingredient.allergens, terms);
        if (result.contains) {
          contains = true;
          matched.push(ingredient.name);
        }
      }

      // Check dish-level allergens
      for (const term of terms) {
        if (dishAllergenSet.has(term)) {
          contains = true;
        }
      }

      allergens[allergenKey] = contains;
      allergenIngredients[allergenKey] = [...new Set(matched)];
    }

    items.push({
      id,
      name: dish.name,
      category: dish.category,
      dietaryTags: dish.dietaryTags,
      allergens,
      ingredientCount: dish.ingredients.size,
      allergenIngredients,
    });
  }

  return items;
}

/**
 * Build allergen matrix for recipes by querying ingredient allergens via $queryRaw
 */
async function buildRecipeMatrix(tenantId: string, recipeIds?: string[]): Promise<AllergenMatrixItem[]> {
  // Query recipes with their ingredients and allergens using $queryRaw
  const recipeFilter = recipeIds && recipeIds.length > 0
    ? `AND r.id IN (${recipeIds.map((id) => `'${id}'`).join(", ")})`
    : "";

  const query = `
    SELECT
      r.id,
      r.name,
      r.category,
      r.tags,
      ri.ingredient_id,
      i.name as ingredient_name,
      i.allergens as ingredient_allergens
    FROM tenant_kitchen.recipes r
    LEFT JOIN tenant_kitchen.recipe_ingredients ri ON ri.recipe_id = r.id AND ri.tenant_id = r.tenant_id
    LEFT JOIN tenant_kitchen.ingredients i ON i.id = ri.ingredient_id AND i.tenant_id = ri.tenant_id
    WHERE r.tenant_id = $1
      AND r.deleted_at IS NULL
      ${recipeFilter}
    ORDER BY r.name
  `;

  const results = await database.$queryRawUnsafe<{
    id: string;
    name: string;
    category: string | null;
    tags: string[];
    ingredient_id: string | null;
    ingredient_name: string | null;
    ingredient_allergens: string[];
  }[]>(query, tenantId);

  // Group by recipe
  const recipeMap = new Map<string, {
    name: string;
    category: string | null;
    tags: string[];
    ingredients: Map<string, { name: string; allergens: string[] }>;
  }>();

  for (const row of results) {
    if (!recipeMap.has(row.id)) {
      recipeMap.set(row.id, {
        name: row.name,
        category: row.category,
        tags: row.tags || [],
        ingredients: new Map(),
      });
    }

    if (row.ingredient_id && row.ingredient_name) {
      recipeMap.get(row.id)?.ingredients.set(row.ingredient_id, {
        name: row.ingredient_name,
        allergens: row.ingredient_allergens || [],
      });
    }
  }

  // Build matrix items
  const items: AllergenMatrixItem[] = [];

  for (const [id, recipe] of recipeMap) {
    // Collect all ingredient allergens
    const allIngredientAllergens: { name: string; allergens: string[] }[] = [];
    for (const ingredient of recipe.ingredients.values()) {
      allIngredientAllergens.push(ingredient);
    }

    // Build allergen matrix
    const allergens: Record<AllergenKey, boolean | null> = {
      milk: null,
      eggs: null,
      fish: null,
      shellfish: null,
      tree_nuts: null,
      peanuts: null,
      wheat: null,
      soybeans: null,
      sesame: null,
    };

    const allergenIngredients: Record<AllergenKey, string[]> = {
      milk: [],
      eggs: [],
      fish: [],
      shellfish: [],
      tree_nuts: [],
      peanuts: [],
      wheat: [],
      soybeans: [],
      sesame: [],
    };

    // Check each Big 9 allergen
    for (const [key, terms] of Object.entries(ALLERGEN_MAPPINGS)) {
      const allergenKey = key as AllergenKey;
      let contains = false;
      const matched: string[] = [];

      // Check ingredient allergens
      for (const ingredient of allIngredientAllergens) {
        const result = checkAllergenCategory(ingredient.allergens, terms);
        if (result.contains) {
          contains = true;
          matched.push(ingredient.name);
        }
      }

      allergens[allergenKey] = contains;
      allergenIngredients[allergenKey] = [...new Set(matched)];
    }

    items.push({
      id,
      name: recipe.name,
      category: recipe.category,
      dietaryTags: recipe.tags,
      allergens,
      ingredientCount: recipe.ingredients.size,
      allergenIngredients,
    });
  }

  return items;
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    invariant(tenantId, `tenantId not found for orgId=${orgId}`);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "dish";
    const ids = searchParams.get("ids");

    // Parse IDs if provided
    const itemIds = ids ? ids.split(",").filter(Boolean) : undefined;

    // Build matrix based on type
    const items = type === "recipe"
      ? await buildRecipeMatrix(tenantId, itemIds)
      : await buildDishMatrix(tenantId, itemIds);

    return NextResponse.json({
      items,
      totalCount: items.length,
      allergens: Object.keys(ALLERGEN_MAPPINGS),
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    captureException(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
