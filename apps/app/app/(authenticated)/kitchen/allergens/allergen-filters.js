/**
 * @module AllergenFilters
 * @intent Provide filtering controls for allergen and dietary restrictions
 * @responsibility Render search input, allergen checkboxes, and dietary restriction filters
 * @domain Kitchen
 * @tags allergens, filters, search, dietary-restrictions
 * @canonical true
 */
"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AllergenFilters = AllergenFilters;
const button_1 = require("@repo/design-system/components/ui/button");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
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
];
const DIETARY_RESTRICTIONS = [
  { value: "all", label: "All Diets" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "kosher", label: "Kosher" },
  { value: "halal", label: "Halal" },
  { value: "gluten-free", label: "Gluten-Free" },
  { value: "dairy-free", label: "Dairy-Free" },
  { value: "nut-free", label: "Nut-Free" },
];
function AllergenFilters({
  initialQuery = "",
  initialAllergen = "all",
  initialDietary = "all",
}) {
  const router = (0, navigation_1.useRouter)();
  const searchParams = (0, navigation_1.useSearchParams)();
  const updateFilters = (updates) => {
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
  const handleSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("search");
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
          <lucide_react_1.SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input_1.Input
            className="pl-9"
            defaultValue={initialQuery}
            name="search"
            placeholder="Search recipes and dishes..."
          />
        </div>
        {hasActiveFilters && (
          <button_1.Button
            onClick={handleClearFilters}
            type="button"
            variant="outline"
          >
            <lucide_react_1.XIcon className="mr-2 h-4 w-4" />
            Clear
          </button_1.Button>
        )}
      </form>

      {/* Filter Controls */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Allergen Filter */}
        <div className="space-y-2">
          <label_1.Label htmlFor="allergen-select">
            Filter by Allergen
          </label_1.Label>
          <select_1.Select
            onValueChange={(value) => updateFilters({ allergen: value })}
            value={initialAllergen}
          >
            <select_1.SelectTrigger id="allergen-select">
              <select_1.SelectValue placeholder="Select allergen" />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              {COMMON_ALLERGENS.map((allergen) => (
                <select_1.SelectItem
                  key={allergen.value}
                  value={allergen.value}
                >
                  {allergen.label}
                </select_1.SelectItem>
              ))}
            </select_1.SelectContent>
          </select_1.Select>
        </div>

        {/* Dietary Restriction Filter */}
        <div className="space-y-2">
          <label_1.Label htmlFor="dietary-select">
            Filter by Dietary Restriction
          </label_1.Label>
          <select_1.Select
            onValueChange={(value) => updateFilters({ dietary: value })}
            value={initialDietary}
          >
            <select_1.SelectTrigger id="dietary-select">
              <select_1.SelectValue placeholder="Select dietary restriction" />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              {DIETARY_RESTRICTIONS.map((restriction) => (
                <select_1.SelectItem
                  key={restriction.value}
                  value={restriction.value}
                >
                  {restriction.label}
                </select_1.SelectItem>
              ))}
            </select_1.SelectContent>
          </select_1.Select>
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
