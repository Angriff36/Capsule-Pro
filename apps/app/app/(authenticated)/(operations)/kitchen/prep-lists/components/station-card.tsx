"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { format } from "date-fns";
import {
  Calendar,
  Check,
  ChefHat,
  Clock,
  Flame,
  Leaf,
  RefreshCw,
  Snowflake,
  UtensilsCrossed,
} from "lucide-react";
import type { IngredientItem, StationPrepList } from "../actions";

const STATION_ICONS = {
  "hot-line": Flame,
  "cold-prep": Snowflake,
  bakery: ChefHat,
  "prep-station": UtensilsCrossed,
  garnish: Leaf,
};

function getIngredientReviewTitle(
  hasSavedPrepList: boolean,
  isReviewed: boolean
) {
  if (!hasSavedPrepList) {
    return "Save prep list first";
  }

  return isReviewed ? "Reviewed" : "Mark reviewed";
}

export function StationCard({
  station,
  isExpanded,
  onToggle,
  reviewedIngredients,
  onReviewIngredient,
  savedPrepListId,
}: {
  station: StationPrepList;
  isExpanded: boolean;
  onToggle: () => void;
  reviewedIngredients: Set<string>;
  onReviewIngredient: (ingredientId: string) => void;
  savedPrepListId: string | null;
}) {
  const Icon =
    STATION_ICONS[station.stationId as keyof typeof STATION_ICONS] ||
    UtensilsCrossed;

  return (
    <Card tone="canvas">
      <CardHeader
        className="cursor-pointer transition-colors hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${station.color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{station.stationName}</CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>{station.totalIngredients} ingredients</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {station.estimatedTime}h est.
                </span>
              </div>
            </div>
          </div>
          <Button
            aria-label="Toggle details"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            {isExpanded ? (
              <Check className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-6">
          {station.ingredients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <UtensilsCrossed className="mb-2 h-8 w-8" />
              <p className="text-sm">No ingredients for this station</p>
            </div>
          ) : (
            <div className="space-y-4">
              {station.ingredients.map((ingredient: IngredientItem) => (
                <div
                  className="flex flex-col gap-1 rounded-lg border p-3"
                  key={ingredient.ingredientId}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {ingredient.ingredientName}
                        </span>
                        {ingredient.isOptional && (
                          <Badge className="text-xs" variant="secondary">
                            Optional
                          </Badge>
                        )}
                        {ingredient.allergens.length > 0 && (
                          <Badge className="text-xs" variant="outline">
                            {ingredient.allergens.join(", ")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground text-sm">
                        <span>
                          {ingredient.scaledQuantity} {ingredient.scaledUnit}
                        </span>
                        {ingredient.preparationNotes && (
                          <span className="italic">
                            {ingredient.preparationNotes}
                          </span>
                        )}
                      </div>
                      {ingredient.dietarySubstitutions.length > 0 && (
                        <div className="mt-2 rounded-md bg-muted/50 p-2 text-foreground text-xs">
                          <strong>Substitution:</strong>{" "}
                          {ingredient.dietarySubstitutions.join("; ")}
                        </div>
                      )}
                    </div>
                    <Button
                      aria-label={
                        reviewedIngredients.has(ingredient.ingredientId)
                          ? "Mark as unreviewed"
                          : "Mark ingredient reviewed"
                      }
                      className={`h-8 w-8 shrink-0 ${reviewedIngredients.has(ingredient.ingredientId) ? "bg-primary/10 text-primary" : ""}`}
                      disabled={!savedPrepListId}
                      onClick={() =>
                        onReviewIngredient(ingredient.ingredientId)
                      }
                      size="icon"
                      title={getIngredientReviewTitle(
                        Boolean(savedPrepListId),
                        reviewedIngredients.has(ingredient.ingredientId)
                      )}
                      type="button"
                      variant="ghost"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {station.tasks.length > 0 && (
            <div className="mt-6 space-y-4">
              <Separator />
              <h4 className="font-medium text-muted-foreground text-sm">
                Production Tasks
              </h4>
              <div className="space-y-2">
                {station.tasks.map(
                  (task: {
                    id: string;
                    name: string;
                    dueDate: Date;
                    status: string;
                    priority: number;
                  }) => (
                    <div
                      className="flex items-center justify-between rounded-lg border p-3"
                      key={task.id}
                    >
                      <div>
                        <div className="font-medium">{task.name}</div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          Due {format(new Date(task.dueDate), "MMM d, yyyy")}
                        </div>
                      </div>
                      <Badge
                        variant={
                          task.priority === 1 ? "destructive" : "secondary"
                        }
                      >
                        {task.priority === 1 ? "High" : "Normal"}
                      </Badge>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function StationSkeleton() {
  return (
    <Card tone="canvas">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton className="h-20 w-full rounded-lg" key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
