/**
 * @module AllergenFilters
 * @intent Provide filtering controls for allergen and dietary restrictions
 * @responsibility Render search input, allergen checkboxes, and dietary restriction filters
 * @domain Kitchen
 * @tags allergens, filters, search, dietary-restrictions
 * @canonical true
 */
interface AllergenFiltersProps {
  initialQuery?: string;
  initialAllergen?: string;
  initialDietary?: string;
}
export declare function AllergenFilters({
  initialQuery,
  initialAllergen,
  initialDietary,
}: AllergenFiltersProps): import("react").JSX.Element;
//# sourceMappingURL=allergen-filters.d.ts.map
