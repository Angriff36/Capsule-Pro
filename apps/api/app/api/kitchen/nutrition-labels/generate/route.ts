import { NextRequest, NextResponse } from "next/server";
import { getTenantId, requireCurrentUser } from "@repo/auth";
import { database } from "@repo/database";
import { z } from "zod";

const generateSchema = z.object({
  recipeId: z.string(),
  servings: z.number().optional().default(1),
});

interface NutritionInfo {
  calories: number;
  totalFat: number;
  saturatedFat: number;
  transFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbs: number;
  dietaryFiber: number;
  sugars: number;
  protein: number;
  vitaminA: number;
  vitaminC: number;
  calcium: number;
  iron: number;
}

// USDA-style nutrition database (simplified)
const INGREDIENT_NUTRITION: Record<string, NutritionInfo> = {
  // Per 100g
  "flour": { calories: 364, totalFat: 1, saturatedFat: 0.2, transFat: 0, cholesterol: 0, sodium: 2, totalCarbs: 76, dietaryFiber: 2.7, sugars: 0.3, protein: 10, vitaminA: 0, vitaminC: 0, calcium: 15, iron: 1.2 },
  "sugar": { calories: 387, totalFat: 0, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 0, totalCarbs: 100, dietaryFiber: 0, sugars: 100, protein: 0, vitaminA: 0, vitaminC: 0, calcium: 1, iron: 0.1 },
  "butter": { calories: 717, totalFat: 81, saturatedFat: 51, transFat: 3, cholesterol: 215, sodium: 643, totalCarbs: 0.1, dietaryFiber: 0, sugars: 0.1, protein: 0.9, vitaminA: 2499, vitaminC: 0, calcium: 24, iron: 0.02 },
  "egg": { calories: 155, totalFat: 11, saturatedFat: 3.3, transFat: 0, cholesterol: 373, sodium: 124, totalCarbs: 1.1, dietaryFiber: 0, sugars: 1.1, protein: 13, vitaminA: 160, vitaminC: 0, calcium: 50, iron: 1.2 },
  "milk": { calories: 42, totalFat: 1, saturatedFat: 0.6, transFat: 0, cholesterol: 5, sodium: 44, totalCarbs: 5, dietaryFiber: 0, sugars: 5, protein: 3.4, vitaminA: 46, vitaminC: 0, calcium: 125, iron: 0.03 },
  "olive oil": { calories: 884, totalFat: 100, saturatedFat: 14, transFat: 0, cholesterol: 0, sodium: 2, totalCarbs: 0, dietaryFiber: 0, sugars: 0, protein: 0, vitaminA: 0, vitaminC: 0, calcium: 1, iron: 0.6 },
  "tomato": { calories: 18, totalFat: 0.2, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 5, totalCarbs: 3.9, dietaryFiber: 1.2, sugars: 2.6, protein: 0.9, vitaminA: 833, vitaminC: 14, calcium: 10, iron: 0.3 },
  "onion": { calories: 40, totalFat: 0.1, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 4, totalCarbs: 9.3, dietaryFiber: 1.7, sugars: 4.2, protein: 1.1, vitaminA: 0, vitaminC: 7, calcium: 23, iron: 0.2 },
  "garlic": { calories: 149, totalFat: 0.5, saturatedFat: 0.1, transFat: 0, cholesterol: 0, sodium: 17, totalCarbs: 33, dietaryFiber: 2.1, sugars: 1, protein: 6.4, vitaminA: 0, vitaminC: 31, calcium: 181, iron: 1.7 },
  "beef": { calories: 250, totalFat: 15, saturatedFat: 6, transFat: 0.5, cholesterol: 72, sodium: 58, totalCarbs: 0, dietaryFiber: 0, sugars: 0, protein: 26, vitaminA: 0, vitaminC: 0, calcium: 18, iron: 2.6 },
  "chicken": { calories: 165, totalFat: 3.6, saturatedFat: 1, transFat: 0, cholesterol: 85, sodium: 74, totalCarbs: 0, dietaryFiber: 0, sugars: 0, protein: 31, vitaminA: 0, vitaminC: 0, calcium: 11, iron: 0.9 },
  "pasta": { calories: 131, totalFat: 1.1, saturatedFat: 0.2, transFat: 0, cholesterol: 0, sodium: 1, totalCarbs: 25, dietaryFiber: 1.8, sugars: 0.6, protein: 5, vitaminA: 0, vitaminC: 0, calcium: 7, iron: 0.5 },
  "rice": { calories: 130, totalFat: 0.3, saturatedFat: 0.1, transFat: 0, cholesterol: 0, sodium: 1, totalCarbs: 28, dietaryFiber: 0.4, sugars: 0.1, protein: 2.7, vitaminA: 0, vitaminC: 0, calcium: 3, iron: 0.2 },
  "cheese": { calories: 402, totalFat: 33, saturatedFat: 21, transFat: 0, cholesterol: 105, sodium: 621, totalCarbs: 1.3, dietaryFiber: 0, sugars: 0.5, protein: 25, vitaminA: 718, vitaminC: 0, calcium: 721, iron: 0.6 },
  "salt": { calories: 0, totalFat: 0, saturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 38758, totalCarbs: 0, dietaryFiber: 0, sugars: 0, protein: 0, vitaminA: 0, vitaminC: 0, calcium: 24, iron: 0.3 },
  "pepper": { calories: 251, totalFat: 3.3, saturatedFat: 1.4, transFat: 0, cholesterol: 0, sodium: 20, totalCarbs: 64, dietaryFiber: 25, sugars: 0.6, protein: 10, vitaminA: 540, vitaminC: 0, calcium: 443, iron: 9.7 },
};

