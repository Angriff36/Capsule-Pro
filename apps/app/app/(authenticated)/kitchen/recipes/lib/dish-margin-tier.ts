/**
 * Maps dish margin % to DESIGN.md palette tiers (deep-green / action-blue / coral).
 */
export type DishMarginTier = "high" | "mid" | "low" | "none";

export function getDishMarginTier(margin: number | null): DishMarginTier {
  if (margin === null) {
    return "none";
  }
  if (margin >= 60) {
    return "high";
  }
  if (margin >= 40) {
    return "mid";
  }
  return "low";
}

const tierClasses: Record<
  Exclude<DishMarginTier, "none">,
  { bar: string; text: string }
> = {
  high: { bar: "bg-deep-green", text: "text-deep-green" },
  mid: { bar: "bg-action-blue", text: "text-action-blue" },
  low: { bar: "bg-coral", text: "text-coral" },
};

export function getDishMarginTierClasses(margin: number | null): {
  barClass: string;
  textClass: string;
} {
  const tier = getDishMarginTier(margin);
  if (tier === "none") {
    return {
      barClass: "bg-muted-foreground",
      textClass: "text-muted-foreground",
    };
  }
  const { bar, text } = tierClasses[tier];
  return { barClass: bar, textClass: text };
}
