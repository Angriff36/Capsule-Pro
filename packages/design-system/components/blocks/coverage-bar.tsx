"use client";

import { cn } from "../../lib/utils";

/**
 * CoverageBar — a reusable progress bar for staffing coverage metrics.
 *
 * Renders a track + fill with three threshold zones:
 *   ≥ thresholdGood   → deep-green (good coverage)
 *   ≥ thresholdWarning → muted-foreground (adequate coverage)
 *   < thresholdWarning → coral (understaffed)
 *
 * Per spec FR-401..404 (specs/staffing/SPEC.md).
 *
 * @param pct - Coverage percentage (0–100)
 * @param height - Track height ("sm" = h-2, "md" = h-3, "lg" = h-4)
 * @param thresholdWarning - Percentage below which coverage is "warning" (default 70)
 * @param thresholdGood - Percentage at or above which coverage is "good" (default 90)
 * @param className - Additional classes on the outer wrapper
 * @param label - Accessible label for the bar (aria-label)
 */
export interface CoverageBarProps {
  className?: string;
  height?: "sm" | "md" | "lg";
  label?: string;
  pct: number;
  thresholdGood?: number;
  thresholdWarning?: number;
}

const heightClasses = {
  sm: "h-2",
  md: "h-3",
  lg: "h-4",
} as const;

type CoverageZone = "good" | "warning" | "critical";

export function getCoverageZone(
  pct: number,
  thresholdWarning: number,
  thresholdGood: number
): CoverageZone {
  if (pct >= thresholdGood) {
    return "good";
  }
  if (pct >= thresholdWarning) {
    return "warning";
  }
  return "critical";
}

const zoneBarClasses: Record<CoverageZone, string> = {
  good: "bg-deep-green",
  warning: "bg-muted-foreground/40",
  critical: "bg-coral",
};

const zoneTextClasses: Record<CoverageZone, string> = {
  good: "text-deep-green",
  warning: "text-muted-foreground",
  critical: "text-coral",
};

export function CoverageBar({
  pct,
  height = "md",
  thresholdWarning = 70,
  thresholdGood = 90,
  className,
  label = "Coverage",
}: CoverageBarProps) {
  const zone = getCoverageZone(pct, thresholdWarning, thresholdGood);
  const h = heightClasses[height];

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={pct}
      className={cn(
        "w-full overflow-hidden rounded-full bg-soft-stone",
        h,
        className
      )}
      data-coverage-pct={pct}
      data-coverage-zone={zone}
      role="progressbar"
    >
      <div
        className={cn("rounded-full transition-all", h, zoneBarClasses[zone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Re-export zone text class helper for consumers that show a text label next to the bar. */
export function coverageTextColor(
  pct: number,
  thresholdWarning = 70,
  thresholdGood = 90
): string {
  return zoneTextClasses[getCoverageZone(pct, thresholdWarning, thresholdGood)];
}
