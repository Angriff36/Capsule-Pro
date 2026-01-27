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

export type MenuCardProps = {
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
};

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
      <Card className="group overflow-hidden shadow-sm transition-all duration-200 hover:translate-y-[-4px] hover:shadow-md">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between">
            <CardTitle className="font-semibold text-lg leading-tight">
              {name}
            </CardTitle>
            <div className="flex items-center gap-1 text-emerald-600">
              <CheckCircleIcon className="size-4" />
              <span className="text-xs font-medium">
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {category ? <Badge variant="secondary">{category}</Badge> : null}
            <Badge variant="outline">
              <UsersIcon className="mr-1 size-3" />
              {dishCount} dish{dishCount !== 1 ? "es" : ""}
            </Badge>
          </div>

          {description && (
            <p className="line-clamp-2 text-muted-foreground text-sm">
              {description}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Price</div>
              <div className="font-semibold text-sm">
                {formatPriceRange(basePrice, pricePerPerson)}
              </div>
            </div>
            {(minGuests || maxGuests) && (
              <div>
                <div className="text-muted-foreground">Guests</div>
                <div className="font-semibold text-sm">
                  {minGuests && maxGuests
                    ? `${minGuests}-${maxGuests}`
                    : minGuests
                      ? `${minGuests}+`
                      : maxGuests
                        ? `Up to ${maxGuests}`
                        : "-"}
                </div>
              </div>
            )}
          </div>

          {/* Dietary Tags */}
          {allDietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {allDietaryTags.slice(0, 3).map((tag) => (
                <Badge className="bg-green-100 text-green-800" key={tag}>
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
                <Badge className="text-xs" key={allergen} variant="destructive">
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
