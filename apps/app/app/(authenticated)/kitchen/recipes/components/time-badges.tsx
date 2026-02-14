import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { ClockIcon, FlameIcon, TimerIcon } from "lucide-react";

interface TimeBadgesProps {
  /** Prep time in minutes */
  prepTime?: number | null;
  /** Cook time in minutes */
  cookTime?: number | null;
  /** Rest time in minutes */
  restTime?: number | null;
  /** Show icons alongside text */
  showIcons?: boolean;
  /** Additional class names for the container */
  className?: string;
}

/**
 * Formats minutes to a human-readable string.
 * Examples: 30 -> "30m", 90 -> "1h 30m", 120 -> "2h"
 */
function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Single time badge component.
 */
function TimeBadge({
  label,
  minutes,
  icon: Icon,
  showIcon = true,
}: {
  label: string;
  minutes: number;
  icon: React.ComponentType<{ className?: string }>;
  showIcon?: boolean;
}) {
  return (
    <Badge
      className="gap-1 text-xs"
      title={`${label}: ${formatTime(minutes)}`}
      variant="outline"
    >
      {showIcon && <Icon className="size-3" />}
      <span>{formatTime(minutes)}</span>
    </Badge>
  );
}

/**
 * Displays prep, cook, and rest time badges for recipes.
 * Only shows badges for times that are provided and > 0.
 */
export function TimeBadges({
  prepTime,
  cookTime,
  restTime,
  showIcons = true,
  className,
}: TimeBadgesProps) {
  const hasAnyTime =
    (prepTime && prepTime > 0) ||
    (cookTime && cookTime > 0) ||
    (restTime && restTime > 0);

  if (!hasAnyTime) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {prepTime && prepTime > 0 && (
        <TimeBadge
          icon={ClockIcon}
          label="Prep"
          minutes={prepTime}
          showIcon={showIcons}
        />
      )}
      {cookTime && cookTime > 0 && (
        <TimeBadge
          icon={FlameIcon}
          label="Cook"
          minutes={cookTime}
          showIcon={showIcons}
        />
      )}
      {restTime && restTime > 0 && (
        <TimeBadge
          icon={TimerIcon}
          label="Rest"
          minutes={restTime}
          showIcon={showIcons}
        />
      )}
    </div>
  );
}

/**
 * Displays total time as a single badge.
 * Sums all provided times.
 */
export function TotalTimeBadge({
  prepTime,
  cookTime,
  restTime,
  className,
}: Omit<TimeBadgesProps, "showIcons">) {
  const total = (prepTime ?? 0) + (cookTime ?? 0) + (restTime ?? 0);

  if (total === 0) {
    return null;
  }

  return (
    <Badge
      className={cn("gap-1 text-xs", className)}
      title={`Total time: ${formatTime(total)}`}
      variant="secondary"
    >
      <ClockIcon className="size-3" />
      <span>{formatTime(total)}</span>
    </Badge>
  );
}
