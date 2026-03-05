"use client";

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
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import {
  Field,
  FieldControl,
  FieldLabel,
  FieldMessage,
} from "@repo/design-system/components/ui/field";
import { Switch } from "@repo/design-system/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { ArrowRight, Calculator, Scale, Users } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";

interface ScaledIngredient {
  ingredientId: string;
  ingredientName: string;
  originalQuantity: number;
  originalUnitCode: string;
  scaledQuantity: number;
  scaledUnitCode: string;
  category: string | null;
  scaledCost: number;
}

interface ScaledRecipe {
  recipeVersionId: string;
  recipeName: string;
  originalYieldQuantity: number;
  originalYieldUnitCode: string;
  targetYieldQuantity: number;
  targetYieldUnitCode: string;
  scaleFactor: number;
  ingredients: ScaledIngredient[];
  originalTotalCost: number;
  scaledTotalCost: number;
  scaledCostPerYield: number;
}

interface StationPrepList {
  stationId: string;
  stationName: string;
  ingredients: ScaledIngredient[];
}

interface ScaleRecipeResponse {
  scaledRecipe: ScaledRecipe;
  prepList?: StationPrepList[];
}

interface RecipeScalingDialogProps {
  recipeVersionId: string;
  recipeName: string;
  currentYield: number;
  currentYieldUnit: string;
}

const SCALE_PRESETS = [0.5, 0.75, 1, 1.5, 2, 3, 4] as const;

