"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import {
  ChefHat,
  Clock,
  MoreVertical,
  Scale,
  Users,
} from "lucide-react";
import { memo } from "react";
import type { CommandBoardCard } from "../../types";

interface RecipeCardProps {
  card: CommandBoardCard;
}

const difficultyConfig = {
  easy: { label: "Easy", color: "bg-green-100 text-green-700" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700" },
  hard: { label: "Hard", color: "bg-red-100 text-red-700" },
};

export const RecipeCard = memo(function RecipeCard({ card }: RecipeCardProps) {
  const metadata = card.metadata as {
    difficulty?: keyof typeof difficultyConfig;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    ingredients?: Array<{ name: string; amount?: string }>;
    steps?: string[];
    yieldAmount?: string;
  };

  const difficulty = metadata.difficulty ?? "easy";
  const difficultyConfigItem =
    difficultyConfig[difficulty] ?? difficultyConfig.easy;

  const totalTime = (metadata.prepTime ?? 0) + (metadata.cookTime ?? 0);
  const ingredients = metadata.ingredients ?? [];
  const steps = metadata.steps ?? [];

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Recipe header with difficulty badge */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ChefHat className="h-4 w-4 text-orange-500" />
          <Badge className={`border-0 ${difficultyConfigItem.color} font-medium text-xs`}>
            {difficultyConfigItem.label}
          </Badge>
        </div>
      </div>

      {/* Recipe title */}
      <h3 className="mb-2 line-clamp-2 font-semibold text-sm">{card.title}</h3>

      {/* Recipe metadata */}
      <div className="mb-3 flex flex-wrap gap-3 text-muted-foreground text-xs">
        {totalTime > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(totalTime)}</span>
          </div>
        )}
        {metadata.servings && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{metadata.servings} servings</span>
          </div>
        )}
        {metadata.yieldAmount && (
          <div className="flex items-center gap-1">
            <Scale className="h-3 w-3" />
            <span>{metadata.yieldAmount}</span>
          </div>
        )}
      </div>

      {/* Ingredients preview */}
      {ingredients.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 font-medium text-foreground text-xs">Ingredients:</p>
          <div className="flex flex-wrap gap-1">
            {ingredients.slice(0, 4).map((ingredient, index) => (
              <Badge
                key={index}
                className="bg-muted text-muted-foreground font-normal text-[10px]"
                variant="outline"
              >
                {ingredient.amount ? `${ingredient.amount} ` : ""}
                {ingredient.name}
              </Badge>
            ))}
            {ingredients.length > 4 && (
              <Badge
                className="bg-muted text-muted-foreground font-normal text-[10px]"
                variant="outline"
              >
                +{ingredients.length - 4} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Steps preview */}
      {steps.length > 0 && (
        <div className="mb-3 flex-1">
          <p className="mb-1.5 font-medium text-foreground text-xs">Steps:</p>
          <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
            {steps[0]}
            {steps.length > 1 && "..."}
          </p>
        </div>
      )}

      {/* Quick actions dropdown */}
      <div className="mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="w-full justify-start gap-2"
              size="sm"
              variant="ghost"
            >
              <MoreVertical className="h-4 w-4" />
              Quick Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <ChefHat className="mr-2 h-4 w-4" />
              View Recipe
            </DropdownMenuItem>
            <DropdownMenuItem>
              Edit Recipe
            </DropdownMenuItem>
            <DropdownMenuItem>
              Scale Recipe
            </DropdownMenuItem>
            <DropdownMenuItem>
              Add to Menu
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
