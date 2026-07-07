"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { AlertTriangle, FileText, Scale, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface Recipe {
  createdAt: string;
  hasNutritionData: boolean;
  id: string;
  ingredientCount: number;
  name: string;
  yield: number;
}

interface NutritionLabel {
  disclaimer: string;
  nutrition: {
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
  };
  percentDailyValue: Record<string, number>;
  recipeId: string;
  recipeName: string;
  servingSize: string;
  servingsPerRecipe: number;
  unknownIngredients: string[];
}

export default function NutritionLabelsPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [nutritionLabel, setNutritionLabel] = useState<NutritionLabel | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      // NOTE: Not migrated to generated Manifest client — no generated function exists for
      // this custom endpoint (aggregates recipes + versions + ingredients server-side).
      const res = await apiFetch("/api/kitchen/nutrition-labels/list");
      const data = await res.json();
      if (data.success) {
        setRecipes(data.recipes);
      }
    } catch (e) {
      console.error("Failed to fetch recipes:", e);
      toast.error("Failed to load recipes");
    } finally {
      setLoading(false);
    }
  };

  const generateLabel = async (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setGenerating(true);
    setNutritionLabel(null);

    try {
      // NOTE: Not migrated to generated Manifest client — no generated function exists for
      // this custom endpoint (AI-driven nutrition label generation).
      const res = await apiFetch("/api/kitchen/nutrition-labels/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.id }),
      });
      const data = await res.json();

      if (data.success) {
        setNutritionLabel(data.nutritionLabel);
        if (data.nutritionLabel.unknownIngredients.length > 0) {
          toast.warning(
            `${data.nutritionLabel.unknownIngredients.length} ingredients had unknown nutrition data`
          );
        }
      } else {
        toast.error(data.error || "Failed to generate nutrition label");
      }
    } catch (e) {
      console.error("Failed to generate label:", e);
      toast.error("Failed to generate nutrition label");
    } finally {
      setGenerating(false);
    }
  };

  const renderNutritionRow = (
    label: string,
    value: number,
    unit: string,
    percentDV?: number,
    isIndented = false
  ) => (
    <div
      className={`flex justify-between py-1 ${isIndented ? "pl-4" : "border-gray-200 border-t"}`}
    >
      <span className={`${isIndented ? "text-sm" : "font-medium"}`}>
        {isIndented ? "  " : ""}
        {label}
      </span>
      <span className="flex gap-4">
        <span className="w-20 text-right">
          {value}
          {unit}
        </span>
        {percentDV !== undefined && (
          <span className="w-12 text-right font-medium">{percentDV}%</span>
        )}
      </span>
    </div>
  );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 font-semibold text-2xl tracking-tight">
          <FileText className="h-8 w-8" />
          Nutrition Labels
        </h1>
        <p className="mt-2 text-muted-foreground">
          Generate FDA-compliant nutrition labels for your recipes
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recipe List */}
        <Card tone="canvas">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Recipes ({recipes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} />
                ))}
              </div>
            ) : recipes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>
                  No recipes found. Create recipes first to generate nutrition
                  labels.
                </p>
              </div>
            ) : (
              <div className="max-h-[600px] space-y-2 overflow-y-auto">
                {recipes.map((recipe) => (
                  <div
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      selectedRecipe?.id === recipe.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    key={recipe.id}
                    onClick={() => generateLabel(recipe)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{recipe.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {recipe.ingredientCount} ingredients • Serves{" "}
                          {recipe.yield || 1}
                        </p>
                      </div>
                      <Button
                        disabled={
                          generating && selectedRecipe?.id === recipe.id
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          void generateLabel(recipe);
                        }}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        {generating && selectedRecipe?.id === recipe.id ? (
                          <Sparkles className="h-4 w-4 animate-pulse" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nutrition Label Preview */}
        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Nutrition Facts</CardTitle>
          </CardHeader>
          <CardContent>
            {generating ? (
              <div className="flex items-center justify-center py-12">
                <Sparkles className="mr-2 h-8 w-8 animate-pulse" />
                <span>Calculating nutrition...</span>
              </div>
            ) : nutritionLabel ? (
              <div className="border-2 border-black bg-white p-4 font-mono text-sm">
                {/* Header */}
                <div className="border-black border-b-4 pb-1 font-semibold text-2xl">
                  Nutrition Facts
                </div>

                <div className="py-2">
                  <div className="font-bold text-lg">
                    {nutritionLabel.recipeName}
                  </div>
                  <div className="text-sm">{nutritionLabel.servingSize}</div>
                  <div className="text-sm">
                    Servings Per Recipe: {nutritionLabel.servingsPerRecipe}
                  </div>
                </div>

                <div className="border-black border-t-8">
                  <div className="pb-1 text-right text-xs">
                    Amount Per Serving
                  </div>
                </div>

                {/* Calories */}
                <div className="border-black border-t-4 py-1">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Calories</span>
                    <span>{nutritionLabel.nutrition.calories}</span>
                  </div>
                </div>

                {/* Daily Value Header */}
                <div className="border-gray-200 border-t py-1 text-right font-medium text-sm">
                  % Daily Value*
                </div>

                {/* Nutrients */}
                {renderNutritionRow(
                  "Total Fat",
                  nutritionLabel.nutrition.totalFat,
                  "g",
                  nutritionLabel.percentDailyValue.totalFat
                )}
                {renderNutritionRow(
                  "Saturated Fat",
                  nutritionLabel.nutrition.saturatedFat,
                  "g",
                  nutritionLabel.percentDailyValue.saturatedFat,
                  true
                )}
                {renderNutritionRow(
                  "Trans Fat",
                  nutritionLabel.nutrition.transFat,
                  "g",
                  undefined,
                  true
                )}
                {renderNutritionRow(
                  "Cholesterol",
                  nutritionLabel.nutrition.cholesterol,
                  "mg",
                  nutritionLabel.percentDailyValue.cholesterol
                )}
                {renderNutritionRow(
                  "Sodium",
                  nutritionLabel.nutrition.sodium,
                  "mg",
                  nutritionLabel.percentDailyValue.sodium
                )}
                {renderNutritionRow(
                  "Total Carbohydrate",
                  nutritionLabel.nutrition.totalCarbs,
                  "g",
                  nutritionLabel.percentDailyValue.totalCarbs
                )}
                {renderNutritionRow(
                  "Dietary Fiber",
                  nutritionLabel.nutrition.dietaryFiber,
                  "g",
                  nutritionLabel.percentDailyValue.dietaryFiber,
                  true
                )}
                {renderNutritionRow(
                  "Total Sugars",
                  nutritionLabel.nutrition.sugars,
                  "g",
                  undefined,
                  true
                )}
                {renderNutritionRow(
                  "Protein",
                  nutritionLabel.nutrition.protein,
                  "g",
                  nutritionLabel.percentDailyValue.protein
                )}
                {renderNutritionRow(
                  "Vitamin A",
                  nutritionLabel.nutrition.vitaminA,
                  "mcg",
                  nutritionLabel.percentDailyValue.vitaminA
                )}
                {renderNutritionRow(
                  "Vitamin C",
                  nutritionLabel.nutrition.vitaminC,
                  "mg",
                  nutritionLabel.percentDailyValue.vitaminC
                )}
                {renderNutritionRow(
                  "Calcium",
                  nutritionLabel.nutrition.calcium,
                  "mg",
                  nutritionLabel.percentDailyValue.calcium
                )}
                {renderNutritionRow(
                  "Iron",
                  nutritionLabel.nutrition.iron,
                  "mg",
                  nutritionLabel.percentDailyValue.iron
                )}

                {/* Footer */}
                <div className="mt-2 border-black border-t-4 pt-2 text-xs">
                  * Percent Daily Values are based on a 2,000 calorie diet.
                </div>

                {/* Unknown Ingredients Warning */}
                {nutritionLabel.unknownIngredients.length > 0 && (
                  <div className="mt-4 rounded border border-hairline bg-muted/50 p-2 text-xs">
                    <div className="mb-1 flex items-center gap-1 font-medium text-foreground">
                      <AlertTriangle className="h-3 w-3" />
                      Missing nutrition data
                    </div>
                    <p className="text-muted-foreground">
                      Could not calculate nutrition for:{" "}
                      {nutritionLabel.unknownIngredients.join(", ")}
                    </p>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="mt-4 text-muted-foreground text-xs italic">
                  {nutritionLabel.disclaimer}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>Select a recipe to generate a nutrition label</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
