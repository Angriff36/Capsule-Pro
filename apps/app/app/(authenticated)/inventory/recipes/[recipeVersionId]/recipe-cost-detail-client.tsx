"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  CalculatorIcon,
  CheckIcon,
  ChevronLeftIcon,
  DollarSignIcon,
  EditIcon,
  LoaderIcon,
  RefreshCwIcon,
  ScaleIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  calculateCostPercentage,
  formatCurrency,
  formatDate,
  formatQuantity,
  formatWasteFactor,
  type IngredientCostBreakdown,
  type ScaleRecipeRequest,
  scaleRecipe,
  type UpdateWasteFactorRequest,
  updateEventBudgets,
  updateWasteFactor,
  useRecipeCost,
} from "../../../../lib/use-recipe-costing";

type RecipeCostDetailClientProps = {
  recipeVersionId: string;
};

export const RecipeCostDetailClient = ({
  recipeVersionId,
}: RecipeCostDetailClientProps) => {
  const {
    data: costData,
    loading,
    error,
    refetch,
    recalculate,
  } = useRecipeCost(recipeVersionId);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isUpdatingBudgets, setIsUpdatingBudgets] = useState(false);
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [wasteModalOpen, setWasteModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] =
    useState<IngredientCostBreakdown | null>(null);
  const [targetPortions, setTargetPortions] = useState("");
  const [wasteFactor, setWasteFactor] = useState("");
  const [scaledCost, setScaledCost] = useState<{
    original: number;
    scaled: number;
    scaleFactor: number;
  } | null>(null);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await recalculate();
      toast.success("Recipe costs recalculated successfully");
    } catch (err) {
      console.error("Failed to recalculate costs:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to recalculate costs"
      );
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleScaleRecipe = async () => {
    if (!(costData && targetPortions)) {
      return;
    }

    const portions = Number.parseInt(targetPortions, 10);
    if (Number.isNaN(portions) || portions <= 0) {
      toast.error("Please enter a valid number of portions");
      return;
    }

    const currentYield = costData.recipe.yieldQuantity || 1;
    const request: ScaleRecipeRequest = {
      targetPortions: portions,
      currentYield,
    };

    try {
      const result = await scaleRecipe(recipeVersionId, request);
      setScaledCost({
        original: result.originalCost,
        scaled: result.scaledTotalCost,
        scaleFactor: result.scaleFactor,
      });
      toast.success(`Recipe scaled to ${portions} portions`);
      setScaleModalOpen(false);
      setTargetPortions("");
    } catch (err) {
      console.error("Failed to scale recipe:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to scale recipe"
      );
    }
  };

  const handleUpdateWasteFactor = async () => {
    if (!selectedIngredient) {
      return;
    }

    const factor = Number.parseFloat(wasteFactor);
    if (Number.isNaN(factor) || factor < 1) {
      toast.error("Please enter a valid waste factor (1.0 or greater)");
      return;
    }

    const request: UpdateWasteFactorRequest = {
      recipeIngredientId: selectedIngredient.recipeIngredientId,
      wasteFactor: factor,
    };

    try {
      await updateWasteFactor(recipeVersionId, request);
      toast.success(`Waste factor updated for ${selectedIngredient.name}`);
      setWasteModalOpen(false);
      setSelectedIngredient(null);
      setWasteFactor("");
      refetch();
    } catch (err) {
      console.error("Failed to update waste factor:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update waste factor"
      );
    }
  };

  const handleUpdateEventBudgets = async () => {
    setIsUpdatingBudgets(true);
    try {
      const result = await updateEventBudgets(recipeVersionId);
      toast.success(`Updated ${result.affectedEvents} event budgets`);
    } catch (err) {
      console.error("Failed to update event budgets:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update event budgets"
      );
    } finally {
      setIsUpdatingBudgets(false);
    }
  };

  const openWasteModal = (ingredient: IngredientCostBreakdown) => {
    setSelectedIngredient(ingredient);
    setWasteFactor(ingredient.wasteFactor.toString());
    setWasteModalOpen(true);
  };

  const closeScaleModal = () => {
    setScaleModalOpen(false);
    setTargetPortions("");
    setScaledCost(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">
            Loading recipe cost details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !costData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            {error?.message || "Failed to load recipe cost details"}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const {
    recipe,
    totalCost,
    costPerYield,
    costPerPortion,
    lastCalculated,
    ingredients,
  } = costData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild size="sm" variant="ghost">
          <a href="/inventory/recipes">
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Back to Recipes
          </a>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{recipe.name}</h1>
          {recipe.description && (
            <p className="text-muted-foreground mt-1">{recipe.description}</p>
          )}
        </div>
      </div>

      {/* Cost Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              For {recipe.yieldQuantity || 0} {recipe.yieldUnit || "units"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cost Per Yield
            </CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(costPerYield)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per {recipe.yieldUnit || "unit"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cost Per Portion
            </CardTitle>
            <CalculatorIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {costPerPortion ? formatCurrency(costPerPortion) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {recipe.portionSize
                ? `For ${recipe.portionSize} ${recipe.portionUnit || "portion"}`
                : "Portion size not set"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Last Calculated
            </CardTitle>
            <RefreshCwIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {formatDate(lastCalculated)}
            </div>
            <p className="text-xs text-muted-foreground">
              {ingredients.length} ingredients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scaled Cost Display */}
      {scaledCost && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ScaleIcon className="h-5 w-5" />
              Scaled Recipe Cost
            </CardTitle>
            <CardDescription>
              Recipe scaled by {scaledCost.scaleFactor.toFixed(2)}x
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div>
                <p className="text-sm text-muted-foreground">Original Cost</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(scaledCost.original)}
                </p>
              </div>
              <div className="text-2xl">→</div>
              <div>
                <p className="text-sm text-muted-foreground">Scaled Cost</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(scaledCost.scaled)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button disabled={isRecalculating} onClick={handleRecalculate}>
          <RefreshCwIcon
            className={`h-4 w-4 mr-2 ${isRecalculating ? "animate-spin" : ""}`}
          />
          {isRecalculating ? "Recalculating..." : "Recalculate Costs"}
        </Button>
        <Button onClick={() => setScaleModalOpen(true)} variant="outline">
          <ScaleIcon className="h-4 w-4 mr-2" />
          Scale Recipe
        </Button>
        <Button
          disabled={isUpdatingBudgets}
          onClick={handleUpdateEventBudgets}
          variant="outline"
        >
          <TrendingUpIcon
            className={`h-4 w-4 mr-2 ${isUpdatingBudgets ? "animate-spin" : ""}`}
          />
          {isUpdatingBudgets ? "Updating..." : "Update Event Budgets"}
        </Button>
      </div>

      {/* Ingredient Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Ingredient Cost Breakdown</CardTitle>
          <CardDescription>
            Detailed cost breakdown for each ingredient including waste factors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Waste Factor</TableHead>
                <TableHead className="text-right">Adjusted Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.map((ingredient) => {
                const costPercentage = calculateCostPercentage(
                  ingredient.cost,
                  totalCost
                );
                return (
                  <TableRow key={ingredient.id}>
                    <TableCell className="font-medium">
                      {ingredient.name}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQuantity(ingredient.quantity)} {ingredient.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>{formatWasteFactor(ingredient.wasteFactor)}</span>
                        <Button
                          className="h-6 w-6 p-0"
                          onClick={() => openWasteModal(ingredient)}
                          size="sm"
                          variant="ghost"
                        >
                          <EditIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQuantity(ingredient.adjustedQuantity)}{" "}
                      {ingredient.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(ingredient.unitCost)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(ingredient.cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min(costPercentage, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm">
                          {costPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ingredient.hasInventoryItem ? (
                        <Badge className="bg-green-600" variant="default">
                          <CheckIcon className="h-3 w-3 mr-1" />
                          Linked
                        </Badge>
                      ) : (
                        <Badge variant="outline">Unlinked</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {ingredient.hasInventoryItem && (
                        <Button asChild size="sm" variant="ghost">
                          <a
                            href={`/inventory/items/${ingredient.inventoryItemId}`}
                          >
                            View Item
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-bold bg-muted">
                <TableCell>Total</TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell className="text-right">
                  {formatCurrency(totalCost)}
                </TableCell>
                <TableCell className="text-right">100%</TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Scale Recipe Modal */}
      <Dialog onOpenChange={setScaleModalOpen} open={scaleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scale Recipe</DialogTitle>
            <DialogDescription>
              Enter the target number of portions to scale the recipe and
              calculate new costs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="portions">Target Portions</Label>
              <Input
                id="portions"
                min="1"
                onChange={(e) => setTargetPortions(e.target.value)}
                placeholder={recipe.yieldQuantity?.toString() || "1"}
                type="number"
                value={targetPortions}
              />
              <p className="text-sm text-muted-foreground">
                Current yield: {recipe.yieldQuantity || 0}{" "}
                {recipe.yieldUnit || "units"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={closeScaleModal} variant="outline">
              Cancel
            </Button>
            <Button disabled={!targetPortions} onClick={handleScaleRecipe}>
              <ScaleIcon className="h-4 w-4 mr-2" />
              Scale Recipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Waste Factor Modal */}
      <Dialog onOpenChange={setWasteModalOpen} open={wasteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Waste Factor</DialogTitle>
            <DialogDescription>
              Update the waste factor for {selectedIngredient?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wasteFactor">Waste Factor</Label>
              <Input
                id="wasteFactor"
                min="1"
                onChange={(e) => setWasteFactor(e.target.value)}
                placeholder="1.00"
                step="0.01"
                type="number"
                value={wasteFactor}
              />
              <p className="text-sm text-muted-foreground">
                A waste factor of 1.0 means no waste. 1.10 means 10% waste.
              </p>
            </div>
            {selectedIngredient && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Current:</strong>{" "}
                  {formatQuantity(selectedIngredient.quantity)}{" "}
                  {selectedIngredient.unit}×{" "}
                  {formatWasteFactor(selectedIngredient.wasteFactor)} ={" "}
                  {formatQuantity(selectedIngredient.adjustedQuantity)}{" "}
                  {selectedIngredient.unit}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setWasteModalOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button disabled={!wasteFactor} onClick={handleUpdateWasteFactor}>
              <CheckIcon className="h-4 w-4 mr-2" />
              Update Waste Factor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