function findNutrition(ingredientName: string): NutritionInfo | null {
  const name = ingredientName.toLowerCase().trim();
  
  // Direct match
  if (INGREDIENT_NUTRITION[name]) {
    return INGREDIENT_NUTRITION[name];
  }
  
  // Partial match
  for (const [key, value] of Object.entries(INGREDIENT_NUTRITION)) {
    if (name.includes(key) || key.includes(name)) {
      return value;
    }
  }
  
  return null;
}

function scaleNutrition(nutrition: NutritionInfo, grams: number): NutritionInfo {
  const scale = grams / 100;
  return {
    calories: Math.round(nutrition.calories * scale),
    totalFat: Math.round(nutrition.totalFat * scale * 10) / 10,
    saturatedFat: Math.round(nutrition.saturatedFat * scale * 10) / 10,
    transFat: Math.round(nutrition.transFat * scale * 10) / 10,
    cholesterol: Math.round(nutrition.cholesterol * scale),
    sodium: Math.round(nutrition.sodium * scale),
    totalCarbs: Math.round(nutrition.totalCarbs * scale * 10) / 10,
    dietaryFiber: Math.round(nutrition.dietaryFiber * scale * 10) / 10,
    sugars: Math.round(nutrition.sugars * scale * 10) / 10,
    protein: Math.round(nutrition.protein * scale * 10) / 10,
    vitaminA: Math.round(nutrition.vitaminA * scale),
    vitaminC: Math.round(nutrition.vitaminC * scale),
    calcium: Math.round(nutrition.calcium * scale),
    iron: Math.round(nutrition.iron * scale * 10) / 10,
  };
}

function addNutrition(a: NutritionInfo, b: NutritionInfo): NutritionInfo {
  return {
    calories: a.calories + b.calories,
    totalFat: Math.round((a.totalFat + b.totalFat) * 10) / 10,
    saturatedFat: Math.round((a.saturatedFat + b.saturatedFat) * 10) / 10,
    transFat: Math.round((a.transFat + b.transFat) * 10) / 10,
    cholesterol: a.cholesterol + b.cholesterol,
    sodium: a.sodium + b.sodium,
    totalCarbs: Math.round((a.totalCarbs + b.totalCarbs) * 10) / 10,
    dietaryFiber: Math.round((a.dietaryFiber + b.dietaryFiber) * 10) / 10,
    sugars: Math.round((a.sugars + b.sugars) * 10) / 10,
    protein: Math.round((a.protein + b.protein) * 10) / 10,
    vitaminA: a.vitaminA + b.vitaminA,
    vitaminC: a.vitaminC + b.vitaminC,
    calcium: a.calcium + b.calcium,
    iron: Math.round((a.iron + b.iron) * 10) / 10,
  };
}

