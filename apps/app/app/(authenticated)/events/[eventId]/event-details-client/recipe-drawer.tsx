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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDish: EventDishSummary | null;
  selectedRecipe: RecipeDetailSummary | null;
  selectedScaledIngredients: Array<
    RecipeDetailSummary["ingredients"][number] & { scaledQuantity: number }
  >;
  drawerMode: DrawerMode;
  onDrawerModeChange: (mode: DrawerMode) => void;
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
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-foreground">
            {selectedDish?.name ?? "Recipe details"}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
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
              <Link href={`/inventory/recipes/${selectedRecipe.versionId}`}>
                Open recipe
              </Link>
            ) : (
              <span>Open recipe</span>
            )}
          </Button>
        </div>
        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-4 pb-6 pt-2">
          {selectedRecipe ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Prep time</div>
                  <div className="font-semibold">
                    {selectedRecipe.prepTimeMinutes ?? 0}m
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Cook time</div>
                  <div className="font-semibold">
                    {selectedRecipe.cookTimeMinutes ?? 0}m
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Rest time</div>
                  <div className="font-semibold">
                    {selectedRecipe.restTimeMinutes ?? 0}m
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Yield</div>
                  <div className="font-semibold">
                    {selectedRecipe.yieldQuantity}{" "}
                    {selectedRecipe.yieldUnitCode ?? "servings"}
                  </div>
                </div>
              </div>

              {drawerMode === "ingredients" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Ingredients</h3>
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
                            <p className="text-xs text-muted-foreground">
                              {ingredient.preparationNotes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                  <h3 className="text-lg font-semibold">Instructions</h3>
                  {selectedRecipe.steps.length > 0 ? (
                    <ol className="space-y-4">
                      {selectedRecipe.steps.map((step) => (
                        <li
                          className="rounded-2xl border border-border/70 bg-card/60 p-4"
                          key={`${step.stepNumber}-${step.instruction}`}
                        >
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Step {step.stepNumber}</span>
                            {step.durationMinutes && (
                              <span>{step.durationMinutes}m</span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-foreground">
                            {step.instruction}
                          </p>
                          {step.equipmentNeeded.length > 0 && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Equipment: {step.equipmentNeeded.join(", ")}
                            </p>
                          )}
                          {step.tips && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Tip: {step.tips}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : selectedRecipe.instructions ? (
                    <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-sm text-foreground">
                      <p className="whitespace-pre-line">
                        {selectedRecipe.instructions}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No instructions available.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No recipe linked to this dish yet.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
