"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { CheckCircleIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

export interface MenuCardProps {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  basePrice: number | null;
  pricePerPerson: number | null;
  minGuests: number | null;
  maxGuests: number | null;
  dishCount: number;
  dietaryTags?: string[] | null;
  allergens?: string[] | null;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const formatPriceRange = (
  basePrice: number | null,
  pricePerPerson: number | null
) => {
  if (basePrice && pricePerPerson) {
    return `${currencyFormatter.format(basePrice)} base • ${currencyFormatter.format(pricePerPerson)}/person`;
  }
  if (basePrice) {
    return currencyFormatter.format(basePrice);
  }
  if (pricePerPerson) {
    return `${currencyFormatter.format(pricePerPerson)}/person`;
  }
  return "Price TBD";
};

function formatGuestRange(
  minGuests: number | null,
  maxGuests: number | null
): string {
  if (minGuests && maxGuests) {
    return `${minGuests}-${maxGuests}`;
  }
  if (minGuests) {
    return `${minGuests}+`;
  }
  if (maxGuests) {
    return `Up to ${maxGuests}`;
  }
  return "—";
}

export const MenuCard = ({
  id,
  name,
  description,
  category,
  isActive,
  basePrice,
  pricePerPerson,
  minGuests,
  maxGuests,
  dishCount,
  dietaryTags,
  allergens,
}: MenuCardProps) => {
  // Aggregate dietary and allergen information
  const allDietaryTags = Array.from(
    new Set(
      (dietaryTags || [])
        .flatMap((tags) => (typeof tags === "string" ? [tags] : tags))
        .filter(Boolean)
    )
  );

  const allAllergens = Array.from(
    new Set(
      (allergens || [])
        .flatMap((allergens) =>
          typeof allergens === "string" ? [allergens] : allergens
        )
        .filter(Boolean)
    )
  );

  return (
    <Link href={`/kitchen/recipes/menus/${id}`}>
      <Card
        className="group h-full overflow-hidden rounded-[22px] border-hairline bg-soft-stone shadow-none transition-colors hover:border-ink/20"
        tone="canvas"
      >
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="font-normal text-xl leading-snug tracking-[-0.01em] text-ink">
              {name}
            </CardTitle>
            <div
              className={`flex shrink-0 items-center gap-1 ${isActive ? "text-deep-green" : "text-muted-foreground"}`}
            >
              <CheckCircleIcon className="size-4" />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
                {isActive ? "Live" : "Paused"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {category ? (
              <Badge className="font-normal" variant="outline">
                {category}
              </Badge>
            ) : null}
            <Badge className="font-normal" variant="outline">
              <UsersIcon className="mr-1 size-3" />
              {dishCount} dish{dishCount !== 1 ? "es" : ""}
            </Badge>
          </div>

          {description && (
            <p className="line-clamp-2 text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-3 border-t border-hairline/80 pt-4">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Price
              </div>
              <div className="font-medium text-ink">
                {formatPriceRange(basePrice, pricePerPerson)}
              </div>
            </div>
            {(minGuests || maxGuests) && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Guests
                </div>
                <div className="font-medium text-ink">
                  {formatGuestRange(minGuests, maxGuests)}
                </div>
              </div>
            )}
          </div>

          {/* Dietary Tags */}
          {allDietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allDietaryTags.slice(0, 3).map((tag) => (
                <Badge
                  className="border-pale-green bg-pale-green/80 font-normal text-ink"
                  key={tag}
                  variant="outline"
                >
                  {tag}
                </Badge>
              ))}
              {allDietaryTags.length > 3 && (
                <Badge className="text-xs" variant="outline">
                  +{allDietaryTags.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Allergens */}
          {allAllergens.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allAllergens.slice(0, 2).map((allergen) => (
                <Badge
                  className="border-coral-soft text-xs font-normal text-coral"
                  key={allergen}
                  variant="outline"
                >
                  {allergen}
                </Badge>
              ))}
              {allAllergens.length > 2 && (
                <Badge className="text-xs" variant="outline">
                  +{allAllergens.length - 2} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
