"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@repo/design-system/components/ui/sheet";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import { apiFetch } from "@/app/lib/api";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  DollarSign,
  GripVertical,
  Info,
  Link as LinkIcon,
  Plus,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
// Auth handled at page level via server components
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  kitchenRecipeVersionDetail,
  kitchenRecipesSearch,
} from "@/app/lib/routes";

interface IngredientRow {
  id: string;
  ingredientId: string | null;
  name: string;
  quantity: string;
  unit: string;
  unitId: number | null;
  preparationNotes: string;
  isOptional: boolean;
  isSubRecipe: boolean;
  subRecipeId: string | null;
  subRecipeName: string | null;
  sortOrder: number;
  costPerIngredient: number;
  hasCostData: boolean;
}

interface CostBreakdown {
  totalCost: number;
  costPerYield: number;
  costPerServing: number;
  foodCostPercentage: number | null;
  targetPrice: number | null;
  ingredients: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    cost: number;
    hasInventoryItem: boolean;
    wasteFactor: number;
  }[];
}

interface RichRecipeEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: {
    id?: string;
    name?: string;
    category?: string;
    description?: string;
    tags?: string[];
    ingredients?: IngredientRow[];
    yieldQuantity?: number;
    yieldUnit?: string;
    yieldUnitId?: number;
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    restTimeMinutes?: number;
    difficultyLevel?: number;
    notes?: string;
  };
  onSave: (data: FormData) => Promise<void>;
}

const categoryOptions = [
  "Appetizer",
  "Main Course",
  "Side Dish",
  "Dessert",
  "Beverage",
  "Sauce",
  "Base",
  "Other",
] as const;

