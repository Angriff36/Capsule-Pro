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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { captureException } from "@sentry/nextjs";
import {
  ChefHat,
  Clock,
  DollarSign,
  History as HistoryIcon,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import {
  kitchenRecipeVersionDetail,
  kitchenRecipeVersions,
  kitchenRecipeVersionsCompare,
} from "@/app/lib/routes";
import {
  getRecipeCost,
  type IngredientCostBreakdown,
  type RecipeCostBreakdown,
} from "@/app/lib/use-recipe-costing";
import { restoreRecipeVersion } from "../../actions-manifest";

interface RecipeDetailRow {
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
}

interface IngredientRow {
  id: string;
  name: string;
  quantity: number;
  unit_code: string;
  notes: string | null;
  order_index: number;
}

interface RecipeVersionRow {
  id: string;
  version_number: number;
  created_at: string;
  ingredient_count: number;
  step_count: number;
}

interface RecipeVersionDetail {
  id: string;
  recipeId: string;
  versionNumber: number;
  createdAt: string;
  name: string;
  category: string | null;
  cuisineType: string | null;
  description: string | null;
  tags: string[];
  yield: {
    quantity: number;
    unitId: number;
    unit: string | null;
    description: string | null;
  };
  times: {
    prepMinutes: number | null;
    cookMinutes: number | null;
    restMinutes: number | null;
  };
  difficultyLevel: number | null;
  instructions: string | null;
  notes: string | null;
  ingredients: {
    id: string;
    ingredientId: string;
    name: string;
    quantity: number;
    unit: string | null;
    preparationNotes: string | null;
    isOptional: boolean;
    sortOrder: number;
  }[];
  steps: {
    id: string;
    stepNumber: number;
    instruction: string;
    durationMinutes: number | null;
    temperatureValue: number | null;
    temperatureUnit: string | null;
    equipmentNeeded: string[] | null;
    tips: string | null;
    videoUrl: string | null;
    imageUrl: string | null;
  }[];
}

interface RecipeVersionCompare {
  from: {
    id: string;
    versionNumber: number;
    createdAt: string;
  };
  to: {
    id: string;
    versionNumber: number;
    createdAt: string;
  };
  changes: {
    base: Record<
      string,
      {
        from: string | number | string[] | null;
        to: string | number | string[] | null;
      }
    >;
    ingredients: {
      added: {
        ingredientId: string;
        name: string;
        quantity: number;
        unit: string | null;
        preparationNotes: string | null;
        isOptional: boolean;
      }[];
      removed: {
        ingredientId: string;
        name: string;
        quantity: number;
        unit: string | null;
        preparationNotes: string | null;
        isOptional: boolean;
      }[];
      changed: {
        ingredientId: string;
        name: string;
        from: {
          ingredientId: string;
          name: string;
          quantity: number;
          unit: string | null;
          preparationNotes: string | null;
          isOptional: boolean;
        };
        to: {
          ingredientId: string;
          name: string;
          quantity: number;
          unit: string | null;
          preparationNotes: string | null;
          isOptional: boolean;
        };
      }[];
    };
    steps: {
      added: {
        stepNumber: number;
        instruction: string;
      }[];
      removed: {
        stepNumber: number;
        instruction: string;
      }[];
      changed: {
        stepNumber: number;
        from: {
          stepNumber: number;
          instruction: string;
        };
        to: {
          stepNumber: number;
          instruction: string;
        };
      }[];
    };
  };
}

interface RecipeDetailTabsProps {
  recipe: RecipeDetailRow;
  ingredients: IngredientRow[];
  recipeVersionId: string | null;
}

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
  const router = useRouter();
  const [versions, setVersions] = useState<RecipeVersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingVersion, setViewingVersion] = useState<RecipeVersionRow | null>(
    null
  );
  const [viewingDetail, setViewingDetail] =
    useState<RecipeVersionDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareFrom, setCompareFrom] = useState<string | null>(null);
  const [compareTo, setCompareTo] = useState<string | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareData, setCompareData] = useState<RecipeVersionCompare | null>(
    null
  );
  const [compareError, setCompareError] = useState<string | null>(null);
  const [isRestoring, startRestore] = useTransition();

  useEffect(() => {
    const fetchVersions = async () => {
      setLoading(true);
      try {
        const response = await apiFetch(kitchenRecipeVersions(recipeId));
        if (response.ok) {
          const data = await response.json();
          setVersions(data);
        }
      } catch (error) {
        captureException(error);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [recipeId]);

  useEffect(() => {
    if (versions.length === 0) {
      return;
    }
    // Use functional updates to avoid needing compareFrom/compareTo in deps
    setCompareFrom((prev) => prev ?? versions[0].id);
    setCompareTo((prev) => prev ?? versions[1]?.id ?? versions[0].id);
  }, [versions]);

  const handleViewVersion = async (version: RecipeVersionRow) => {
    setViewingVersion(version);
    setViewLoading(true);
    setViewingDetail(null);
    try {
      const response = await apiFetch(
        kitchenRecipeVersionDetail(recipeId, version.id)
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to load version details");
      }
      const data = (await response.json()) as RecipeVersionDetail;
      setViewingDetail(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load version.";
      toast.error(message);
    } finally {
      setViewLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!(compareFrom && compareTo) || compareFrom === compareTo) {
      return;
    }
    setCompareLoading(true);
    setCompareError(null);
    setCompareData(null);
    try {
      const response = await apiFetch(
        kitchenRecipeVersionsCompare(recipeId, compareFrom, compareTo)
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to compare versions");
      }
      const data = (await response.json()) as RecipeVersionCompare;
      setCompareData(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to compare versions.";
      setCompareError(message);
    } finally {
      setCompareLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!viewingDetail) {
      return;
    }
    if (viewingDetail.id === currentVersionId) {
      return;
    }
    const confirmed = window.confirm(
      `Restore version ${viewingDetail.versionNumber}? A new version will be created.`
    );
    if (!confirmed) {
      return;
    }

    startRestore(async () => {
      try {
        await restoreRecipeVersion(recipeId, viewingDetail.id);
        toast.success("Recipe version restored.");
        setViewingVersion(null);
        setViewingDetail(null);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to restore version.";
        toast.error(message);
      }
    });
  };

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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Version History</CardTitle>
          <Button
            disabled={versions.length < 2}
            onClick={() => setCompareOpen(true)}
            size="sm"
            variant="outline"
          >
            Compare Versions
          </Button>
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
                  onClick={() => handleViewVersion(version)}
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
        onOpenChange={(open) => {
          if (!open) {
            setViewingVersion(null);
            setViewingDetail(null);
          }
        }}
        open={!!viewingVersion}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Version {viewingVersion?.version_number} -{" "}
              {viewingVersion &&
                new Date(viewingVersion.created_at).toLocaleString()}
            </DialogTitle>
          </DialogHeader>
          {viewLoading && (
            <p className="text-muted-foreground">Loading version details...</p>
          )}
          {!viewLoading && viewingDetail && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4 text-sm">
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <strong>Name:</strong> {viewingDetail.name}
                  </div>
                  <div>
                    <strong>Category:</strong> {viewingDetail.category ?? "—"}
                  </div>
                  <div>
                    <strong>Cuisine:</strong> {viewingDetail.cuisineType ?? "—"}
                  </div>
                  <div>
                    <strong>Yield:</strong> {viewingDetail.yield.quantity}{" "}
                    {viewingDetail.yield.unit ?? ""}
                  </div>
                  <div>
                    <strong>Prep:</strong>{" "}
                    {formatMinutes(viewingDetail.times.prepMinutes)}
                  </div>
                  <div>
                    <strong>Cook:</strong>{" "}
                    {formatMinutes(viewingDetail.times.cookMinutes)}
                  </div>
                  <div>
                    <strong>Rest:</strong>{" "}
                    {formatMinutes(viewingDetail.times.restMinutes)}
                  </div>
                  <div>
                    <strong>Difficulty:</strong>{" "}
                    {viewingDetail.difficultyLevel ?? "—"}
                  </div>
                </div>
                {viewingDetail.description && (
                  <div className="mt-3">
                    <strong>Description:</strong>{" "}
                    <span className="text-muted-foreground">
                      {viewingDetail.description}
                    </span>
                  </div>
                )}
                {viewingDetail.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {viewingDetail.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {viewingDetail.notes && (
                  <div className="mt-3">
                    <strong>Notes:</strong>{" "}
                    <span className="text-muted-foreground">
                      {viewingDetail.notes}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Ingredients</h3>
                <div className="space-y-2">
                  {viewingDetail.ingredients.map((ingredient) => (
                    <div
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                      key={ingredient.id}
                    >
                      <div>
                        <div className="font-medium">{ingredient.name}</div>
                        {ingredient.preparationNotes && (
                          <div className="text-muted-foreground">
                            {ingredient.preparationNotes}
                          </div>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {ingredient.quantity} {ingredient.unit ?? ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Steps</h3>
                <div className="space-y-2">
                  {viewingDetail.steps.map((step) => (
                    <div
                      className="rounded-lg border p-3 text-sm"
                      key={step.id}
                    >
                      <div className="font-semibold">
                        Step {step.stepNumber}
                      </div>
                      <div className="text-muted-foreground">
                        {step.instruction}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {!(viewLoading || viewingDetail) && (
            <p className="text-muted-foreground">
              No detail data available for this version.
            </p>
          )}

          {viewingDetail && (
            <div className="mt-4 flex justify-end gap-2">
              <Button
                disabled={isRestoring || viewingDetail.id === currentVersionId}
                onClick={handleRestore}
                variant="outline"
              >
                {viewingDetail.id === currentVersionId
                  ? "Current Version"
                  : isRestoring
                    ? "Restoring..."
                    : "Restore This Version"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setCompareOpen(open);
          if (!open) {
            setCompareData(null);
            setCompareError(null);
          }
        }}
        open={compareOpen}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compare Recipe Versions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  From
                </p>
                <Select
                  onValueChange={setCompareFrom}
                  value={compareFrom ?? undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        Version {version.version_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">To</p>
                <Select
                  onValueChange={setCompareTo}
                  value={compareTo ?? undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        Version {version.version_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                disabled={
                  compareLoading ||
                  !compareFrom ||
                  !compareTo ||
                  compareFrom === compareTo
                }
                onClick={handleCompare}
                variant="outline"
              >
                {compareLoading ? "Comparing..." : "Compare"}
              </Button>
            </div>

            {compareError && (
              <p className="text-sm text-destructive">{compareError}</p>
            )}

            {compareData && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 font-semibold">Field Changes</h3>
                  {Object.keys(compareData.changes.base).length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No base field differences.
                    </p>
                  ) : (
                    <div className="space-y-2 text-sm">
                      {Object.entries(compareData.changes.base).map(
                        ([field, change]) => (
                          <div className="rounded-lg border p-3" key={field}>
                            <div className="font-medium capitalize">
                              {field.replace(/([A-Z])/g, " $1")}
                            </div>
                            <div className="text-muted-foreground">
                              {Array.isArray(change.from)
                                ? change.from.join(", ") || "—"
                                : (change.from ?? "—")}{" "}
                              →{" "}
                              {Array.isArray(change.to)
                                ? change.to.join(", ") || "—"
                                : (change.to ?? "—")}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Ingredient Changes</h3>
                  <div className="space-y-2 text-sm">
                    {compareData.changes.ingredients.added.length > 0 && (
                      <div className="rounded-lg border p-3">
                        <div className="font-medium">Added</div>
                        {compareData.changes.ingredients.added.map((item) => (
                          <div
                            className="text-muted-foreground"
                            key={item.ingredientId}
                          >
                            {item.name} · {item.quantity} {item.unit ?? ""}
                          </div>
                        ))}
                      </div>
                    )}
                    {compareData.changes.ingredients.removed.length > 0 && (
                      <div className="rounded-lg border p-3">
                        <div className="font-medium">Removed</div>
                        {compareData.changes.ingredients.removed.map((item) => (
                          <div
                            className="text-muted-foreground"
                            key={item.ingredientId}
                          >
                            {item.name} · {item.quantity} {item.unit ?? ""}
                          </div>
                        ))}
                      </div>
                    )}
                    {compareData.changes.ingredients.changed.length > 0 && (
                      <div className="rounded-lg border p-3">
                        <div className="font-medium">Changed</div>
                        {compareData.changes.ingredients.changed.map((item) => (
                          <div
                            className="text-muted-foreground"
                            key={item.ingredientId}
                          >
                            {item.name}: {item.from.quantity}{" "}
                            {item.from.unit ?? ""} → {item.to.quantity}{" "}
                            {item.to.unit ?? ""}
                          </div>
                        ))}
                      </div>
                    )}
                    {compareData.changes.ingredients.added.length === 0 &&
                      compareData.changes.ingredients.removed.length === 0 &&
                      compareData.changes.ingredients.changed.length === 0 && (
                        <p className="text-muted-foreground">
                          No ingredient changes.
                        </p>
                      )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">Step Changes</h3>
                  <div className="space-y-2 text-sm">
                    {compareData.changes.steps.added.length > 0 && (
                      <div className="rounded-lg border p-3">
                        <div className="font-medium">Added</div>
                        {compareData.changes.steps.added.map((item) => (
                          <div
                            className="text-muted-foreground"
                            key={item.stepNumber}
                          >
                            Step {item.stepNumber}: {item.instruction}
                          </div>
                        ))}
                      </div>
                    )}
                    {compareData.changes.steps.removed.length > 0 && (
                      <div className="rounded-lg border p-3">
                        <div className="font-medium">Removed</div>
                        {compareData.changes.steps.removed.map((item) => (
                          <div
                            className="text-muted-foreground"
                            key={item.stepNumber}
                          >
                            Step {item.stepNumber}: {item.instruction}
                          </div>
                        ))}
                      </div>
                    )}
                    {compareData.changes.steps.changed.length > 0 && (
                      <div className="rounded-lg border p-3">
                        <div className="font-medium">Changed</div>
                        {compareData.changes.steps.changed.map((item) => (
                          <div
                            className="text-muted-foreground"
                            key={item.stepNumber}
                          >
                            Step {item.stepNumber}: {item.from.instruction} →{" "}
                            {item.to.instruction}
                          </div>
                        ))}
                      </div>
                    )}
                    {compareData.changes.steps.added.length === 0 &&
                      compareData.changes.steps.removed.length === 0 &&
                      compareData.changes.steps.changed.length === 0 && (
                        <p className="text-muted-foreground">
                          No step changes.
                        </p>
                      )}
                  </div>
                </div>
              </div>
            )}
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
        captureException(error);
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
