"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  ChefHat,
  Clock,
  DollarSign,
  History as HistoryIcon,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getRecipeCost,
  type IngredientCostBreakdown,
  type RecipeCostBreakdown,
} from "@/app/lib/use-recipe-costing";

type RecipeDetailRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  is_active: boolean;
  yield_quantity: number | null;
  yield_unit: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  rest_time_minutes: number | null;
  instructions: string | null;
  notes: string | null;
  image_url: string | null;
};

type IngredientRow = {
  id: string;
  name: string;
  quantity: number;
  unit_code: string;
  notes: string | null;
  order_index: number;
};

type RecipeVersionRow = {
  id: string;
  version_number: number;
  created_at: string;
  ingredient_count: number;
  step_count: number;
};

type RecipeDetailTabsProps = {
  recipe: RecipeDetailRow;
  ingredients: IngredientRow[];
  recipeVersionId: string | null;
};

const formatMinutes = (minutes?: number | null) =>
  minutes && minutes > 0 ? `${minutes}m` : "-";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

function CostingTabContent({
  recipeVersionId,
  loading,
  hasCostData,
  costData,
  yield_unit,
}: {
  recipeVersionId: string | null;
  loading: boolean;
  hasCostData: boolean;
  costData: RecipeCostBreakdown | null;
  yield_unit: string | null;
}) {
  if (!recipeVersionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Costing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No recipe version available for costing calculation.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Costing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading cost data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasCostData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Costing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Costs not calculated</h3>
            <p className="text-sm text-muted-foreground">
              Add ingredients with inventory costs to see cost breakdown.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
              <div className="font-semibold">
                {formatCurrency(costData?.totalCost || 0)}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">
                Cost per {yield_unit || "Yield"}
              </div>
              <div className="font-semibold">
                {formatCurrency(costData?.costPerYield || 0)}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <ChefHat className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">
                Cost per Serving
              </div>
              <div className="font-semibold">
                {formatCurrency(
                  costData?.costPerPortion || costData?.costPerYield || 0
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingredient Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {costData?.ingredients.map(
              (ingredient: IngredientCostBreakdown) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3"
                  key={ingredient.id}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{ingredient.name}</span>
                      {!ingredient.hasInventoryItem && (
                        <Badge className="text-xs" variant="outline">
                          No cost data
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {ingredient.quantity} {ingredient.unit} ×{" "}
                      {formatCurrency(ingredient.unitCost)}
                      {ingredient.wasteFactor !== 1 &&
                        ` (with ${(ingredient.wasteFactor * 100).toFixed(
                          0
                        )}% waste factor)`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(ingredient.cost)}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function HistoryTabContent({
  recipeId,
  currentVersionId,
}: {
  recipeId: string;
  currentVersionId: string | null;
}) {
  const [versions, setVersions] = useState<RecipeVersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingVersion, setViewingVersion] = useState<RecipeVersionRow | null>(
    null
  );

  useEffect(() => {
    const fetchVersions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/recipes/${recipeId}/versions`);
        if (response.ok) {
          const data = await response.json();
          setVersions(data);
        }
      } catch (error) {
        console.error("Failed to fetch recipe versions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [recipeId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading version history...</p>
        </CardContent>
      </Card>
    );
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HistoryIcon className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No versions yet</h3>
            <p className="text-sm text-muted-foreground">
              Recipe versions will appear here as the recipe is updated.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {versions.map((version) => (
              <div
                className={`flex items-center justify-between rounded-lg border p-4 ${
                  version.id === currentVersionId
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                key={version.id}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      Version {version.version_number}
                    </span>
                    {version.id === currentVersionId && (
                      <Badge variant="default">Current</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {new Date(version.created_at).toLocaleString()}
                  </div>
                  <div className="mt-2 flex gap-4 text-sm">
                    <span>
                      <strong>{version.ingredient_count}</strong> ingredients
                    </span>
                    <span>
                      <strong>{version.step_count}</strong> steps
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => setViewingVersion(version)}
                  size="sm"
                  variant="outline"
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={() => setViewingVersion(null)}
        open={!!viewingVersion}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Version {viewingVersion?.version_number} -{" "}
              {viewingVersion &&
                new Date(viewingVersion.created_at).toLocaleString()}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 font-semibold">Summary</h3>
                <div className="rounded-lg border p-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <strong>Ingredients:</strong>{" "}
                      {viewingVersion?.ingredient_count}
                    </div>
                    <div>
                      <strong>Steps:</strong> {viewingVersion?.step_count}
                    </div>
                    <div>
                      <strong>Created:</strong>{" "}
                      {viewingVersion &&
                        new Date(viewingVersion.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                This is a snapshot of version {viewingVersion?.version_number}.
                Full version comparison and diff features will be available in a
                future update.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RecipeDetailTabs({
  recipe,
  ingredients,
  recipeVersionId,
}: RecipeDetailTabsProps) {
  const [costData, setCostData] = useState<RecipeCostBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!recipeVersionId) {
      setCostData(null);
      return;
    }

    const fetchCostData = async () => {
      setLoading(true);
      try {
        const data = await getRecipeCost(recipeVersionId);
        setCostData(data);
      } catch (error) {
        console.error("Failed to fetch cost data:", error);
        setCostData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCostData();
  }, [recipeVersionId]);

  const hasCostData = Boolean(costData && costData.ingredients.length > 0);

  return (
    <Tabs className="w-full" defaultValue="overview">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
        <TabsTrigger value="steps">Steps</TabsTrigger>
        <TabsTrigger value="costing">Costing</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent className="space-y-4" value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Recipe Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={recipe.is_active ? "default" : "secondary"}>
                {recipe.is_active ? "Active" : "Inactive"}
              </Badge>
              {recipe.category && (
                <Badge variant="outline">{recipe.category}</Badge>
              )}
            </div>

            {recipe.description && (
              <p className="text-muted-foreground">{recipe.description}</p>
            )}

            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-3 pt-6">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Prep Time
                    </div>
                    <div className="font-semibold">
                      {formatMinutes(recipe.prep_time_minutes)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 pt-6">
                  <ChefHat className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Cook Time
                    </div>
                    <div className="font-semibold">
                      {formatMinutes(recipe.cook_time_minutes)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 pt-6">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Rest Time
                    </div>
                    <div className="font-semibold">
                      {formatMinutes(recipe.rest_time_minutes)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 pt-6">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Yield</div>
                    <div className="font-semibold">
                      {recipe.yield_quantity ?? "-"} {recipe.yield_unit ?? ""}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {recipe.notes && (
              <div>
                <h3 className="mb-2 font-semibold">Notes</h3>
                <p className="text-muted-foreground">{recipe.notes}</p>
              </div>
            )}

            {recipe.tags && recipe.tags.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent className="space-y-4" value="ingredients">
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            {ingredients.length === 0 ? (
              <p className="text-muted-foreground">No ingredients added yet.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {ingredients.map((ingredient) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={ingredient.id}
                  >
                    <span className="font-medium">{ingredient.name}</span>
                    <span className="text-muted-foreground">
                      {ingredient.quantity} {ingredient.unit_code}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent className="space-y-4" value="steps">
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.instructions ? (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{recipe.instructions}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No instructions added yet.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent className="space-y-4" value="costing">
        <CostingTabContent
          costData={costData}
          hasCostData={hasCostData}
          loading={loading}
          recipeVersionId={recipeVersionId}
          yield_unit={recipe.yield_unit}
        />
      </TabsContent>

      <TabsContent className="space-y-4" value="history">
        <HistoryTabContent
          currentVersionId={recipeVersionId}
          recipeId={recipe.id}
        />
      </TabsContent>
    </Tabs>
  );
}
