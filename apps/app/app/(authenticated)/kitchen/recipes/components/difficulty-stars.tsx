import { cn } from "@repo/design-system/lib/utils";
import { StarIcon } from "lucide-react";

interface DifficultyStarsProps {
  /** Difficulty rating from 1 to 5 */
  rating: number;
  /** Maximum stars to display */
  max?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Additional class names */
  className?: string;
}

const sizeClasses = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
};

/** Pre-generated stable keys for star ratings (never reorders). */
const STAR_KEYS = Array.from({ length: 10 }, (_, i) => `star-${i}`);

/**
 * Displays difficulty as a 1-5 star rating.
 * Filled stars indicate the difficulty level.
 */
export function DifficultyStars({
  rating,
  max = 5,
  size = "md",
  className,
}: DifficultyStarsProps) {
  // Clamp rating between 0 and max
  const clampedRating = Math.max(0, Math.min(rating, max));
  const sizeClass = sizeClasses[size];

  const stars = STAR_KEYS.slice(0, max).map((key, i) => (
    <StarIcon
      aria-hidden="true"
      className={cn(
        sizeClass,
        i < clampedRating
          ? "fill-amber-400 text-amber-400"
          : "fill-muted text-muted-foreground/30"
      )}
      key={key}
    />
  ));

  return (
    <div
      aria-label={`Difficulty: ${clampedRating} out of ${max} stars`}
      className={cn("flex items-center gap-0.5", className)}
      role="img"
    >
      {stars}
    </div>
  );
}

/**
 * Labeled version of DifficultyStars for recipe cards.
 */
export function DifficultyRating({
  rating,
  label = "Difficulty",
  size = "sm",
  className,
}: DifficultyStarsProps & { label?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <DifficultyStars rating={rating} size={size} />
    </div>
  );
}
