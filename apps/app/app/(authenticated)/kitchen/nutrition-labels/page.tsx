"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { LabelSkeleton } from "@repo/design-system/components/ui/skeleton";
import { FileText, Scale, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Recipe {
  id: string;
  name: string;
  yield: number;
  ingredientCount: number;
  hasNutritionData: boolean;
  createdAt: string;
}

interface NutritionLabel {
  recipeId: string;
  recipeName: string;
  servingSize: string;
  servingsPerRecipe: number;
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
  unknownIngredients: string[];
  disclaimer: string;
}

export default function NutritionLabelsPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [nutritionLabel, setNutritionLabel] = useState<NutritionLabel | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kitchen/nutrition-labels/list");
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
      const res = await fetch("/api/kitchen/nutrition-labels/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.id }),
      });
      const data = await res.json();
      
      if (data.success) {
        setNutritionLabel(data.nutritionLabel);
        if (data.nutritionLabel.unknownIngredients.length > 0) {
          toast.warning(`${data.nutritionLabel.unknownIngredients.length} ingredients had unknown nutrition data`);
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
    <div className={`flex justify-between py-1 ${isIndented ? "pl-4" : "border-t border-gray-200"}`}>
      <span className={`${isIndented ? "text-sm" : "font-medium"}`}>
        {isIndented ? "  " : ""}{label}
      </span>
      <span className="flex gap-4">
        <span className="text-right w-20">{value}{unit}</span>
        {percentDV !== undefined && (
          <span className="text-right w-12 font-medium">{percentDV}%</span>
        )}
      </span>
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Nutrition Labels
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate FDA-compliant nutrition labels for your recipes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recipe List */}
        <Card>
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
                  <LabelSkeleton key={i} />
                ))}
              </div>
            ) : recipes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recipes found. Create recipes first to generate nutrition labels.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRecipe?.id === recipe.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => generateLabel(recipe)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{recipe.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {recipe.ingredientCount} ingredients • Serves {recipe.yield || 1}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" disabled={generating && selectedRecipe?.id === recipe.id}>
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
        <Card>
          <CardHeader>
            <CardTitle>Nutrition Facts</CardTitle>
          </CardHeader>
          <CardContent>
            {generating ? (
              <div className="flex items-center justify-center py-12">
                <Sparkles className="h-8 w-8 animate-pulse mr-2" />
                <span>Calculating nutrition...</span>
              </div>
            ) : nutritionLabel ? (
              <div className="bg-white border-2 border-black p-4 font-mono text-sm">
                {/* Header */}
                <div className="text-4xl font-black border-b-4 border-black pb-1">
                  Nutrition Facts
                </div>
                
                <div className="py-2">
                  <div className="text-lg font-bold">{nutritionLabel.recipeName}</div>
                  <div className="text-sm">{nutritionLabel.servingSize}</div>
                  <div className="text-sm">Servings Per Recipe: {nutritionLabel.servingsPerRecipe}</div>
                </div>

                <div className="border-t-8 border-black">
                  <div className="text-right text-xs pb-1">Amount Per Serving</div>
                </div>

                {/* Calories */}
                <div className="border-t-4 border-black py-1">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Calories</span>
                    <span>{nutritionLabel.nutrition.calories}</span>
                  </div>
                </div>

                {/* Daily Value Header */}
                <div className="border-t border-gray-200 py-1 text-right text-sm font-medium">
                  % Daily Value*
                </div>

                {/* Nutrients */}
                {renderNutritionRow("Total Fat", nutritionLabel.nutrition.totalFat, "g", nutritionLabel.percentDailyValue.totalFat)}
                {renderNutritionRow("Saturated Fat", nutritionLabel.nutrition.saturatedFat, "g", nutritionLabel.percentDailyValue.saturatedFat, true)}
                {renderNutritionRow("Trans Fat", nutritionLabel.nutrition.transFat, "g", undefined, true)}
                {renderNutritionRow("Cholesterol", nutritionLabel.nutrition.cholesterol, "mg", nutritionLabel.percentDailyValue.cholesterol)}
                {renderNutritionRow("Sodium", nutritionLabel.nutrition.sodium, "mg", nutritionLabel.percentDailyValue.sodium)}
                {renderNutritionRow("Total Carbohydrate", nutritionLabel.nutrition.totalCarbs, "g", nutritionLabel.percentDailyValue.totalCarbs)}
                {renderNutritionRow("Dietary Fiber", nutritionLabel.nutrition.dietaryFiber, "g", nutritionLabel.percentDailyValue.dietaryFiber, true)}
                {renderNutritionRow("Total Sugars", nutritionLabel.nutrition.sugars, "g", undefined, true)}
                {renderNutritionRow("Protein", nutritionLabel.nutrition.protein, "g", nutritionLabel.percentDailyValue.protein)}
                {renderNutritionRow("Vitamin A", nutritionLabel.nutrition.vitaminA, "mcg", nutritionLabel.percentDailyValue.vitaminA)}
                {renderNutritionRow("Vitamin C", nutritionLabel.nutrition.vitaminC, "mg", nutritionLabel.percentDailyValue.vitaminC)}
                {renderNutritionRow("Calcium", nutritionLabel.nutrition.calcium, "mg", nutritionLabel.percentDailyValue.calcium)}
                {renderNutritionRow("Iron", nutritionLabel.nutrition.iron, "mg", nutritionLabel.percentDailyValue.iron)}

                {/* Footer */}
                <div className="border-t-4 border-black mt-2 pt-2 text-xs">
                  * Percent Daily Values are based on a 2,000 calorie diet.
                </div>

                {/* Unknown Ingredients Warning */}
                {nutritionLabel.unknownIngredients.length > 0 && (
                  <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <div className="flex items-center gap-1 text-yellow-800 font-medium mb-1">
                      <AlertTriangle className="h-3 w-3" />
                      Missing nutrition data
                    </div>
                    <p className="text-yellow-700">
                      Could not calculate nutrition for: {nutritionLabel.unknownIngredients.join(", ")}
                    </p>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="mt-4 text-xs text-muted-foreground italic">
                  {nutritionLabel.disclaimer}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a recipe to generate a nutrition label</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
