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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
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
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import { captureException } from "@sentry/nextjs";
import {
  AlertTriangle,
  Apple,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  Clock,
  DollarSign,
  History as HistoryIcon,
  Lightbulb,
  Thermometer,
  Users,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
// NOTE: Keeping apiFetch for version history, version detail, version compare, and version restore composite routes — no generated client equivalent
import { apiFetch } from "@/app/lib/api";
import {
  kitchenRecipeCompositeRestore,
  kitchenRecipeVersionDetail,
  kitchenRecipeVersions,
  kitchenRecipeVersionsCompare,
} from "@/app/lib/routes";
import {
  getRecipeCost,
  type IngredientCostBreakdown,
  type RecipeCostBreakdown,
} from "@/app/lib/use-recipe-costing";
import { NutritionFactsPanel } from "@/components/nutrition-facts-panel";

interface RecipeDetailRow {
  category: string | null;
  cook_time_minutes: number | null;
  description: string | null;
  id: string;
  image_url: string | null;
  instructions: string | null;
  is_active: boolean;
  name: string;
  notes: string | null;
  prep_time_minutes: number | null;
  rest_time_minutes: number | null;
  tags: string[] | null;
  yield_quantity: number | null;
  yield_unit: string | null;
}

interface IngredientRow {
  id: string;
  name: string;
  notes: string | null;
  order_index: number;
  quantity: number;
  unit_code: string;
}

interface RecipeVersionRow {
  created_at: string;
  id: string;
  ingredient_count: number;
  step_count: number;
  version_number: number;
}

interface RecipeVersionDetail {
  category: string | null;
  createdAt: string;
  cuisineType: string | null;
  description: string | null;
  difficultyLevel: number | null;
  id: string;
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
  instructions: string | null;
  name: string;
  notes: string | null;
  recipeId: string;
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
  tags: string[];
  times: {
    prepMinutes: number | null;
    cookMinutes: number | null;
    restMinutes: number | null;
  };
  versionNumber: number;
  yield: {
    quantity: number;
    unitId: number;
    unit: string | null;
    description: string | null;
  };
}

interface RecipeVersionCompare {
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
}

// Step interface for display (matches database schema)
interface RecipeStepDisplay {
  duration_minutes: number | null;
  equipment_needed: string[] | null;
  image_url: string | null;
  instruction: string;
  step_number: number;
  temperature_unit: string | null;
  temperature_value: number | null;
  tips: string | null;
  video_url: string | null;
}

// HACCP Critical Control Point temperature thresholds (Fahrenheit)
const CCP_TEMP_THRESHOLDS = {
  min: 135, // Minimum safe hot holding temp
};

interface RecipeDetailTabsProps {
  ingredients: IngredientRow[];
  recipe: RecipeDetailRow;
  recipeVersionId: string | null;
  steps: RecipeStepDisplay[];
}

const formatMinutes = (minutes?: number | null) =>
  minutes && minutes > 0 ? `${minutes}m` : "-";

/** Format duration for display (e.g., "15 min" or "1h 30m") */
const formatDuration = (minutes: number | null): string | null => {
  if (!minutes || minutes <= 0) {
    return null;
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

/** Format temperature with unit */
const formatTemperature = (
  value: number | null,
  unit: string | null
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const displayUnit = unit === "C" ? "°C" : "°F";
  return `${value}${displayUnit}`;
};

/** Check if step is a Critical Control Point based on temperature */
const isCriticalControlPoint = (
  tempValue: number | null,
  tempUnit: string | null
): boolean => {
  if (tempValue === null || tempValue === undefined) {
    return false;
  }
  // Convert to Fahrenheit for comparison if needed
  const tempF = tempUnit === "C" ? (tempValue * 9) / 5 + 32 : tempValue;
  return tempF >= CCP_TEMP_THRESHOLDS.min;
};

/** Enhanced step card component with timer, temperature, equipment, and tips */
function StepCard({ step }: { step: RecipeStepDisplay }) {
  const [tipsOpen, setTipsOpen] = useState(false);
  const [tempVerified, setTempVerified] = useState(false);
  const hasDuration = step.duration_minutes && step.duration_minutes > 0;
  const hasTemp =
    step.temperature_value !== null && step.temperature_value !== undefined;
  const hasEquipment =
    step.equipment_needed && step.equipment_needed.length > 0;
  const hasTips = step.tips && step.tips.trim().length > 0;
  const isCCP = isCriticalControlPoint(
    step.temperature_value,
    step.temperature_unit
  );

  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        isCCP ? "border-amber-300" : ""
      }`}
      tone="canvas"
    >
      {/* CCP indicator bar at top */}
      {isCCP && (
        <div className="absolute top-0 left-0 h-full w-1 bg-amber-500" />
      )}

      <CardContent className="pt-6">
        {/* Step header */}
        <div className="flex items-start gap-4">
          {/* Step number badge */}
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold text-sm ${
              isCCP
                ? "bg-amber-500 text-white"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {step.step_number}
          </div>

          <div className="flex-1 space-y-3">
            {/* Metadata badges row */}
            <div className="flex flex-wrap items-center gap-2">
              {isCCP && (
                <Badge className="gap-1 bg-amber-500" variant="default">
                  <AlertTriangle className="h-3 w-3" />
                  CCP
                </Badge>
              )}
              {hasDuration && (
                <Badge className="gap-1" variant="secondary">
                  <Clock className="h-3 w-3" />
                  {formatDuration(step.duration_minutes)}
                </Badge>
              )}
              {hasTemp && (
                <Badge
                  className={`gap-1 ${isCCP ? "border-amber-900/20 bg-amber-900/10 text-amber-900" : ""}`}
                  variant={isCCP ? "outline" : "secondary"}
                >
                  <Thermometer className="h-3 w-3" />
                  {formatTemperature(
                    step.temperature_value,
                    step.temperature_unit
                  )}
                </Badge>
              )}
            </div>

            {/* Instruction text */}
            <p className="text-foreground leading-relaxed">
              {step.instruction}
            </p>

            {/* Equipment tags */}
            {hasEquipment && (
              <div className="flex flex-wrap gap-1.5">
                {step.equipment_needed!.map((eq) => (
                  <Badge className="gap-1 text-xs" key={eq} variant="outline">
                    <Wrench className="h-3 w-3" />
                    {eq}
                  </Badge>
                ))}
              </div>
            )}

            {/* Tips collapsible */}
            {hasTips && (
              <Collapsible onOpenChange={setTipsOpen} open={tipsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    className="gap-2 text-muted-foreground"
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Lightbulb className="h-4 w-4" />
                    {tipsOpen ? "Hide Tips" : "Show Tips"}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        tipsOpen ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="rounded-md bg-muted/50 p-3 text-muted-foreground text-sm">
                    {step.tips}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* CCP verification checkbox */}
            {isCCP && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-900/20 bg-amber-900/10 p-3">
                <button
                  className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                    tempVerified
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-amber-400"
                  }`}
                  onClick={() => setTempVerified(!tempVerified)}
                  type="button"
                >
                  {tempVerified && <CheckCircle2 className="h-3 w-3" />}
                </button>
                <span className="text-amber-900 text-sm">
                  Temperature verified:{" "}
                  {formatTemperature(
                    step.temperature_value,
                    step.temperature_unit
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
            <h3 className="mb-2 font-semibold text-lg">Costs not calculated</h3>
            <p className="text-muted-foreground text-sm">
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
              <div className="text-muted-foreground text-sm">Total Cost</div>
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
              <div className="text-muted-foreground text-sm">
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
              <div className="text-muted-foreground text-sm">
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
                    <div className="text-muted-foreground text-sm">
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
    const firstVersion = versions[0];
    if (!firstVersion) {
      return;
    }
    // Use functional updates to avoid needing compareFrom/compareTo in deps
    setCompareFrom((prev) => prev ?? firstVersion.id);
    setCompareTo((prev) => prev ?? versions[1]?.id ?? firstVersion.id);
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

  const handleRestore = () => {
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
        const response = await apiFetch(
          kitchenRecipeCompositeRestore(recipeId),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceVersionId: viewingDetail.id }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to restore version");
        }

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
            <h3 className="mb-2 font-semibold text-lg">No versions yet</h3>
            <p className="text-muted-foreground text-sm">
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
                  <div className="mt-1 text-muted-foreground text-sm">
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
                {viewingDetail?.tags?.length > 0 && (
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
                  {viewingDetail.steps?.map((step) => (
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
                <p className="font-medium text-muted-foreground text-sm">
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
                <p className="font-medium text-muted-foreground text-sm">To</p>
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
              <p className="text-destructive text-sm">{compareError}</p>
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
  steps,
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

  const hasCostData = Boolean(
    costData && (costData.ingredients?.length ?? 0) > 0
  );

  return (
    <Tabs className="w-full" defaultValue="overview">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
        <TabsTrigger value="steps">Steps</TabsTrigger>
        <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
        <TabsTrigger value="costing">Costing</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent className="space-y-4" value="overview">
        {/* Status and Category Header */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  recipe.is_active
                    ? "border-[var(--brand-leafy-green)]/30 bg-[var(--brand-leafy-green)]/20 text-[var(--brand-leafy-green)]"
                    : ""
                }
                variant={recipe.is_active ? "default" : "secondary"}
              >
                {recipe.is_active ? "Active" : "Inactive"}
              </Badge>
              {recipe.category && (
                <Badge className="border-0 bg-[var(--brand-avocado-mash)]/20 text-[var(--brand-leafy-green)]">
                  {recipe.category}
                </Badge>
              )}
            </div>
            {recipe.description && (
              <p className="mt-3 text-muted-foreground">{recipe.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Grouped Info Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Timing Card */}
          <Card
            className="border-l-4 border-l-[var(--brand-golden-zest)]"
            tone="canvas"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                <Clock className="h-4 w-4 text-[var(--brand-golden-zest)]" />
                Timing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">
                    Prep
                  </div>
                  <div className="font-semibold text-foreground text-lg">
                    {formatMinutes(recipe.prep_time_minutes)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">
                    Cook
                  </div>
                  <div className="font-semibold text-foreground text-lg">
                    {formatMinutes(recipe.cook_time_minutes)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">
                    Rest
                  </div>
                  <div className="font-semibold text-foreground text-lg">
                    {formatMinutes(recipe.rest_time_minutes)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Yield Card */}
          <Card
            className="border-l-4 border-l-[var(--brand-leafy-green)]"
            tone="canvas"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                <Users className="h-4 w-4 text-[var(--brand-leafy-green)]" />
                Yield
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl text-[var(--brand-leafy-green)]">
                {recipe.yield_quantity ?? "-"}{" "}
                <span className="font-normal text-base text-muted-foreground">
                  {recipe.yield_unit ?? ""}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tags Card */}
        {(recipe?.tags?.filter((t) => t.toLowerCase() !== "imported")?.length ??
          0) > 0 && (
          <Card
            className="border-l-4 border-l-[var(--brand-spiced-orange)]"
            tone="canvas"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                <ChefHat className="h-4 w-4 text-[var(--brand-spiced-orange)]" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(recipe.tags ?? [])
                  .filter((t) => t.toLowerCase() !== "imported")
                  .map((tag) => (
                    <Badge
                      className="border-0 bg-[var(--brand-avocado-mash)]/20 text-[var(--brand-leafy-green)]"
                      key={tag}
                    >
                      {tag}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes Card */}
        {recipe.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-muted-foreground text-sm">
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {recipe.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent className="space-y-4" value="ingredients">
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            {(ingredients?.length ?? 0) === 0 ? (
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Instructions</CardTitle>
            {steps?.length > 0 && (
              <div className="flex items-center gap-4 text-muted-foreground text-sm">
                {/* Total duration badge */}
                {steps?.some((s) => s.duration_minutes) && (
                  <Badge className="gap-1" variant="outline">
                    <Clock className="h-3 w-3" />
                    Total:{" "}
                    {formatDuration(
                      steps.reduce(
                        (sum, s) => sum + (s.duration_minutes ?? 0),
                        0
                      )
                    )}
                  </Badge>
                )}
                {/* CCP count */}
                {steps?.some((s) =>
                  isCriticalControlPoint(
                    s.temperature_value,
                    s.temperature_unit
                  )
                ) && (
                  <Badge className="gap-1 bg-amber-500" variant="default">
                    <AlertTriangle className="h-3 w-3" />
                    {
                      steps?.filter((s) =>
                        isCriticalControlPoint(
                          s.temperature_value,
                          s.temperature_unit
                        )
                      ).length
                    }{" "}
                    CCP
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {steps?.length > 0 ? (
              <div className="space-y-4">
                {steps?.map((step) => (
                  <StepCard key={step.step_number} step={step} />
                ))}
              </div>
            ) : recipe.instructions ? (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{recipe.instructions}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ChefHat className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 font-semibold text-lg">No steps yet</h3>
                <p className="text-muted-foreground text-sm">
                  Add steps to your recipe for detailed instructions.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent className="space-y-4" value="nutrition">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Apple className="h-5 w-5" />
              Nutrition Facts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm">
              <NutritionFactsPanel
                calories={0}
                carbs={0}
                fat={0}
                protein={0}
                servingSize={`${recipe.yield_quantity ?? 1} ${recipe.yield_unit ?? "serving"}`}
                servingsPerContainer={recipe.yield_quantity ?? 1}
                sodium={0}
              />
            </div>
            <p className="mt-4 text-muted-foreground text-sm">
              Nutrition data will be calculated automatically from ingredient
              nutritional information when available.
            </p>
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
