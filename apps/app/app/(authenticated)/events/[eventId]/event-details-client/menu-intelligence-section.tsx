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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { Progress } from "@repo/design-system/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { cn } from "@repo/design-system/lib/utils";
import {
  ChefHatIcon,
  ChevronRightIcon,
  ClipboardCopyIcon,
  ListIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MenuDishesSection } from "../event-details-sections";
import type {
  EventDishSummary,
  InventoryCoverageItem,
  RecipeDetailSummary,
} from "../event-details-types";
import { normalizeMenuTab } from "./menu-tab-utils";
import { formatCurrency } from "./utils";

type DrawerMode = "instructions" | "ingredients";

interface DishRow {
  dish: EventDishSummary;
  recipe: RecipeDetailSummary | null;
  scaledIngredients: Array<
    RecipeDetailSummary["ingredients"][number] & { scaledQuantity: number }
  >;
}

interface MenuIntelligenceSectionProps {
  dishRows: DishRow[];
  aggregatedIngredients: Array<{
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unitCode: string | null;
    isOptional: boolean;
    sources: string[];
  }>;
  inventoryByIngredient: Map<string, InventoryCoverageItem>;
  menuDishRows: Array<{
    link_id: string;
    dish_id: string;
    name: string;
    category: string | null;
    recipe_name: string | null;
    course: string | null;
    quantity_servings: number;
    dietary_tags: string[];
  }>;
  availableDishes: Array<{
    id: string;
    name: string;
    category: string | null;
    recipe_name: string | null;
  }>;
  isLoadingDishes: boolean;
  showAddDishDialog: boolean;
  selectedDishIdForAdd: string;
  selectedCourse: string;
  // Handlers
  onOpenRecipeDrawer: (
    recipeId: string,
    dishId: string,
    mode: DrawerMode
  ) => void;
  onAddDish: () => void;
  onRemoveDish: (linkId: string) => void;
  onOpenVariantDialog: (linkId: string, name: string) => void;
  onShowAddDialogChange: (open: boolean) => void;
  onSelectedDishIdChange: (id: string) => void;
  onSelectedCourseChange: (course: string) => void;
  onOpenGenerateModal?: () => void;
}

