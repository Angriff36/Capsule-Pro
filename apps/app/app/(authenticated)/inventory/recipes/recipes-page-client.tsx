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
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
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
  ChevronLeftIcon,
  ChevronRightIcon,
  DollarSignIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type CuisineType,
  formatCurrency,
  getCuisineTypeLabel,
  getCuisineTypes,
  getRecipeCategories,
  getRecipeCategoryLabel,
  listRecipes,
  type Recipe,
  type RecipeCategory,
} from "../../../lib/use-recipe-costing";

export const RecipesPageClient = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<RecipeCategory | "all">(
    "all"
  );
  const [cuisineFilter, setCuisineFilter] = useState<CuisineType | "all">(
    "all"
  );
  const [activeFilter, setActiveFilter] = useState<boolean | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await listRecipes({
        page,
        limit: 20,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        cuisineType: cuisineFilter === "all" ? undefined : cuisineFilter,
        isActive: activeFilter === "all" ? undefined : activeFilter,
      });
      setRecipes(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (error) {
      console.error("Failed to load recipes:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load recipes"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, categoryFilter, cuisineFilter, activeFilter]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const filteredRecipes = recipes.filter((recipe) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      recipe.name.toLowerCase().includes(query) ||
      (recipe.description && recipe.description.toLowerCase().includes(query))
    );
  });

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  // Calculate summary stats
  const recipesWithCost = recipes.filter(
    (r) => r.currentVersion?.totalCost !== null
  );
  const totalRecipeValue = recipesWithCost.reduce(
    (sum, recipe) => sum + (recipe.currentVersion?.totalCost || 0),
    0
  );
  const averageCostPerYield =
    recipesWithCost.length > 0 ? totalRecipeValue / recipesWithCost.length : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipes</CardTitle>
            <CalculatorIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              {recipes.filter((r) => r.isActive).length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              With Cost Data
            </CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recipesWithCost.length}</div>
            <p className="text-xs text-muted-foreground">
              {((recipesWithCost.length / recipes.length) * 100).toFixed(0)}% of
              total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRecipeValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Sum of all recipe costs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Cost/Yield
            </CardTitle>
            <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(averageCostPerYield)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per yield unit average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Recipe Costing</CardTitle>
          <CardDescription>
            View and manage recipe costs with detailed ingredient breakdowns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Input
              className="max-w-sm"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              value={searchQuery}
            />
            <Select
              onValueChange={(value) =>
                setCategoryFilter(value as RecipeCategory | "all")
              }
              value={categoryFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getRecipeCategories().map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) =>
                setCuisineFilter(value as CuisineType | "all")
              }
              value={cuisineFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Cuisine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cuisines</SelectItem>
                {getCuisineTypes().map((cuisine) => (
                  <SelectItem key={cuisine.value} value={cuisine.value}>
                    {cuisine.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) =>
                setActiveFilter(value === "all" ? "all" : value === "true")
              }
              value={activeFilter.toString()}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Recipe Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipe Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Cuisine</TableHead>
                <TableHead className="text-right">Yield</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Cost/Yield</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell className="text-center py-8" colSpan={8}>
                    Loading recipes...
                  </TableCell>
                </TableRow>
              ) : filteredRecipes.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8" colSpan={8}>
                    No recipes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{recipe.name}</div>
                        {recipe.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-md">
                            {recipe.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {recipe.category ? (
                        <Badge variant="outline">
                          {getRecipeCategoryLabel(recipe.category)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {recipe.cuisineType ? (
                        <Badge variant="outline">
                          {getCuisineTypeLabel(recipe.cuisineType)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {recipe.yieldQuantity ? (
                        <span>
                          {recipe.yieldQuantity}{" "}
                          {recipe.yieldUnitId ? "units" : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {recipe.currentVersion?.totalCost !== null &&
                      recipe.currentVersion?.totalCost !== undefined ? (
                        <span className="font-medium">
                          {formatCurrency(recipe.currentVersion.totalCost)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Not calculated
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {recipe.currentVersion?.costPerYield !== null &&
                      recipe.currentVersion?.costPerYield !== undefined ? (
                        <span>
                          {formatCurrency(recipe.currentVersion.costPerYield)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={recipe.isActive ? "default" : "secondary"}
                      >
                        {recipe.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="ghost">
                        <a
                          href={`/inventory/recipes/${recipe.currentVersion?.id || recipe.id}`}
                        >
                          View Details
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalCount)} of{" "}
          {totalCount} recipes
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={page === 1}
            onClick={handlePreviousPage}
            size="sm"
            variant="outline"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm">
            Page {page} of {totalPages}
          </div>
          <Button
            disabled={page === totalPages}
            onClick={handleNextPage}
            size="sm"
            variant="outline"
          >
            Next
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
