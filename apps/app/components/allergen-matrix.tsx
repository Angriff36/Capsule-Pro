/**
 * @module AllergenMatrix
 * @intent Display recipes/dishes against Big 9 allergens in a grid format
 * @responsibility Query ingredient allergens and render a matrix with checkmarks
 * @domain Kitchen
 * @tags allergens, matrix, grid, big-9, dietary
 * @canonical true
 */

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { TooltipProvider } from "@repo/design-system/components/ui/tooltip";
// biome-ignore lint/performance/noBarrelFile: Sentry requires namespace import for logger
import * as Sentry from "@sentry/nextjs";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  Filter,
  Loader2,
  Minus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { DietaryBadges } from "./dietary-badges";

const { logger, captureException } = Sentry;

/**
 * The Big 9 allergens as defined by FDA
 */
const BIG_9_ALLERGENS = [
  { key: "milk", label: "Milk", shortLabel: "Milk" },
  { key: "eggs", label: "Eggs", shortLabel: "Eggs" },
  { key: "fish", label: "Fish", shortLabel: "Fish" },
  { key: "shellfish", label: "Shellfish", shortLabel: "Shell" },
  { key: "tree_nuts", label: "Tree Nuts", shortLabel: "Nuts" },
  { key: "peanuts", label: "Peanuts", shortLabel: "Peanut" },
  { key: "wheat", label: "Wheat", shortLabel: "Wheat" },
  { key: "soybeans", label: "Soy", shortLabel: "Soy" },
  { key: "sesame", label: "Sesame", shortLabel: "Sesame" },
] as const;

type AllergenKey = (typeof BIG_9_ALLERGENS)[number]["key"];

interface RecipeWithAllergens {
  id: string;
  name: string;
  category?: string;
  dietaryTags: string[];
  allergens: Record<AllergenKey, boolean | null>;
  ingredientCount: number;
  allergenIngredients: Record<AllergenKey, string[]>;
}