export function RecipeScalingDialog({
  recipeVersionId,
  recipeName,
  currentYield,
  currentYieldUnit,
}: RecipeScalingDialogProps) {
  const [open, setOpen] = useState(false);
  const [targetYield, setTargetYield] = useState(currentYield.toString());
  const [convertToSystem, setConvertToSystem] = useState<
    "metric" | "imperial" | null
  >(null);
  const [generatePrepList, setGeneratePrepList] = useState(false);

  const [scaleState, scaleAction, isScaling] = useActionState(
    async (_: ScaleRecipeResponse | null, formData: FormData) => {
      const targetYieldQuantity = Number.parseFloat(
        formData.get("targetYield") as string
      );
      const targetYieldUnitId = formData.get("targetYieldUnitId")
        ? Number.parseInt(formData.get("targetYieldUnitId") as string)
        : undefined;
      const convertSystem = formData.get("convertToSystem") as
        | "metric"
        | "imperial"
        | null;
      const generateList = formData.get("generatePrepList") === "true";

      if (!targetYieldQuantity || targetYieldQuantity <= 0) {
        toast.error("Please enter a valid target yield");
        return null;
      }

      try {
        const response = await fetch(
          `/api/kitchen/recipes/${recipeVersionId}/scale-full`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              targetYieldQuantity,
              targetYieldUnitId,
              convertToSystem: convertSystem || undefined,
              generatePrepList: generateList,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to scale recipe");
        }

        const data = (await response.json()) as { data: ScaleRecipeResponse };
        toast.success("Recipe scaled successfully");
        return data.data;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to scale recipe";
        toast.error(message);
        return null;
      }
    },
    null
  );

  const handlePresetClick = (multiplier: number) => {
    setTargetYield((currentYield * multiplier).toString());
  };

  const handleScale = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("convertToSystem", convertToSystem || "");
    formData.append("generatePrepList", generatePrepList ? "true" : "false");
    scaleAction(new FormData(e.currentTarget));
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Scale className="mr-2 h-4 w-4" />
          Scale Recipe
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Scale Recipe: {recipeName}
          </DialogTitle>
          <DialogDescription>
            Scale ingredients by yield and convert between measurement systems
          </DialogDescription>
        </DialogHeader>

        <form id="scale-form" onSubmit={handleScale}>
          <Tabs className="w-full" defaultValue="settings">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings">Scale Settings</TabsTrigger>
              <TabsTrigger disabled={!scaleState} value="ingredients">
                Scaled Ingredients
              </TabsTrigger>
              <TabsTrigger disabled={!scaleState?.prepList} value="prep-list">
                Prep List
              </TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-6" value="settings">
              {/* Current Recipe Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Recipe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Yield:</span>
                    <span className="font-medium">
                      {currentYield} {currentYieldUnit}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Scale Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scaling Options</CardTitle>
                  <CardDescription>
                    Set your target yield and measurement system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Quick Scale Presets */}
                  <div className="space-y-3">
                    <FieldLabel>Quick Scale</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {SCALE_PRESETS.map((preset) => (
                        <Button
                          className="min-w-[60px]"
                          key={preset}
                          onClick={() => handlePresetClick(preset)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {preset}x
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Target Yield Input */}
                  <Field>
                    <FieldLabel htmlFor="targetYield">Target Yield</FieldLabel>
                    <FieldControl
                      className="w-full"
                      id="targetYield"
                      min="0.1"
                      name="targetYield"
                      onChange={(e) => setTargetYield(e.target.value)}
                      placeholder="Enter target yield quantity"
                      required
                      step="0.1"
                      type="number"
                      value={targetYield}
                    />
                    <FieldMessage>
                      Original: {currentYield} {currentYieldUnit}
                    </FieldMessage>
                  </Field>

                  {/* Measurement System Conversion */}
                  <div className="space-y-3">
                    <FieldLabel>Convert Measurement System</FieldLabel>
                    <div className="flex gap-4">
                      <Button
                        className="flex-1"
                        onClick={() => setConvertToSystem("metric")}
                        type="button"
                        variant={
                          convertToSystem === "metric" ? "default" : "outline"
                        }
                      >
                        Metric (g, ml, L)
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => setConvertToSystem("imperial")}
                        type="button"
                        variant={
                          convertToSystem === "imperial" ? "default" : "outline"
                        }
                      >
                        Imperial (oz, cup)
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => setConvertToSystem(null)}
                        type="button"
                        variant={
                          convertToSystem === null ? "default" : "outline"
                        }
                      >
                        Keep Original
                      </Button>
                    </div>
                  </div>

                  {/* Prep List Generation */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FieldLabel htmlFor="generatePrepList">
                        Generate Prep List
                      </FieldLabel>
                      <p className="text-sm text-muted-foreground">
                        Group scaled ingredients by station
                      </p>
                    </div>
                    <Switch
                      checked={generatePrepList}
                      id="generatePrepList"
                      onCheckedChange={setGeneratePrepList}
                    />
                  </div>

                  {/* Scale Factor Preview */}
                  {targetYield && (
                    <div className="rounded-lg bg-muted p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Scale Factor:
                        </span>
                        <span className="text-lg font-bold">
                          {(
                            (Number.parseFloat(targetYield) / currentYield) *
                            100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ingredients">
              {scaleState ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Scaled Ingredients</CardTitle>
                    <CardDescription>
                      {scaleState.scaledRecipe.originalYieldQuantity}{" "}
                      {scaleState.scaledRecipe.originalYieldUnitCode} →{" "}
                      {scaleState.scaledRecipe.targetYieldQuantity}{" "}
                      {scaleState.scaledRecipe.targetYieldUnitCode}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingredient</TableHead>
                          <TableHead className="text-right">Original</TableHead>
                          <TableHead />
                          <TableHead className="text-right">Scaled</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scaleState.scaledRecipe.ingredients.map(
                          (ingredient) => (
                            <TableRow key={ingredient.ingredientId}>
                              <TableCell className="font-medium">
                                {ingredient.ingredientName}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {ingredient.originalQuantity}{" "}
                                {ingredient.originalUnitCode}
                              </TableCell>
                              <TableCell>
                                <ArrowRight className="mx-auto h-4 w-4 text-muted-foreground" />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {ingredient.scaledQuantity}{" "}
                                {ingredient.scaledUnitCode}
                              </TableCell>
                              <TableCell className="text-right">
                                ${ingredient.scaledCost.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>

                    {/* Cost Summary */}
                    <div className="mt-6 rounded-lg bg-muted p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Original Total Cost
                          </p>
                          <p className="text-xl font-bold">
                            $
                            {scaleState.scaledRecipe.originalTotalCost.toFixed(
                              2
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Scaled Total Cost
                          </p>
                          <p className="text-xl font-bold">
                            $
                            {scaleState.scaledRecipe.scaledTotalCost.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Original Cost/Yield
                          </p>
                          <p className="text-lg font-medium">
                            $
                            {scaleState.scaledRecipe.scaledCostPerYield.toFixed(
                              2
                            )}{" "}
                            / {scaleState.scaledRecipe.originalYieldUnitCode}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Scale Factor
                          </p>
                          <p className="text-lg font-medium">
                            {(
                              scaleState.scaledRecipe.scaleFactor * 100
                            ).toFixed(0)}
                            %
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex min-h-[200px] items-center justify-center">
                    <p className="text-muted-foreground">
                      Scale the recipe to see ingredient adjustments
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="prep-list">
              {scaleState?.prepList ? (
                <div className="space-y-4">
                  {scaleState.prepList.map((station) => (
                    <Card key={station.stationId}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          {station.stationName}
                        </CardTitle>
                        <CardDescription>
                          {station.ingredients.length} ingredient
                          {station.ingredients.length !== 1 ? "s" : ""}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ingredient</TableHead>
                              <TableHead className="text-right">
                                Quantity
                              </TableHead>
                              <TableHead className="text-right">Cost</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {station.ingredients.map((ingredient) => (
                              <TableRow key={ingredient.ingredientId}>
                                <TableCell className="font-medium">
                                  {ingredient.ingredientName}
                                </TableCell>
                                <TableCell className="text-right">
                                  {ingredient.scaledQuantity}{" "}
                                  {ingredient.scaledUnitCode}
                                </TableCell>
                                <TableCell className="text-right">
                                  ${ingredient.scaledCost.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex min-h-[200px] items-center justify-center">
                    <p className="text-muted-foreground">
                      Enable prep list generation and scale the recipe to see
                      station assignments
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </form>

        <DialogFooter>
          <Button
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            Close
          </Button>
          <Button
            disabled={isScaling || !targetYield}
            form="scale-form"
            type="submit"
          >
            {isScaling ? "Scaling..." : "Scale Recipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
