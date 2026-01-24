"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeCostDetailClient = void 0;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const table_1 = require("@repo/design-system/components/ui/table");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const use_recipe_costing_1 = require("../../../../lib/use-recipe-costing");
const RecipeCostDetailClient = ({ recipeVersionId }) => {
  const {
    data: costData,
    loading,
    error,
    refetch,
    recalculate,
  } = (0, use_recipe_costing_1.useRecipeCost)(recipeVersionId);
  const [isRecalculating, setIsRecalculating] = (0, react_1.useState)(false);
  const [isUpdatingBudgets, setIsUpdatingBudgets] = (0, react_1.useState)(
    false
  );
  const [scaleModalOpen, setScaleModalOpen] = (0, react_1.useState)(false);
  const [wasteModalOpen, setWasteModalOpen] = (0, react_1.useState)(false);
  const [selectedIngredient, setSelectedIngredient] = (0, react_1.useState)(
    null
  );
  const [targetPortions, setTargetPortions] = (0, react_1.useState)("");
  const [wasteFactor, setWasteFactor] = (0, react_1.useState)("");
  const [scaledCost, setScaledCost] = (0, react_1.useState)(null);
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await recalculate();
      sonner_1.toast.success("Recipe costs recalculated successfully");
    } catch (err) {
      console.error("Failed to recalculate costs:", err);
      sonner_1.toast.error(
        err instanceof Error ? err.message : "Failed to recalculate costs"
      );
    } finally {
      setIsRecalculating(false);
    }
  };
  const handleScaleRecipe = async () => {
    if (!(costData && targetPortions)) return;
    const portions = Number.parseInt(targetPortions, 10);
    if (isNaN(portions) || portions <= 0) {
      sonner_1.toast.error("Please enter a valid number of portions");
      return;
    }
    const currentYield = costData.recipe.yieldQuantity || 1;
    const request = {
      targetPortions: portions,
      currentYield,
    };
    try {
      const result = await (0, use_recipe_costing_1.scaleRecipe)(
        recipeVersionId,
        request
      );
      setScaledCost({
        original: result.originalCost,
        scaled: result.scaledTotalCost,
        scaleFactor: result.scaleFactor,
      });
      sonner_1.toast.success(`Recipe scaled to ${portions} portions`);
      setScaleModalOpen(false);
      setTargetPortions("");
    } catch (err) {
      console.error("Failed to scale recipe:", err);
      sonner_1.toast.error(
        err instanceof Error ? err.message : "Failed to scale recipe"
      );
    }
  };
  const handleUpdateWasteFactor = async () => {
    if (!selectedIngredient) return;
    const factor = Number.parseFloat(wasteFactor);
    if (isNaN(factor) || factor < 1) {
      sonner_1.toast.error(
        "Please enter a valid waste factor (1.0 or greater)"
      );
      return;
    }
    const request = {
      recipeIngredientId: selectedIngredient.recipeIngredientId,
      wasteFactor: factor,
    };
    try {
      await (0, use_recipe_costing_1.updateWasteFactor)(
        recipeVersionId,
        request
      );
      sonner_1.toast.success(
        `Waste factor updated for ${selectedIngredient.name}`
      );
      setWasteModalOpen(false);
      setSelectedIngredient(null);
      setWasteFactor("");
      refetch();
    } catch (err) {
      console.error("Failed to update waste factor:", err);
      sonner_1.toast.error(
        err instanceof Error ? err.message : "Failed to update waste factor"
      );
    }
  };
  const handleUpdateEventBudgets = async () => {
    setIsUpdatingBudgets(true);
    try {
      const result = await (0, use_recipe_costing_1.updateEventBudgets)(
        recipeVersionId
      );
      sonner_1.toast.success(`Updated ${result.affectedEvents} event budgets`);
    } catch (err) {
      console.error("Failed to update event budgets:", err);
      sonner_1.toast.error(
        err instanceof Error ? err.message : "Failed to update event budgets"
      );
    } finally {
      setIsUpdatingBudgets(false);
    }
  };
  const openWasteModal = (ingredient) => {
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
          <lucide_react_1.LoaderIcon className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <button_1.Button onClick={() => refetch()} variant="outline">
            <lucide_react_1.RefreshCwIcon className="h-4 w-4 mr-2" />
            Retry
          </button_1.Button>
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
        <button_1.Button asChild size="sm" variant="ghost">
          <a href="/inventory/recipes">
            <lucide_react_1.ChevronLeftIcon className="h-4 w-4 mr-1" />
            Back to Recipes
          </a>
        </button_1.Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{recipe.name}</h1>
          {recipe.description && (
            <p className="text-muted-foreground mt-1">{recipe.description}</p>
          )}
        </div>
      </div>

      {/* Cost Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Total Cost
            </card_1.CardTitle>
            <lucide_react_1.DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              {(0, use_recipe_costing_1.formatCurrency)(totalCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              For {recipe.yieldQuantity || 0} {recipe.yieldUnit || "units"}
            </p>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Cost Per Yield
            </card_1.CardTitle>
            <lucide_react_1.TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              {(0, use_recipe_costing_1.formatCurrency)(costPerYield)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per {recipe.yieldUnit || "unit"}
            </p>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Cost Per Portion
            </card_1.CardTitle>
            <lucide_react_1.CalculatorIcon className="h-4 w-4 text-muted-foreground" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              {costPerPortion
                ? (0, use_recipe_costing_1.formatCurrency)(costPerPortion)
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {recipe.portionSize
                ? `For ${recipe.portionSize} ${recipe.portionUnit || "portion"}`
                : "Portion size not set"}
            </p>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Last Calculated
            </card_1.CardTitle>
            <lucide_react_1.RefreshCwIcon className="h-4 w-4 text-muted-foreground" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-sm font-medium">
              {(0, use_recipe_costing_1.formatDate)(lastCalculated)}
            </div>
            <p className="text-xs text-muted-foreground">
              {ingredients.length} ingredients
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Scaled Cost Display */}
      {scaledCost && (
        <card_1.Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
          <card_1.CardHeader>
            <card_1.CardTitle className="text-lg flex items-center gap-2">
              <lucide_react_1.ScaleIcon className="h-5 w-5" />
              Scaled Recipe Cost
            </card_1.CardTitle>
            <card_1.CardDescription>
              Recipe scaled by {scaledCost.scaleFactor.toFixed(2)}x
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="flex items-center gap-8">
              <div>
                <p className="text-sm text-muted-foreground">Original Cost</p>
                <p className="text-2xl font-bold">
                  {(0, use_recipe_costing_1.formatCurrency)(
                    scaledCost.original
                  )}
                </p>
              </div>
              <div className="text-2xl">→</div>
              <div>
                <p className="text-sm text-muted-foreground">Scaled Cost</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {(0, use_recipe_costing_1.formatCurrency)(scaledCost.scaled)}
                </p>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button_1.Button disabled={isRecalculating} onClick={handleRecalculate}>
          <lucide_react_1.RefreshCwIcon
            className={`h-4 w-4 mr-2 ${isRecalculating ? "animate-spin" : ""}`}
          />
          {isRecalculating ? "Recalculating..." : "Recalculate Costs"}
        </button_1.Button>
        <button_1.Button
          onClick={() => setScaleModalOpen(true)}
          variant="outline"
        >
          <lucide_react_1.ScaleIcon className="h-4 w-4 mr-2" />
          Scale Recipe
        </button_1.Button>
        <button_1.Button
          disabled={isUpdatingBudgets}
          onClick={handleUpdateEventBudgets}
          variant="outline"
        >
          <lucide_react_1.TrendingUpIcon
            className={`h-4 w-4 mr-2 ${isUpdatingBudgets ? "animate-spin" : ""}`}
          />
          {isUpdatingBudgets ? "Updating..." : "Update Event Budgets"}
        </button_1.Button>
      </div>

      {/* Ingredient Cost Breakdown */}
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Ingredient Cost Breakdown</card_1.CardTitle>
          <card_1.CardDescription>
            Detailed cost breakdown for each ingredient including waste factors
          </card_1.CardDescription>
        </card_1.CardHeader>
        <card_1.CardContent>
          <table_1.Table>
            <table_1.TableHeader>
              <table_1.TableRow>
                <table_1.TableHead>Ingredient</table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Quantity
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Waste Factor
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Adjusted Qty
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Unit Cost
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Total Cost
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  % of Total
                </table_1.TableHead>
                <table_1.TableHead>Status</table_1.TableHead>
                <table_1.TableHead />
              </table_1.TableRow>
            </table_1.TableHeader>
            <table_1.TableBody>
              {ingredients.map((ingredient) => {
                const costPercentage = (0,
                use_recipe_costing_1.calculateCostPercentage)(
                  ingredient.cost,
                  totalCost
                );
                return (
                  <table_1.TableRow key={ingredient.id}>
                    <table_1.TableCell className="font-medium">
                      {ingredient.name}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      {(0, use_recipe_costing_1.formatQuantity)(
                        ingredient.quantity
                      )}{" "}
                      {ingredient.unit}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>
                          {(0, use_recipe_costing_1.formatWasteFactor)(
                            ingredient.wasteFactor
                          )}
                        </span>
                        <button_1.Button
                          className="h-6 w-6 p-0"
                          onClick={() => openWasteModal(ingredient)}
                          size="sm"
                          variant="ghost"
                        >
                          <lucide_react_1.EditIcon className="h-3 w-3" />
                        </button_1.Button>
                      </div>
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      {(0, use_recipe_costing_1.formatQuantity)(
                        ingredient.adjustedQuantity
                      )}{" "}
                      {ingredient.unit}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      {(0, use_recipe_costing_1.formatCurrency)(
                        ingredient.unitCost
                      )}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right font-medium">
                      {(0, use_recipe_costing_1.formatCurrency)(
                        ingredient.cost
                      )}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
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
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {ingredient.hasInventoryItem ? (
                        <badge_1.Badge
                          className="bg-green-600"
                          variant="default"
                        >
                          <lucide_react_1.CheckIcon className="h-3 w-3 mr-1" />
                          Linked
                        </badge_1.Badge>
                      ) : (
                        <badge_1.Badge variant="outline">
                          Unlinked
                        </badge_1.Badge>
                      )}
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {ingredient.hasInventoryItem && (
                        <button_1.Button asChild size="sm" variant="ghost">
                          <a
                            href={`/inventory/items/${ingredient.inventoryItemId}`}
                          >
                            View Item
                          </a>
                        </button_1.Button>
                      )}
                    </table_1.TableCell>
                  </table_1.TableRow>
                );
              })}
              <table_1.TableRow className="font-bold bg-muted">
                <table_1.TableCell>Total</table_1.TableCell>
                <table_1.TableCell />
                <table_1.TableCell />
                <table_1.TableCell />
                <table_1.TableCell />
                <table_1.TableCell className="text-right">
                  {(0, use_recipe_costing_1.formatCurrency)(totalCost)}
                </table_1.TableCell>
                <table_1.TableCell className="text-right">
                  100%
                </table_1.TableCell>
                <table_1.TableCell />
                <table_1.TableCell />
              </table_1.TableRow>
            </table_1.TableBody>
          </table_1.Table>
        </card_1.CardContent>
      </card_1.Card>

      {/* Scale Recipe Modal */}
      <dialog_1.Dialog onOpenChange={setScaleModalOpen} open={scaleModalOpen}>
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Scale Recipe</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Enter the target number of portions to scale the recipe and
              calculate new costs.
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="portions">Target Portions</label_1.Label>
              <input_1.Input
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
          <dialog_1.DialogFooter>
            <button_1.Button onClick={closeScaleModal} variant="outline">
              Cancel
            </button_1.Button>
            <button_1.Button
              disabled={!targetPortions}
              onClick={handleScaleRecipe}
            >
              <lucide_react_1.ScaleIcon className="h-4 w-4 mr-2" />
              Scale Recipe
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      {/* Edit Waste Factor Modal */}
      <dialog_1.Dialog onOpenChange={setWasteModalOpen} open={wasteModalOpen}>
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Edit Waste Factor</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              Update the waste factor for {selectedIngredient?.name}.
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label_1.Label htmlFor="wasteFactor">Waste Factor</label_1.Label>
              <input_1.Input
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
                  {(0, use_recipe_costing_1.formatQuantity)(
                    selectedIngredient.quantity
                  )}{" "}
                  {selectedIngredient.unit}×{" "}
                  {(0, use_recipe_costing_1.formatWasteFactor)(
                    selectedIngredient.wasteFactor
                  )}{" "}
                  ={" "}
                  {(0, use_recipe_costing_1.formatQuantity)(
                    selectedIngredient.adjustedQuantity
                  )}{" "}
                  {selectedIngredient.unit}
                </p>
              </div>
            )}
          </div>
          <dialog_1.DialogFooter>
            <button_1.Button
              onClick={() => setWasteModalOpen(false)}
              variant="outline"
            >
              Cancel
            </button_1.Button>
            <button_1.Button
              disabled={!wasteFactor}
              onClick={handleUpdateWasteFactor}
            >
              <lucide_react_1.CheckIcon className="h-4 w-4 mr-2" />
              Update Waste Factor
            </button_1.Button>
          </dialog_1.DialogFooter>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </div>
  );
};
exports.RecipeCostDetailClient = RecipeCostDetailClient;
