/**
 * @module AllergenFilters
 * @intent Provide filtering controls for allergen and dietary restrictions
 * @responsibility Render search input, allergen checkboxes, and dietary restriction filters
 * @domain Kitchen
 * @tags allergens, filters, search, dietary-restrictions
 * @canonical true
 */

"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { SearchIcon, XIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

const COMMON_ALLERGENS = [
  { value: "all", label: "All Allergens" },
  { value: "peanuts", label: "Peanuts" },
  { value: "tree nuts", label: "Tree Nuts" },
  { value: "dairy", label: "Dairy" },
  { value: "eggs", label: "Eggs" },
  { value: "gluten", label: "Gluten" },
  { value: "soy", label: "Soy" },
  { value: "fish", label: "Fish" },
  { value: "shellfish", label: "Shellfish" },
  { value: "sesame", label: "Sesame" },
] as const;

const DIETARY_RESTRICTIONS = [
  { value: "all", label: "All Diets" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "kosher", label: "Kosher" },
  { value: "halal", label: "Halal" },
  { value: "gluten-free", label: "Gluten-Free" },
  { value: "dairy-free", label: "Dairy-Free" },
  { value: "nut-free", label: "Nut-Free" },
] as const;

interface AllergenFiltersProps {
  initialQuery?: string;
  initialAllergen?: string;
  initialDietary?: string;
}

export function AllergenFilters({
  initialQuery = "",
  initialAllergen = "all",
  initialDietary = "all",
}: AllergenFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("search") as string;
    updateFilters({ q: query || null });
  };

  const handleClearFilters = () => {
    router.push("/kitchen/allergens", { scroll: false });
  };

  const hasActiveFilters =
    initialQuery || initialAllergen !== "all" || initialDietary !== "all";

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form className="flex gap-2" onSubmit={handleSearch}>
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            defaultValue={initialQuery}
            name="search"
            placeholder="Search recipes and dishes..."
          />
        </div>
        {hasActiveFilters && (
          <Button onClick={handleClearFilters} type="button" variant="outline">
            <XIcon className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </form>

      {/* Filter Controls */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Allergen Filter */}
        <div className="space-y-2">
          <Label htmlFor="allergen-select">Filter by Allergen</Label>
          <Select
            onValueChange={(value) => updateFilters({ allergen: value })}
            value={initialAllergen}
          >
            <SelectTrigger id="allergen-select">
              <SelectValue placeholder="Select allergen" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_ALLERGENS.map((allergen) => (
                <SelectItem key={allergen.value} value={allergen.value}>
                  {allergen.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dietary Restriction Filter */}
        <div className="space-y-2">
          <Label htmlFor="dietary-select">Filter by Dietary Restriction</Label>
          <Select
            onValueChange={(value) => updateFilters({ dietary: value })}
            value={initialDietary}
          >
            <SelectTrigger id="dietary-select">
              <SelectValue placeholder="Select dietary restriction" />
            </SelectTrigger>
            <SelectContent>
              {DIETARY_RESTRICTIONS.map((restriction) => (
                <SelectItem key={restriction.value} value={restriction.value}>
                  {restriction.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 rounded-md bg-muted p-3">
          <span className="text-muted-foreground text-sm font-medium">
            Active filters:
          </span>
          {initialQuery && (
            <span className="bg-background rounded border px-2 py-1 text-sm">
              Search: &quot;{initialQuery}&quot;
            </span>
          )}
          {initialAllergen !== "all" && (
            <span className="bg-background rounded border px-2 py-1 text-sm">
              Allergen: &quot;{initialAllergen}&quot;
            </span>
          )}
          {initialDietary !== "all" && (
            <span className="bg-background rounded border px-2 py-1 text-sm">
              Dietary: &quot;{initialDietary}&quot;
            </span>
          )}
        </div>
      )}
    </div>
  );
}
