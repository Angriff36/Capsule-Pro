/**
 * @module DietaryBadges
 * @intent Display dietary restriction badges on recipe/dish cards
 * @responsibility Render colored badges for vegan, vegetarian, GF, DF, etc.
 * @domain Kitchen
 * @tags dietary, badges, vegan, gluten-free, ui
 * @canonical true
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import type { DietaryTag, DIETARY_TAG_CONFIG } from "@/app/lib/dietary-utils";

export interface DietaryBadgeProps {
  /** Dietary tag type */
  tag: DietaryTag | string;
  /** Show icon alongside label */
  showIcon?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Compact mode (icon only) */
  compact?: boolean;
  /** Custom label override */
  label?: string;
  /** Additional class names */
  className?: string;
}

/**
 * Get display configuration for a dietary tag
 */
function getTagConfig(tag: string): {
  label: string;
  color: string;
  icon: string;
} {
  const configs: Record<string, { label: string; color: string; icon: string }> = {
    vegan: {
      label: "Vegan",
      color: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
      icon: "🌱",
    },
    vegetarian: {
      label: "Vegetarian",
      color: "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-700",
      icon: "🥬",
    },
    "gluten-free": {
      label: "GF",
      color: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
      icon: "🌾",
    },
    "dairy-free": {
      label: "DF",
      color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
      icon: "🥛",
    },
    "nut-free": {
      label: "Nut-Free",
      color: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
      icon: "🥜",
    },
    "soy-free": {
      label: "Soy-Free",
      color: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
      icon: "🫘",
    },
    keto: {
      label: "Keto",
      color: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
      icon: "🥑",
    },
    paleo: {
      label: "Paleo",
      color: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-900/30 dark:text-stone-300 dark:border-stone-700",
      icon: "🍖",
    },
    halal: {
      label: "Halal",
      color: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700",
      icon: "☪️",
    },
    kosher: {
      label: "Kosher",
      color: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700",
      icon: "✡️",
    },
    "low-sodium": {
      label: "Low Sodium",
      color: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700",
      icon: "🧂",
    },
    "low-carb": {
      label: "Low Carb",
      color: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700",
      icon: "🍚",
    },
  };

  const normalizedTag = tag.toLowerCase().trim();
  return (
    configs[normalizedTag] || {
      label: tag,
      color: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600",
      icon: "•",
    }
  );
}

/**
 * Size classes for badges
 */
const sizeClasses = {
  sm: "text-xs px-1.5 py-0",
  md: "text-xs px-2 py-0.5",
  lg: "text-sm px-2.5 py-1",
};

export function DietaryBadge({
  tag,
  showIcon = false,
  size = "md",
  compact = false,
  label,
  className = "",
}: DietaryBadgeProps) {
  const config = getTagConfig(tag);
  const displayLabel = label ?? config.label;
  const sizeClass = sizeClasses[size];

  const content = (
    <Badge
      className={`${config.color} ${sizeClass} font-medium border ${className}`}
    >
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {compact ? (
        <span className="sr-only">{displayLabel}</span>
      ) : (
        displayLabel
      )}
      {compact && showIcon && <span aria-hidden="true">{config.icon}</span>}
    </Badge>
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p>{displayLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

export interface DietaryBadgesProps {
  /** Array of dietary tags to display */
  tags: string[];
  /** Maximum number of badges to show before truncating */
  maxVisible?: number;
  /** Show icons alongside labels */
  showIcons?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Compact mode (icons only with tooltips) */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

export function DietaryBadges({
  tags,
  maxVisible = 4,
  showIcons = false,
  size = "md",
  compact = false,
  className = "",
}: DietaryBadgesProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visibleTags.map((tag) => (
        <DietaryBadge
          compact={compact}
          key={tag}
          showIcon={showIcons}
          size={size}
          tag={tag}
        />
      ))}
      {remainingCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                className={`${sizeClasses[size]} bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600`}
              >
                +{remainingCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {tags.slice(maxVisible).map((tag) => (
                  <Badge
                    className="text-xs"
                    key={tag}
                    variant="outline"
                  >
                    {getTagConfig(tag).label}
                  </Badge>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export default DietaryBadges;
