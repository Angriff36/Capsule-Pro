"use client";

import {
  AnweMetricGrid,
  AnweMetricTile,
  AnwePageCanvas,
  AnwePageHeader,
  AnwePanel,
  AnwePanelRow,
  AnweSecondaryButton,
  AnweSectionLabel,
} from "@repo/design-system/components/blocks/anwe-page-shell";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { ArrowRight, DollarSignIcon, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
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

const RECIPE_ROW_GRID =
  "flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(180px,1.4fr)_100px_100px_72px_96px_96px_80px_88px] lg:items-center lg:gap-4";

function RecipeCostRow({ recipe }: { readonly recipe: Recipe }) {
  const detailHref = `/inventory/recipe-costs/${recipe.currentVersion?.id || recipe.id}`;

  return (
    <AnwePanelRow className={RECIPE_ROW_GRID}>
      <div className="min-w-0">
        <p className="truncate font-bold text-[15px] text-anwe-on-surface">
          {recipe.name}
        </p>
        {recipe.description ? (
          <p className="truncate text-[13px] text-anwe-on-surface-variant">
            {recipe.description}
          </p>
        ) : null}
      </div>
      <div className="text-[13px] text-anwe-on-surface-variant">
        {recipe.category ? getRecipeCategoryLabel(recipe.category) : "—"}
      </div>
      <div className="text-[13px] text-anwe-on-surface-variant">
        {recipe.cuisineType ? getCuisineTypeLabel(recipe.cuisineType) : "—"}
      </div>
      <div className="text-right font-medium text-[13px] tabular-nums">
        {recipe.yieldQuantity ? (
          <>
            {recipe.yieldQuantity}
            {recipe.yieldUnitId ? " u" : ""}
          </>
        ) : (
          <span className="text-anwe-on-surface-variant">—</span>
        )}
      </div>
      <div className="text-right font-bold text-[13px] tabular-nums">
        {recipe.currentVersion?.totalCost == null ? (
          <span className="font-medium text-anwe-on-surface-variant">—</span>
        ) : (
          formatCurrency(recipe.currentVersion.totalCost)
        )}
      </div>
      <div className="text-right text-[13px] text-anwe-on-surface-variant tabular-nums">
        {recipe.currentVersion?.costPerYield == null
          ? "—"
          : formatCurrency(recipe.currentVersion.costPerYield)}
      </div>
      <div>
        <span
          className={
            recipe.isActive
              ? "font-black text-[10px] text-anwe-gold uppercase tracking-[0.18em]"
              : "font-black text-[10px] text-anwe-tan uppercase tracking-[0.18em]"
          }
        >
          {recipe.isActive ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="flex justify-end">
        <Link
          className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-anwe-gray-50 px-3 py-1.5 font-bold text-[12px] text-anwe-on-surface uppercase tracking-[0.12em] transition-colors hover:border-anwe-gold/50 hover:text-anwe-gold focus-visible:outline-2 focus-visible:outline-anwe-gold focus-visible:outline-offset-2"
          href={detailHref}
        >
          View
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </AnwePanelRow>
  );
}

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
    if (!searchQuery) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return (
      recipe.name.toLowerCase().includes(query) ||
      recipe.description?.toLowerCase().includes(query)
    );
  });

  const recipesWithCost = recipes.filter(
    (r) => r.currentVersion?.totalCost !== null
  );
  const totalRecipeValue = recipesWithCost.reduce(
    (sum, recipe) => sum + (recipe.currentVersion?.totalCost || 0),
    0
  );
  const averageCostPerYield =
    recipesWithCost.length > 0 ? totalRecipeValue / recipesWithCost.length : 0;
  const costCoveragePct =
    recipes.length > 0
      ? ((recipesWithCost.length / recipes.length) * 100).toFixed(0)
      : "0";
  const activeOnPage = recipes.filter((r) => r.isActive).length;

  return (
    <AnwePageCanvas>
      <AnwePageHeader
        actions={
          <AnweSecondaryButton onClick={loadRecipes} type="button">
            <RefreshCw className="size-4" />
            Refresh
          </AnweSecondaryButton>
        }
        description="View and manage recipe costs with detailed ingredient breakdowns."
        eyebrow="Inventory / Recipe Costs"
        title="Recipe Costs"
      />

      <AnweMetricGrid>
        <AnweMetricTile
          hint={`${activeOnPage} active on this page`}
          label="Total recipes"
          value={totalCount}
        />
        <AnweMetricTile
          hint={`${costCoveragePct}% of loaded recipes`}
          label="With cost data"
          value={recipesWithCost.length}
        />
        <AnweMetricTile
          hint="Sum of recipe costs"
          label="Total value"
          value={formatCurrency(totalRecipeValue)}
        />
        <AnweMetricTile
          hint="Per yield unit average"
          label="Avg cost / yield"
          value={formatCurrency(averageCostPerYield)}
        />
      </AnweMetricGrid>

      <section className="space-y-5">
        <AnweSectionLabel tone="gold">Filter &amp; search</AnweSectionLabel>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative max-w-xl flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-anwe-gold"
            />
            <Input
              className="h-12 rounded-[24px] border-white/10 bg-anwe-card-bg pl-12 text-[15px] placeholder:text-anwe-on-surface-variant/70 focus-visible:border-anwe-gold focus-visible:ring-anwe-gold/25"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              value={searchQuery}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Select
              onValueChange={(value) => {
                setCategoryFilter(value as RecipeCategory | "all");
                setPage(1);
              }}
              value={categoryFilter}
            >
              <SelectTrigger className="h-11 w-[160px] rounded-2xl border-white/10 bg-anwe-gray-50">
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
              onValueChange={(value) => {
                setCuisineFilter(value as CuisineType | "all");
                setPage(1);
              }}
              value={cuisineFilter}
            >
              <SelectTrigger className="h-11 w-[160px] rounded-2xl border-white/10 bg-anwe-gray-50">
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
              onValueChange={(value) => {
                setActiveFilter(value === "all" ? "all" : value === "true");
                setPage(1);
              }}
              value={activeFilter.toString()}
            >
              <SelectTrigger className="h-11 w-[140px] rounded-2xl border-white/10 bg-anwe-gray-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <AnweSectionLabel>All recipes</AnweSectionLabel>
            <h2 className="mt-2 font-extrabold text-2xl text-anwe-on-surface tracking-[0.01em]">
              Cost breakdown
            </h2>
          </div>
          <span className="font-black text-[10px] text-anwe-tan uppercase tracking-[0.24em]">
            {totalCount} total
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-2 border-anwe-gray-200 border-t-anwe-gold" />
          </div>
        ) : null}

        {!isLoading && filteredRecipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-anwe-gold/30 border-dashed bg-anwe-card-bg px-8 py-16 text-center">
            <DollarSignIcon className="mb-4 size-10 text-anwe-gold/50" />
            <p className="font-extrabold text-anwe-on-surface text-xl">
              No recipes found
            </p>
            <p className="mt-2 max-w-sm text-[15px] text-anwe-on-surface-variant">
              Adjust filters or add recipes in the kitchen module.
            </p>
          </div>
        ) : null}

        {!isLoading && filteredRecipes.length > 0 ? (
          <AnwePanel>
            <AnwePanelRow className="hidden gap-4 font-black text-[10px] text-anwe-tan uppercase tracking-[0.2em] lg:grid lg:grid-cols-[minmax(180px,1.4fr)_100px_100px_72px_96px_96px_80px_88px]">
              <span>Recipe</span>
              <span>Category</span>
              <span>Cuisine</span>
              <span className="text-right">Yield</span>
              <span className="text-right">Total</span>
              <span className="text-right">Per yield</span>
              <span>Status</span>
              <span className="text-right">Open</span>
            </AnwePanelRow>
            {filteredRecipes.map((recipe) => (
              <RecipeCostRow key={recipe.id} recipe={recipe} />
            ))}
          </AnwePanel>
        ) : null}

        {!isLoading && totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-[13px] text-anwe-on-surface-variant">
            <span>
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, totalCount)} of{" "}
              {totalCount}
            </span>
            <div className="flex items-center gap-2">
              <AnweSecondaryButton
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                type="button"
              >
                Previous
              </AnweSecondaryButton>
              <span className="px-2 font-medium tabular-nums">
                {page} / {totalPages}
              </span>
              <AnweSecondaryButton
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                type="button"
              >
                Next
              </AnweSecondaryButton>
            </div>
          </div>
        ) : null}
      </section>
    </AnwePageCanvas>
  );
};
