"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
} from "@repo/design-system/components/ui/card";
import {
  AlertTriangle,
  ClipboardList,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { UnresolvedDish, UnresolvedDishReason } from "../actions";

const REASON_LABELS: Record<UnresolvedDishReason, string> = {
  no_recipe: "No recipe linked to this dish",
  no_recipe_version: "Recipe has no saved version",
  no_ingredients: "Recipe version has no ingredients",
};

/** Where the user can actually fix each unresolved reason. */
function fixTarget(dish: UnresolvedDish): { href: string; label: string } {
  if (dish.reason === "no_recipe" || !dish.recipeId) {
    // Dish page hosts the Edit dialog with the recipe picker.
    return {
      href: `/kitchen/recipes/dishes/${dish.dishId}`,
      label: "Link recipe",
    };
  }
  // Missing version or ingredients are fixed on the recipe itself.
  return {
    href: `/kitchen/recipes/${dish.recipeId}`,
    label: "Edit recipe",
  };
}

export function UnresolvedDishList({
  unresolvedDishes,
}: {
  unresolvedDishes: UnresolvedDish[];
}) {
  return (
    <ul className="space-y-2">
      {unresolvedDishes.map((dish) => {
        const fix = fixTarget(dish);
        return (
          <li
            className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
            key={dish.dishId}
          >
            <Link
              className="font-medium underline-offset-4 hover:underline"
              href={`/kitchen/recipes/dishes/${dish.dishId}`}
            >
              {dish.dishName}
            </Link>
            {dish.recipeName && dish.recipeId && (
              <Link
                className="text-muted-foreground underline-offset-4 hover:underline"
                href={`/kitchen/recipes/${dish.recipeId}`}
              >
                (recipe: {dish.recipeName})
              </Link>
            )}
            <Badge variant="outline">{REASON_LABELS[dish.reason]}</Badge>
            <Button asChild className="ml-auto" size="sm" variant="outline">
              <Link href={fix.href}>{fix.label}</Link>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/** Shown before the user (or page load) has attempted generation. */
export function NotGeneratedState() {
  return (
    <Card tone="canvas">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <ClipboardList className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-lg">No prep list yet</h3>
        <p className="max-w-md text-muted-foreground">
          Select an event, adjust batch size and dietary filters if needed,
          then click Generate Prep List to aggregate ingredient demand from the
          event&apos;s menu dishes.
        </p>
      </CardContent>
    </Card>
  );
}

/** Shown when the generate request itself failed. */
export function GenerationErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card tone="canvas">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-4">
          <XCircle className="h-12 w-12 text-destructive" />
        </div>
        <h3 className="mb-2 font-semibold text-lg">Generation failed</h3>
        <p className="mb-6 max-w-md text-muted-foreground">{message}</p>
        <Button onClick={onRetry}>Try Again</Button>
      </CardContent>
    </Card>
  );
}

/** Truthful: generation ran and the event has zero rows in event_dishes. */
export function NoLinkedDishesState({
  onGoToEventMenu,
}: {
  onGoToEventMenu: () => void;
}) {
  return (
    <Card tone="canvas">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-lg">
          No dishes linked to this event
        </h3>
        <p className="mb-6 max-w-md text-muted-foreground">
          Prep lists are generated from the dishes on the event&apos;s menu.
          Add dishes to this event, then regenerate.
        </p>
        <Button onClick={onGoToEventMenu}>Add Dishes to Event</Button>
      </CardContent>
    </Card>
  );
}

/**
 * Truthful: dishes are linked, but none of them could be expanded into
 * ingredients (missing recipe, version, or ingredient rows).
 */
export function AllDishesUnresolvedState({
  linkedDishCount,
  unresolvedDishes,
  onGoToEventMenu,
}: {
  linkedDishCount: number;
  unresolvedDishes: UnresolvedDish[];
  onGoToEventMenu: () => void;
}) {
  return (
    <Card tone="canvas">
      <CardContent className="space-y-6 py-10">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-amber-500/10 p-4">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
          <h3 className="mb-2 font-semibold text-lg">
            Dishes found, but no ingredients could be resolved
          </h3>
          <p className="max-w-lg text-muted-foreground">
            This event has {linkedDishCount} linked dish
            {linkedDishCount === 1 ? "" : "es"}, but none of them could be
            expanded into ingredient demand. Fix the issues below (link
            recipes, save recipe versions, or add ingredients), then
            regenerate.
          </p>
        </div>
        <UnresolvedDishList unresolvedDishes={unresolvedDishes} />
        <div className="flex justify-center">
          <Button onClick={onGoToEventMenu} variant="outline">
            Open Event Menu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Inline warning when some (not all) dishes failed to resolve. */
export function PartiallyUnresolvedAlert({
  unresolvedDishes,
}: {
  unresolvedDishes: UnresolvedDish[];
}) {
  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {unresolvedDishes.length} dish
        {unresolvedDishes.length === 1 ? "" : "es"} not included
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          These linked dishes could not be expanded into ingredients and are
          not part of the totals below:
        </p>
        <UnresolvedDishList unresolvedDishes={unresolvedDishes} />
      </AlertDescription>
    </Alert>
  );
}