export function MenuIntelligenceSection({
  dishRows,
  aggregatedIngredients,
  inventoryByIngredient,
  menuDishRows,
  availableDishes,
  isLoadingDishes,
  showAddDishDialog,
  selectedDishIdForAdd,
  selectedCourse,
  onOpenRecipeDrawer,
  onAddDish,
  onRemoveDish,
  onOpenVariantDialog,
  onShowAddDialogChange,
  onSelectedDishIdChange,
  onSelectedCourseChange,
}: MenuIntelligenceSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeMenuTab, setActiveMenuTab] = useState(() =>
    normalizeMenuTab(searchParams?.get("menuTab") ?? null)
  );

  const currentSearchParams = useMemo(
    () => new URLSearchParams(searchParams?.toString() ?? ""),
    [searchParams]
  );

  useEffect(() => {
    const queryTab = normalizeMenuTab(searchParams?.get("menuTab") ?? null);
    setActiveMenuTab((previousTab) =>
      previousTab === queryTab ? previousTab : queryTab
    );
  }, [searchParams]);

  const handleMenuTabChange = (value: string) => {
    const nextTab = normalizeMenuTab(value);
    setActiveMenuTab(nextTab);

    if (!pathname) {
      return;
    }

    const nextSearchParams = new URLSearchParams(currentSearchParams);
    if (nextTab === "dishes") {
      nextSearchParams.delete("menuTab");
    } else {
      nextSearchParams.set("menuTab", nextTab);
    }

    const query = nextSearchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  return (
    <section id="recipes">
      <div className="mb-4 flex items-center gap-2">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Menu Intelligence
        </p>
      </div>
      <Tabs
        className="space-y-4"
        onValueChange={handleMenuTabChange}
        value={activeMenuTab}
      >
        <TabsList>
          <TabsTrigger value="dishes">Dishes</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="dishes">
          <MenuDishesSection
            availableDishes={availableDishes}
            eventDishes={menuDishRows}
            isLoading={isLoadingDishes}
            onAddDish={onAddDish}
            onOpenVariantDialog={onOpenVariantDialog}
            onRemoveDish={onRemoveDish}
            onSelectedCourseChange={onSelectedCourseChange}
            onSelectedDishIdChange={onSelectedDishIdChange}
            onShowAddDialogChange={onShowAddDialogChange}
            selectedCourse={selectedCourse}
            selectedDishId={selectedDishIdForAdd}
            showAddDialog={showAddDishDialog}
          />
        </TabsContent>

        <TabsContent className="space-y-6" value="recipes">
          <Card className="border-border/60 bg-card/70 text-foreground">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ChefHatIcon className="size-5 text-warning" />
                Recipe intelligence
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Recipes, yields, and ingredient summaries for linked dishes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dishRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No dishes linked yet.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Link dishes from the Dishes tab first.
                  </p>
                </div>
              ) : (
                dishRows.map((row, index) => (
                  <div
                    className="group rounded-2xl border border-border/70 bg-muted/40 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-success/40"
                    key={`${row.dish.dishId}-${index}`}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                          {row.dish.course ?? "Course not set"}
                        </p>
                        <p className="text-lg font-semibold">{row.dish.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.dish.recipeName ?? "Recipe not linked"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="sm" variant="outline">
                              <ClipboardCopyIcon className="mr-2 size-3" />
                              Ingredients
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            className="w-72 border-border bg-muted text-foreground"
                          >
                            {row.recipe ? (
                              <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold">
                                    {row.recipe.recipeName}
                                  </span>
                                  <Badge
                                    className="border-border/70 bg-card/70 text-foreground"
                                    variant="outline"
                                  >
                                    {row.recipe.ingredients.length} ingredients
                                  </Badge>
                                </div>
                                <div className="max-h-56 space-y-2 overflow-y-auto pr-1 text-xs">
                                  {row.scaledIngredients.map((ingredient) => (
                                    <div
                                      className="flex items-start justify-between gap-3"
                                      key={ingredient.ingredientId}
                                    >
                                      <span>{ingredient.ingredientName}</span>
                                      <span className="text-muted-foreground">
                                        {ingredient.scaledQuantity}{" "}
                                        {ingredient.unitCode ?? ""}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                  <span>
                                    Yield: {row.recipe.yieldQuantity}{" "}
                                    {row.recipe.yieldUnitCode ?? "servings"}
                                  </span>
                                  {row.recipe.versionId ? (
                                    <Link
                                      className="text-success hover:text-success/80"
                                      href={`/inventory/recipe-costs/${row.recipe.versionId}`}
                                    >
                                      View recipe
                                    </Link>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No recipe linked yet.
                              </p>
                            )}
                          </PopoverContent>
                        </Popover>
                        <Button
                          disabled={!row.recipe}
                          onClick={() =>
                            row.recipe &&
                            onOpenRecipeDrawer(
                              row.recipe.recipeId,
                              row.dish.dishId,
                              "instructions"
                            )
                          }
                          size="sm"
                          variant="secondary"
                        >
                          <ChevronRightIcon className="mr-2 size-3" />
                          Instructions
                        </Button>
                        <Button
                          disabled={!row.recipe}
                          onClick={() =>
                            row.recipe &&
                            onOpenRecipeDrawer(
                              row.recipe.recipeId,
                              row.dish.dishId,
                              "ingredients"
                            )
                          }
                          size="sm"
                          variant="outline"
                        >
                          <ListIcon className="mr-2 size-3" />
                          Full ingredients
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        className="border-border/70 bg-card/70"
                        variant="outline"
                      >
                        {row.dish.quantityServings} servings
                      </Badge>
                      {row.dish.pricePerPerson !== null && (
                        <Badge
                          className="border-success/40 bg-success/10 text-success"
                          variant="outline"
                        >
                          Price {formatCurrency(row.dish.pricePerPerson)} /
                          person
                        </Badge>
                      )}
                      {row.dish.costPerPerson !== null && (
                        <Badge
                          className="border-warning/40 bg-warning/10 text-warning"
                          variant="outline"
                        >
                          Cost {formatCurrency(row.dish.costPerPerson)} / person
                        </Badge>
                      )}
                      {row.dish.dietaryTags.map((tag) => (
                        <Badge
                          className="border-border/70 bg-card/70 text-foreground"
                          key={tag}
                          variant="outline"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {row.recipe && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
                        <span>
                          Prep: {row.recipe.prepTimeMinutes ?? 0}m • Cook:{" "}
                          {row.recipe.cookTimeMinutes ?? 0}m • Rest:{" "}
                          {row.recipe.restTimeMinutes ?? 0}m
                        </span>
                        <span>
                          Yield {row.recipe.yieldQuantity}{" "}
                          {row.recipe.yieldUnitCode ?? "servings"}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70 text-foreground">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCopyIcon className="size-5 text-info" />
                Ingredient coverage
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Consolidated ingredient list mapped against inventory levels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {aggregatedIngredients.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No ingredients yet.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Link recipes to see ingredient coverage.
                  </p>
                </div>
              ) : (
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {aggregatedIngredients.map((ingredient) => {
                    const inventory = inventoryByIngredient.get(
                      ingredient.ingredientId
                    );
                    const unitMatch =
                      ingredient.unitCode &&
                      inventory?.onHandUnitCode &&
                      ingredient.unitCode === inventory.onHandUnitCode;
                    const requiredLabel = `${ingredient.quantity} ${ingredient.unitCode ?? ""}`;
                    const onHandLabel =
                      inventory && inventory.onHand !== null
                        ? `${inventory.onHand} ${inventory.onHandUnitCode ?? ""}`
                        : "Not tracked";
                    const coverageRatio =
                      unitMatch &&
                      inventory &&
                      inventory.onHand !== null &&
                      ingredient.quantity > 0
                        ? Math.min(
                            (inventory.onHand / ingredient.quantity) * 100,
                            100
                          )
                        : null;
                    const isLow =
                      inventory &&
                      inventory.onHand !== null &&
                      inventory.parLevel !== null &&
                      inventory.onHand < inventory.parLevel;
                    const isShort =
                      unitMatch &&
                      inventory?.onHand !== null &&
                      ingredient.quantity > 0 &&
                      inventory.onHand < ingredient.quantity;

                    return (
                      <div
                        className="rounded-2xl border border-border/70 bg-muted/40 p-4"
                        key={ingredient.ingredientId}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {ingredient.ingredientName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Required: {requiredLabel}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              On hand: {onHandLabel}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 text-xs">
                            {inventory ? (
                              <Badge
                                className={cn(
                                  "border",
                                  isShort || isLow
                                    ? "border-destructive/40 bg-destructive/20 text-destructive"
                                    : "border-success/40 bg-success/10 text-success"
                                )}
                                variant="outline"
                              >
                                {isShort
                                  ? "Short"
                                  : isLow
                                    ? "Low stock"
                                    : "Covered"}
                              </Badge>
                            ) : (
                              <Badge
                                className="border-border/60 bg-card/70 text-foreground"
                                variant="outline"
                              >
                                Not tracked
                              </Badge>
                            )}
                            {ingredient.isOptional && (
                              <Badge
                                className="border-border/60 bg-card/70 text-foreground"
                                variant="outline"
                              >
                                Optional
                              </Badge>
                            )}
                          </div>
                        </div>
                        {coverageRatio !== null && (
                          <Progress className="mt-3" value={coverageRatio} />
                        )}
                        {ingredient.sources.length > 0 && (
                          <p className="mt-2 text-[11px] text-foreground/70">
                            Used in {ingredient.sources.join(", ")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