interface AllergenMatrixProps {
  /** Optional filter for specific items */
  itemIds?: string[];
  /** Filter by item type */
  itemType?: "recipe" | "dish";
  /** Show dietary badges */
  showDietaryTags?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Show export button */
  showExport?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Get allergen status indicator
 */
function AllergenCell({
  contains,
  ingredients,
  compact = false,
}: {
  contains: boolean | null;
  ingredients: string[];
  compact?: boolean;
}) {
  if (contains === null) {
    return (
      <TooltipProvider>
        <div
          className={`flex items-center justify-center ${compact ? "p-1" : "p-2"}`}
          title="Unknown"
        >
          <Minus className="h-4 w-4 text-gray-400" />
        </div>
      </TooltipProvider>
    );
  }

  if (contains) {
    const tooltipContent =
      ingredients.length > 0
        ? `Contains: ${ingredients.join(", ")}`
        : "Contains allergen";

    return (
      <TooltipProvider>
        <div
          className={`flex items-center justify-center ${compact ? "p-1" : "p-2"}`}
          title={tooltipContent}
        >
          <div className="flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded-full p-0.5">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={`flex items-center justify-center ${compact ? "p-1" : "p-2"}`}
        title="Free from this allergen"
      >
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      </div>
    </TooltipProvider>
  );
}

/**
 * Export matrix data as CSV
 */
function exportToCSV(
  recipes: RecipeWithAllergens[],
  filename = "allergen-matrix.csv"
) {
  const headers = [
    "Name",
    "Category",
    ...BIG_9_ALLERGENS.map((a) => a.label),
    "Dietary Tags",
  ];

  const rows = recipes.map((recipe) => [
    recipe.name,
    recipe.category ?? "",
    ...BIG_9_ALLERGENS.map((a) => (recipe.allergens[a.key] ? "Yes" : "No")),
    recipe.dietaryTags.join("; "),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AllergenMatrix({
  itemIds,
  itemType = "dish",
  showDietaryTags = true,
  compact = false,
  showExport = true,
  className = "",
}: AllergenMatrixProps) {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<RecipeWithAllergens[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAllergens, setFilterAllergens] = useState<AllergenKey[]>([]);

  useEffect(() => {
    fetchAllergenMatrix();
  }, [itemType, itemIds]);

  const fetchAllergenMatrix = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", itemType);
      if (itemIds && itemIds.length > 0) {
        params.set("ids", itemIds.join(","));
      }

      const response = await apiFetch(
        `/api/kitchen/allergens/matrix?${params.toString()}`
      );

      if (!response.ok) {
        logger.warn("Failed to fetch allergen matrix");
        setRecipes([]);
        return;
      }

      const data = await response.json();
      setRecipes(data.items || []);
    } catch (error) {
      captureException(error);
      logger.warn(logger.fmt`Error fetching allergen matrix: ${String(error)}`);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = useMemo(() => {
    let filtered = recipes;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(term) ||
          recipe.category?.toLowerCase().includes(term)
      );
    }

    // Filter by allergens (show only items containing selected allergens)
    if (filterAllergens.length > 0) {
      filtered = filtered.filter((recipe) =>
        filterAllergens.some((key) => recipe.allergens[key] === true)
      );
    }

    return filtered;
  }, [recipes, searchTerm, filterAllergens]);

  const handleExport = () => {
    exportToCSV(filteredRecipes);
    toast.success("Allergen matrix exported");
  };

  const toggleAllergenFilter = (key: AllergenKey) => {
    setFilterAllergens((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className={compact ? "py-3" : undefined}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={compact ? "text-lg" : undefined}>
              Allergen Matrix
            </CardTitle>
            {!compact && (
              <CardDescription>
                Big 9 allergens overview for{" "}
                {itemType === "dish" ? "dishes" : "recipes"}
              </CardDescription>
            )}
          </div>
          {showExport && (
            <Button
              disabled={filteredRecipes.length === 0}
              onClick={handleExport}
              size="sm"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="text-sm border rounded px-2 py-1 w-48 bg-background"
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              type="text"
              value={searchTerm}
            />
          </div>

          {/* Allergen Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {BIG_9_ALLERGENS.map((allergen) => (
              <button
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  filterAllergens.includes(allergen.key)
                    ? "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                }`}
                key={allergen.key}
                onClick={() => toggleAllergenFilter(allergen.key)}
                type="button"
              >
                {allergen.shortLabel}
              </button>
            ))}
            {filterAllergens.length > 0 && (
              <button
                className="text-xs px-2 py-0.5 text-gray-500 hover:text-gray-700"
                onClick={() => setFilterAllergens([])}
                type="button"
              >
                <X className="h-3 w-3 inline mr-1" />
                Clear
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={compact ? "py-2" : undefined}>
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {recipes.length === 0
              ? `No ${itemType === "dish" ? "dishes" : "recipes"} found`
              : "No items match your filters"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                    Name
                  </TableHead>
                  {!compact && (
                    <TableHead className="min-w-[100px]">Category</TableHead>
                  )}
                  {BIG_9_ALLERGENS.map((allergen) => (
                    <TableHead
                      className="text-center min-w-[60px]"
                      key={allergen.key}
                    >
                      {compact ? (
                        <span
                          className="text-xs"
                          title={allergen.label}
                        >
                          {allergen.shortLabel}
                        </span>
                      ) : (
                        allergen.label
                      )}
                    </TableHead>
                  ))}
                  {showDietaryTags && (
                    <TableHead className="min-w-[150px]">Dietary</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      {recipe.name}
                    </TableCell>
                    {!compact && (
                      <TableCell className="text-muted-foreground">
                        {recipe.category ?? "-"}
                      </TableCell>
                    )}
                    {BIG_9_ALLERGENS.map((allergen) => (
                      <TableCell
                        className="text-center"
                        key={allergen.key}
                      >
                        <AllergenCell
                          compact={compact}
                          contains={recipe.allergens[allergen.key]}
                          ingredients={
                            recipe.allergenIngredients[allergen.key] || []
                          }
                        />
                      </TableCell>
                    ))}
                    {showDietaryTags && (
                      <TableCell>
                        <DietaryBadges
                          compact
                          size="sm"
                          tags={recipe.dietaryTags}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary Stats */}
        <div className="flex gap-4 mt-4 pt-4 border-t text-sm text-muted-foreground">
          <span>
            {filteredRecipes.length} of {recipes.length} items
          </span>
          {filterAllergens.length > 0 && (
            <span>
              • Filtered by {filterAllergens.length} allergen
              {filterAllergens.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AllergenMatrix;
