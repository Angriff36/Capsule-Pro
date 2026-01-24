/**
 * @module AllergenStatsCards
 * @intent Display key allergen management statistics in card format
 * @responsibility Render overview stats for allergen-tagged items, guest restrictions, and pending warnings
 * @domain Kitchen
 * @tags allergens, statistics, dashboard
 * @canonical true
 */
interface AllergenStats {
  recipesWithAllergens: number;
  dishesWithAllergens: number;
  activeGuestRestrictions: number;
  pendingWarnings: number;
}
export declare function AllergenStatsCards({
  stats,
}: {
  stats: AllergenStats;
}): import("react").JSX.Element;
//# sourceMappingURL=allergen-stats-cards.d.ts.map
