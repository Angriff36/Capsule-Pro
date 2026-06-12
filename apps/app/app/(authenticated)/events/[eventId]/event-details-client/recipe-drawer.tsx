"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@repo/design-system/components/ui/sheet";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@repo/design-system/components/ui/toggle-group";
import Link from "next/link";
import type {
  EventDishSummary,
  RecipeDetailSummary,
} from "../event-details-types";

type DrawerMode = "instructions" | "ingredients";

interface RecipeDrawerProps {
  drawerMode: DrawerMode;
  onDrawerModeChange: (mode: DrawerMode) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  selectedDish: EventDishSummary | null;
  selectedRecipe: RecipeDetailSummary | null;
  selectedScaledIngredients: Array<
    RecipeDetailSummary["ingredients"][number] & { scaledQuantity: number }
  >;
}

export function RecipeDrawer({
  open,
  onOpenChange,
  selectedDish,
  selectedRecipe,
  selectedScaledIngredients,
  drawerMode,
  onDrawerModeChange,
}: RecipeDrawerProps) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="border-border bg-muted text-foreground sm:max-w-2xl lg:max-w-4xl"
        side="right"
      >
        <SheetHeader className="border-border border-b pb-4">
          <SheetTitle className="text-foreground">
            {selectedDish?.name ?? "Recipe details"}
          </SheetTitle>
          <p className="text-muted-foreground text-xs">
            {selectedRecipe?.recipeName ?? "Recipe not linked"}
          </p>
        </SheetHeader>
        <div className="flex flex-wrap items-center gap-2 px-4">
          <ToggleGroup
            className="rounded-full border border-border/70 bg-card/60"
            onValueChange={(value) => {
              if (value) {
                onDrawerModeChange(value as DrawerMode);
              }
            }}
            type="single"
            value={drawerMode}
          >
            <ToggleGroupItem value="instructions">Instructions</ToggleGroupItem>
            <ToggleGroupItem value="ingredients">Ingredients</ToggleGroupItem>
          </ToggleGroup>
          <Button
            asChild
            disabled={!selectedRecipe?.versionId}
            size="sm"
            variant="outline"
          >
            {selectedRecipe?.versionId ? (
              <Link
                href={`/inventory/recipe-costs/${selectedRecipe.versionId}`}
              >
                Open recipe
              </Link>
            ) : (
              <span>Open recipe</span>
            )}
          </Button>
        </div>
        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-4 pt-2 pb-6">
          {selectedRecipe ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
                  <div className="text-muted-foreground text-xs">Prep time</div>
                  <div className="font-semibold">
                    {selectedRecipe.prepTimeMinutes ?? 0}m
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
                  <div className="text-muted-foreground text-xs">Cook time</div>
                  <div className="font-semibold">
                    {selectedRecipe.cookTimeMinutes ?? 0}m
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
                  <div className="text-muted-foreground text-xs">Rest time</div>
                  <div className="font-semibold">
                    {selectedRecipe.restTimeMinutes ?? 0}m
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
                  <div className="text-muted-foreground text-xs">Yield</div>
                  <div className="font-semibold">
                    {selectedRecipe.yieldQuantity}{" "}
                    {selectedRecipe.yieldUnitCode ?? "servings"}
                  </div>
                </div>
              </div>

              {drawerMode === "ingredients" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Ingredients</h3>
                    <Badge
                      className="border-border/70 bg-card/60 text-foreground"
                      variant="outline"
                    >
                      {selectedScaledIngredients.length} items
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {selectedScaledIngredients.map((ingredient) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-sm"
                        key={ingredient.ingredientId}
                      >
                        <div>
                          <p className="font-medium">
                            {ingredient.ingredientName}
                          </p>
                          {ingredient.preparationNotes && (
                            <p className="text-muted-foreground text-xs">
                              {ingredient.preparationNotes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <span>
                            {ingredient.scaledQuantity}{" "}
                            {ingredient.unitCode ?? ""}
                          </span>
                          {ingredient.isOptional && (
                            <Badge
                              className="border-border/70 bg-muted/40 text-foreground"
                              variant="outline"
                            >
                              Optional
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Instructions</h3>
                  {selectedRecipe.steps.length > 0 ? (
                    <ol className="space-y-4">
                      {selectedRecipe.steps.map((step) => (
                        <li
                          className="rounded-2xl border border-border/70 bg-card/60 p-4"
                          key={`${step.stepNumber}-${step.instruction}`}
                        >
                          <div className="flex items-center justify-between text-muted-foreground text-xs">
                            <span>Step {step.stepNumber}</span>
                            {step.durationMinutes && (
                              <span>{step.durationMinutes}m</span>
                            )}
                          </div>
                          <p className="mt-2 text-foreground text-sm">
                            {step.instruction}
                          </p>
                          {step.equipmentNeeded.length > 0 && (
                            <p className="mt-2 text-muted-foreground text-xs">
                              Equipment: {step.equipmentNeeded.join(", ")}
                            </p>
                          )}
                          {step.tips && (
                            <p className="mt-2 text-muted-foreground text-xs">
                              Tip: {step.tips}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : selectedRecipe.instructions ? (
                    <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-foreground text-sm">
                      <p className="whitespace-pre-line">
                        {selectedRecipe.instructions}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No instructions available.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-border/70 border-dashed p-8 text-center">
              <p className="text-muted-foreground text-sm">
                No recipe linked to this dish yet.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
