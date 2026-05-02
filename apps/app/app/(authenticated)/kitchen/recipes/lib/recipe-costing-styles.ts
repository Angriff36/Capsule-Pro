/** Tailwind class for recipe margin column (food costing table). */
export function getRecipeMarginCellClass(margin: number | null): string {
  if (margin !== null && margin > 50) {
    return "font-semibold text-deep-green";
  }
  if (margin !== null && margin < 30) {
    return "font-semibold text-coral";
  }
  return "font-medium text-action-blue";
}