function divideNutrition(nutrition: NutritionInfo, divisor: number): NutritionInfo {
  return {
    calories: Math.round(nutrition.calories / divisor),
    totalFat: Math.round(nutrition.totalFat / divisor * 10) / 10,
    saturatedFat: Math.round(nutrition.saturatedFat / divisor * 10) / 10,
    transFat: Math.round(nutrition.transFat / divisor * 10) / 10,
    cholesterol: Math.round(nutrition.cholesterol / divisor),
    sodium: Math.round(nutrition.sodium / divisor),
    totalCarbs: Math.round(nutrition.totalCarbs / divisor * 10) / 10,
    dietaryFiber: Math.round(nutrition.dietaryFiber / divisor * 10) / 10,
    sugars: Math.round(nutrition.sugars / divisor * 10) / 10,
    protein: Math.round(nutrition.protein / divisor * 10) / 10,
    vitaminA: Math.round(nutrition.vitaminA / divisor),
    vitaminC: Math.round(nutrition.vitaminC / divisor),
    calcium: Math.round(nutrition.calcium / divisor),
    iron: Math.round(nutrition.iron / divisor * 10) / 10,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const tenantId = await getTenantId();
    
    if (!user || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recipeId, servings } = generateSchema.parse(body);

    // Fetch recipe with ingredients
    const recipe = await database.recipe.findFirst({
      where: {
        id: recipeId,
        tenantId,
      },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          include: {
            ingredients: true,
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const latestVersion = recipe.versions[0];
    if (!latestVersion) {
      return NextResponse.json({ error: "No recipe version found" }, { status: 400 });
    }

    // Calculate nutrition from ingredients
    const emptyNutrition: NutritionInfo = {
      calories: 0, totalFat: 0, saturatedFat: 0, transFat: 0,
      cholesterol: 0, sodium: 0, totalCarbs: 0, dietaryFiber: 0,
      sugars: 0, protein: 0, vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0,
    };

    const unknownIngredients: string[] = [];
    let totalNutrition = { ...emptyNutrition };

    for (const ingredient of latestVersion.ingredients) {
      const nutrition = findNutrition(ingredient.name);
      
      if (!nutrition) {
        unknownIngredients.push(ingredient.name);
        continue;
      }

      // Convert quantity to grams (simplified - assumes grams if unit is empty or 'g')
      let grams = ingredient.quantity;
      if (ingredient.unit && !["g", "gram", "grams", ""].includes(ingredient.unit.toLowerCase())) {
        // Rough conversions for common units
        if (["cup", "cups"].includes(ingredient.unit.toLowerCase())) {
          grams = ingredient.quantity * 240; // ~240g per cup
        } else if (["tbsp", "tablespoon", "tablespoons"].includes(ingredient.unit.toLowerCase())) {
          grams = ingredient.quantity * 15;
        } else if (["tsp", "teaspoon", "teaspoons"].includes(ingredient.unit.toLowerCase())) {
          grams = ingredient.quantity * 5;
        } else if (["oz", "ounce", "ounces"].includes(ingredient.unit.toLowerCase())) {
          grams = ingredient.quantity * 28.35;
        } else if (["lb", "pound", "pounds"].includes(ingredient.unit.toLowerCase())) {
          grams = ingredient.quantity * 453.6;
        }
      }

      const scaled = scaleNutrition(nutrition, grams);
      totalNutrition = addNutrition(totalNutrition, scaled);
    }

    // Calculate per-serving nutrition
    const recipeYield = servings || recipe.yield || 1;
    const perServing = divideNutrition(totalNutrition, recipeYield);

    // Calculate % Daily Value (based on 2000 calorie diet)
    const dailyValues = {
      totalFat: 78,
      saturatedFat: 20,
      cholesterol: 300,
      sodium: 2300,
      totalCarbs: 275,
      dietaryFiber: 28,
      protein: 50,
      vitaminA: 900,
      vitaminC: 90,
      calcium: 1300,
      iron: 18,
    };

    const percentDV = {
      totalFat: Math.round((perServing.totalFat / dailyValues.totalFat) * 100),
      saturatedFat: Math.round((perServing.saturatedFat / dailyValues.saturatedFat) * 100),
      cholesterol: Math.round((perServing.cholesterol / dailyValues.cholesterol) * 100),
      sodium: Math.round((perServing.sodium / dailyValues.sodium) * 100),
      totalCarbs: Math.round((perServing.totalCarbs / dailyValues.totalCarbs) * 100),
      dietaryFiber: Math.round((perServing.dietaryFiber / dailyValues.dietaryFiber) * 100),
      protein: Math.round((perServing.protein / dailyValues.protein) * 100),
      vitaminA: Math.round((perServing.vitaminA / dailyValues.vitaminA) * 100),
      vitaminC: Math.round((perServing.vitaminC / dailyValues.vitaminC) * 100),
      calcium: Math.round((perServing.calcium / dailyValues.calcium) * 100),
      iron: Math.round((perServing.iron / dailyValues.iron) * 100),
    };

    return NextResponse.json({
      success: true,
      nutritionLabel: {
        recipeId: recipe.id,
        recipeName: recipe.name,
        servingSize: "1 serving",
        servingsPerRecipe: recipeYield,
        nutrition: perServing,
        percentDailyValue: percentDV,
        totalNutrition,
        unknownIngredients,
        generatedAt: new Date().toISOString(),
        disclaimer: "Nutrition information is calculated based on ingredient data and may vary. Not intended for medical or dietary purposes.",
      },
    });
  } catch (error) {
    console.error("Error generating nutrition label:", error);
    return NextResponse.json(
      { error: "Failed to generate nutrition label" },
      { status: 500 }
    );
  }
}