const commonUnits = [
  { code: "g", label: "Grams" },
  { code: "kg", label: "Kilograms" },
  { code: "ml", label: "Milliliters" },
  { code: "l", label: "Liters" },
  { code: "oz", label: "Ounces" },
  { code: "lb", label: "Pounds" },
  { code: "cup", label: "Cups" },
  { code: "tbsp", label: "Tablespoons" },
  { code: "tsp", label: "Teaspoons" },
  { code: "piece", label: "Pieces" },
  { code: "unit", label: "Units" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

function IngredientRowItem({
  ingredient,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onSearchIngredients,
  onSearchRecipes,
  isSearching,
}: {
  ingredient: IngredientRow;
  index: number;
  onUpdate: (index: number, field: keyof IngredientRow, value: string | boolean) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onSearchIngredients: (query: string) => Promise<string[]>;
  onSearchRecipes: (query: string) => Promise<Array<{ id: string; name: string }>>;
  isSearching: boolean;
}) {
  const [showNameSearch, setShowNameSearch] = useState(false);
  const [nameResults, setNameResults] = useState<Array<{ id: string; name: string; isSubRecipe?: boolean }>>([]);
  const [nameInput, setNameInput] = useState(ingredient.name);
  const [costTooltipOpen, setCostTooltipOpen] = useState(false);

  const handleNameChange = async (value: string) => {
    setNameInput(value);
    onUpdate(index, "name", value);

    if (value.length >= 2) {
      try {
        const [ingredients, recipes] = await Promise.all([
          onSearchIngredients(value),
          onSearchRecipes(value),
        ]);

        const results = [
          ...ingredients.map((name) => ({ id: `ing-${name}`, name, isSubRecipe: false })),
          ...recipes.map((r) => ({ id: `rec-${r.id}`, name: r.name, isSubRecipe: true })),
        ];
        setNameResults(results);
        setShowNameSearch(true);
      } catch {
        // Ignore search errors
      }
    } else {
      setShowNameSearch(false);
    }
  };

  const selectName = (result: { id: string; name: string; isSubRecipe?: boolean }) => {
    setNameInput(result.name);
    onUpdate(index, "name", result.name);
    setShowNameSearch(false);

    if (result.isSubRecipe) {
      const subRecipeId = result.id.replace("rec-", "");
      onUpdate(index, "isSubRecipe", true);
      onUpdate(index, "subRecipeId", subRecipeId);
      onUpdate(index, "subRecipeName", result.name);
    } else {
      onUpdate(index, "isSubRecipe", false);
      onUpdate(index, "subRecipeId", "");
      onUpdate(index, "subRecipeName", "");
    }
  };

  return (
    <div className="group flex items-start gap-2 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50">
      <TooltipProvider>
        <div className="flex flex-col gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-7 w-7 cursor-grab active:cursor-grabbing"
                disabled={index === 0}
                onClick={() => onMoveUp(index)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move up</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-7 w-7 cursor-grab active:cursor-grabbing"
                onClick={() => onMoveDown(index)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move down</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <div className="flex-1 grid grid-cols-12 gap-2 items-start">
        {/* Quantity */}
        <div className="col-span-2">
          <Input
            className="h-9"
            onChange={(e) => onUpdate(index, "quantity", e.target.value)}
            placeholder="Qty"
            type="number"
            step="0.01"
            value={ingredient.quantity}
          />
        </div>

        {/* Unit */}
        <div className="col-span-2">
          <Select
            defaultValue={ingredient.unit || "g"}
            onValueChange={(value) => onUpdate(index, "unit", value)}
            value={ingredient.unit || undefined}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              {commonUnits.map((unit) => (
                <SelectItem key={unit.code} value={unit.code}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ingredient Name with Search */}
        <div className="col-span-4 relative">
          <div className="relative">
            <Input
              className="h-9 pr-8"
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ingredient or sub-recipe..."
              value={nameInput}
            />
            {ingredient.isSubRecipe && (
              <Link
                className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                href={`/kitchen/recipes/${ingredient.subRecipeId}`}
                target="_blank"
                onClick={(e) => e.preventDefault()}
              >
                <TooltipProvider>
                  <Tooltip open={costTooltipOpen} onOpenChange={setCostTooltipOpen}>
                    <TooltipTrigger asChild>
                      <LinkIcon className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>View sub-recipe</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Link>
            )}
            {ingredient.hasCostData && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Cost per ingredient: {formatCurrency(ingredient.costPerIngredient)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showNameSearch && nameResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md max-h-60 overflow-y-auto">
              {nameResults.map((result) => (
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  key={result.id}
                  onClick={() => selectName(result)}
                  type="button"
                >
                  {result.isSubRecipe ? (
                    <Utensils className="h-3 w-3 text-muted-foreground" />
                  ) : null}
                  <span>{result.name}</span>
                  {result.isSubRecipe && (
                    <Badge className="ml-auto text-xs" variant="outline">
                      Recipe
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preparation Notes */}
        <div className="col-span-3">
          <Input
            className="h-9"
            onChange={(e) => onUpdate(index, "preparationNotes", e.target.value)}
            placeholder="Prep notes (optional)"
            value={ingredient.preparationNotes}
          />
        </div>

        {/* Actions */}
        <div className="col-span-1 flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="h-9 w-9"
                  onClick={() => {
                    const newIng = { ...ingredient, id: `copy-${Date.now()}` };
                    // This will be handled by parent component
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicate ingredient</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={() => onRemove(index)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RichRecipeEditor({
  open,
  onOpenChange,
  recipe,
  onSave,
}: RichRecipeEditorProps) {
  // Auth handled at page level
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(recipe?.tags ?? []);
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    recipe?.ingredients ?? []
  );
  const [scaleFactor, setScaleFactor] = useState(1);
  const [targetPrice, setTargetPrice] = useState<number | null>(null);
  const [foodCostTarget, setFoodCostTarget] = useState<number | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [isCalculating, startCalculation] = useTransition();
  const [isSearching, setIsSearching] = useState(false);

  // Calculate costs whenever ingredients or scale changes
  useEffect(() => {
    if (ingredients.length === 0) {
      setCostBreakdown(null);
      return;
    }

    const calculateCosts = async () => {
      startCalculation(async () => {
        try {
          const response = await apiFetch("/api/recipes/calculate-cost", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ingredients: ingredients.map((ing) => ({
                name: ing.name,
                quantity: parseFloat(ing.quantity) || 0,
                unit: ing.unit,
                isSubRecipe: ing.isSubRecipe,
                subRecipeId: ing.subRecipeId,
              })),
              scaleFactor,
              yieldQuantity: recipe?.yieldQuantity || 1,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            setCostBreakdown(data);

            // Update ingredient costs in the list
            setIngredients((prev) =>
              prev.map((ing, idx) => ({
                ...ing,
                costPerIngredient: data.ingredients[idx]?.cost || 0,
                hasCostData: data.ingredients[idx]?.hasInventoryItem || false,
              }))
            );
          }
        } catch {
          setCostBreakdown(null);
        }
      });
    };

    const timeoutId = setTimeout(calculateCosts, 500);
    return () => clearTimeout(timeoutId);
  }, [ingredients, scaleFactor, recipe?.yieldQuantity]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        id: `new-${Date.now()}`,
        ingredientId: null,
        name: "",
        quantity: "",
        unit: "g",
        unitId: null,
        preparationNotes: "",
        isOptional: false,
        isSubRecipe: false,
        subRecipeId: null,
        subRecipeName: null,
        sortOrder: ingredients.length,
        costPerIngredient: 0,
        hasCostData: false,
      },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleUpdateIngredient = (
    index: number,
    field: keyof IngredientRow,
    value: string | boolean
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleMoveIngredient = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= ingredients.length) {
      return;
    }
    const updated = [...ingredients];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    // Update sort orders
    updated.forEach((ing, idx) => ({ ...ing, sortOrder: idx }));
    setIngredients(updated);
  };

  const handleDuplicateIngredient = (index: number) => {
    const original = ingredients[index];
    const duplicate = {
      ...original,
      id: `copy-${Date.now()}`,
      sortOrder: ingredients.length,
    };
    setIngredients([...ingredients, duplicate]);
  };

  const handleScale = (factor: number) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        const currentQty = parseFloat(ing.quantity) || 0;
        return {
          ...ing,
          quantity: (currentQty * factor).toString(),
        };
      })
    );
    setScaleFactor(factor);
  };

  const handleSearchIngredients = async (query: string): Promise<string[]> => {
    // Auth checked at page level
    setIsSearching(true);
    try {
      const response = await apiFetch("/api/ingredients/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.ingredients || [];
      }
    } catch {
      // Ignore search errors
    } finally {
      setIsSearching(false);
    }
    return [];
  };

  const handleSearchRecipes = async (
    query: string
  ): Promise<Array<{ id: string; name: string }>> => {
    // Auth checked at page level
    setIsSearching(true);
    try {
      const response = await apiFetch(kitchenRecipesSearch(query));
      if (response.ok) {
        const data = await response.json();
        return data.data || data.recipes || [];
      }
    } catch {
      // Ignore search errors
    } finally {
      setIsSearching(false);
    }
    return [];
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      formData.set("tags", tags.join(","));
      formData.set("ingredients", JSON.stringify(ingredients));
      formData.set("scaleFactor", scaleFactor.toString());
      if (targetPrice) {
        formData.set("targetPrice", targetPrice.toString());
      }
      if (foodCostTarget) {
        formData.set("foodCostTarget", foodCostTarget.toString());
      }
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const foodCostPercentage = useMemo(() => {
    if (!costBreakdown || !targetPrice) return null;
    return (costBreakdown.totalCost / targetPrice) * 100;
  }, [costBreakdown, targetPrice]);

  const isEditMode = Boolean(recipe?.id);
  const modalTitle = isEditMode ? "Edit Recipe" : "New Recipe";
  const modalDescription = isEditMode
    ? "Update recipe details below. Changes create a new version."
    : "Fill in the recipe details to create a new recipe.";

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-4xl" side="right">
        <SheetHeader>
          <SheetTitle>{modalTitle}</SheetTitle>
          <SheetDescription>{modalDescription}</SheetDescription>
        </SheetHeader>

        <form action={handleSubmit} className="flex flex-1 flex-col gap-6 p-4">
          {recipe?.id && (
            <input name="recipeId" type="hidden" value={recipe.id} />
          )}

          {/* Cost Summary Header */}
          <Collapsible defaultOpen>
            <Card>
              <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <div className="font-semibold">Recipe Costing</div>
                    {costBreakdown && (
                      <div className="text-sm text-muted-foreground">
                        Total: {formatCurrency(costBreakdown.totalCost)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isCalculating && (
                    <div className="text-sm text-muted-foreground">
                      Calculating...
                    </div>
                  )}
                  <Button size="sm" type="button" variant="ghost">
                    <Info className="h-4 w-4 mr-2" />
                    Cost Details
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-6">
                  {costBreakdown ? (
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Total Cost
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(costBreakdown.totalCost)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Utensils className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Cost per Yield
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(costBreakdown.costPerYield)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Cost per Serving
                          </div>
                          <div className="font-semibold">
                            {formatCurrency(costBreakdown.costPerServing)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <Percent className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Food Cost %
                          </div>
                          <div className="font-semibold">
                            {foodCostPercentage
                              ? `${foodCostPercentage.toFixed(1)}%`
                              : "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Add ingredients with cost data to see recipe costing.</p>
                    </div>
                  )}

                  {/* Scale Controls */}
                  <div className="mt-4 p-4 rounded-lg border">
                    <Label className="text-sm font-medium mb-3 block">
                      Scale Recipe
                    </Label>
                    <div className="flex flex-wrap items-center gap-2">
                      {[0.25, 0.5, 0.75, 1, 1.5, 2, 3].map((factor) => (
                        <Button
                          className={scaleFactor === factor ? "ring-2 ring-primary" : ""}
                          key={factor}
                          onClick={() => handleScale(factor / scaleFactor)}
                          size="sm"
                          type="button"
                          variant={scaleFactor === factor ? "default" : "outline"}
                        >
                          {factor}x
                        </Button>
                      ))}
                      <div className="ml-auto flex items-center gap-2">
                        <Label className="text-sm">Custom:</Label>
                        <Input
                          className="w-20 h-9"
                          min="0.1"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val > 0) {
                              handleScale(val / scaleFactor);
                            }
                          }}
                          step="0.1"
                          type="number"
                          value={scaleFactor}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Target Price & Food Cost Target */}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Target Selling Price
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          className="pl-7"
                          min="0"
                          onChange={(e) =>
                            setTargetPrice(
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          placeholder="0.00"
                          step="0.01"
                          type="number"
                          value={targetPrice || ""}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Target Food Cost %
                      </Label>
                      <div className="relative">
                        <Input
                          className="pr-8"
                          max="100"
                          min="0"
                          onChange={(e) =>
                            setFoodCostTarget(
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          placeholder="30"
                          step="1"
                          type="number"
                          value={foodCostTarget || ""}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Recipe Name <span className="text-destructive">*</span>
            </Label>
            <Input
              defaultValue={recipe?.name ?? ""}
              id="name"
              name="name"
              placeholder="e.g., Classic Caesar Salad"
              required
            />
          </div>

          {/* Category field */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select defaultValue={recipe?.category ?? ""} name="category">
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description field */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              defaultValue={recipe?.description ?? ""}
              id="description"
              name="description"
              placeholder="Brief description of the recipe"
              rows={3}
            />
          </div>

          {/* Tags field */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                id="tags"
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Type and press Enter to add"
                value={tagInput}
              />
              <Button onClick={handleAddTag} type="button" variant="outline">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {tags.map((tag) => (
                  <Badge
                    className="cursor-pointer"
                    key={tag}
                    onClick={() => handleRemoveTag(tag)}
                    variant="secondary"
                  >
                    {tag}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Ingredients section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium text-base">Ingredients</Label>
              <Button
                onClick={handleAddIngredient}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Ingredient
              </Button>
            </div>
            {ingredients.length > 0 ? (
              <div className="space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-12 gap-2 px-3 pb-2 text-sm text-muted-foreground">
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-4">Ingredient</div>
                  <div className="col-span-3">Prep Notes</div>
                  <div className="col-span-1" />
                </div>
                {ingredients.map((ingredient, index) => (
                  <IngredientRowItem
                    index={index}
                    ingredient={ingredient}
                    isSearching={isSearching}
                    key={ingredient.id}
                    onMoveDown={(index: number) => handleMoveIngredient(index, "down")}
                    onMoveUp={(index: number) => handleMoveIngredient(index, "up")}
                    onRemove={handleRemoveIngredient}
                    onUpdate={handleUpdateIngredient}
                    onSearchIngredients={handleSearchIngredients}
                    onSearchRecipes={handleSearchRecipes}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                <Utensils className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="mb-2">No ingredients yet</p>
                <p className="text-sm">
                  Click "Add Ingredient" to start building your recipe
                </p>
              </div>
            )}
          </div>

          {/* Yield section */}
          <div className="space-y-4">
            <Label className="font-medium text-base">Yield</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yieldQuantity">Quantity</Label>
                <Input
                  defaultValue={recipe?.yieldQuantity ?? ""}
                  id="yieldQuantity"
                  min="1"
                  name="yieldQuantity"
                  placeholder="e.g., 4"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yieldUnit">Unit</Label>
                <Select
                  defaultValue={recipe?.yieldUnit ?? "servings"}
                  name="yieldUnit"
                >
                  <SelectTrigger id="yieldUnit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonUnits.map((unit) => (
                      <SelectItem key={unit.code} value={unit.label.toLowerCase()}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Times section */}
          <div className="space-y-4">
            <Label className="font-medium text-base">Times (minutes)</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prepTimeMinutes">Prep</Label>
                <Input
                  defaultValue={recipe?.prepTimeMinutes ?? ""}
                  id="prepTimeMinutes"
                  min="0"
                  name="prepTimeMinutes"
                  placeholder="15"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cookTimeMinutes">Cook</Label>
                <Input
                  defaultValue={recipe?.cookTimeMinutes ?? ""}
                  id="cookTimeMinutes"
                  min="0"
                  name="cookTimeMinutes"
                  placeholder="30"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restTimeMinutes">Rest</Label>
                <Input
                  defaultValue={recipe?.restTimeMinutes ?? ""}
                  id="restTimeMinutes"
                  min="0"
                  name="restTimeMinutes"
                  placeholder="10"
                  type="number"
                />
              </div>
            </div>
          </div>

          {/* Notes section */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              defaultValue={recipe?.notes ?? ""}
              id="notes"
              name="notes"
              placeholder="Additional notes about this recipe..."
              rows={3}
            />
          </div>

          <input name="tags" type="hidden" value={JSON.stringify(tags)} />
          <input name="ingredients" type="hidden" value={JSON.stringify(ingredients)} />
          <input name="scaleFactor" type="hidden" value={scaleFactor.toString()} />
          <input
            name="targetPrice"
            type="hidden"
            value={targetPrice ? targetPrice.toString() : ""}
          />
          <input
            name="foodCostTarget"
            type="hidden"
            value={foodCostTarget ? foodCostTarget.toString() : ""}
          />

          <SheetFooter className="mt-auto pt-4">
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save Recipe"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// Import the missing icons
function Users({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function Percent({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19 5L5 19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}
