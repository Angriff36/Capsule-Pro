import type * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

/**
 * MetricCardBlock - A standardized dashboard metric card component
 *
 * Used for displaying single metrics in dashboard grids with consistent hierarchy.
 * Supports various display patterns: basic metrics, trend indicators, and detailed breakdowns.
 *
 * Common usage:
 * - Performance overview cards (revenue, efficiency, etc.)
 * - Focus metrics with descriptions
 * - Variance cards with colored values
 *
 * @example
 * ```tsx
 * <MetricCardBlock
 *   description="Weekly revenue"
 *   value="$142,000"
 *   detail="+8% vs. last week"
 *   trend="up"
 * />
 *
 * <MetricCardBlock
 *   description="Profit margin"
 *   value="21.4%"
 *   detail="Events with real-time budgets aligned"
 * />
 *
 * <MetricCardBlock
 *   description="Total Costs"
 *   value="$12,500"
 *   valueColor="text-emerald-600"
 *   detail={
 *     <div className="space-y-1 text-xs text-muted-foreground">
 *       <div>Food: $4,200</div>
 *       <div>Labor: $6,800</div>
 *       <div>Overhead: $1,500</div>
 *     </div>
 *   }
 * />
 * ```
 */

export type TrendDirection = "up" | "down" | "neutral";

export interface MetricCardBlockProps {
  /**
   * The label/description for the metric (displayed in CardDescription)
   */
  description: React.ReactNode;

  /**
   * The primary value to display (displayed in CardTitle)
   */
  value: React.ReactNode;

  /**
   * Optional detail content to display below the value
   * Can be a simple string or complex React node for multi-line content
   */
  detail?: React.ReactNode;

  /**
   * Optional trend direction indicator
   * When provided, adds an arrow icon before the detail text
   */
  trend?: TrendDirection;

  /**
   * Optional custom color class for the value
   * e.g., "text-emerald-600", "text-red-600"
   */
  valueColor?: string;

  /**
   * Optional custom color class for trend indicator
   * Defaults to green for "up", red for "down"
   */
  trendColor?: string;

  /**
   * Optional CSS class for the Card
   */
  className?: string;

  /**
   * Optional size variant for the value
   * @default "text-2xl"
   */
  valueSize?: "text-xl" | "text-2xl" | "text-3xl";
}

/**
 * Get the default trend icon and color based on direction
 */
function getTrendIndicator(direction: TrendDirection): {
  icon: string;
  defaultColor: string;
} {
  switch (direction) {
    case "up":
      return { icon: "↑", defaultColor: "text-green-600" };
    case "down":
      return { icon: "↓", defaultColor: "text-red-600" };
    case "neutral":
      return { icon: "→", defaultColor: "text-muted-foreground" };
  }
}

/**
 * Standardized metric card for dashboard displays
 */
export function MetricCardBlock({
  description,
  value,
  detail,
  trend,
  valueColor,
  trendColor,
  className,
  valueSize = "text-2xl",
}: MetricCardBlockProps) {
  const trendIndicator = trend !== undefined ? getTrendIndicator(trend) : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle className={`${valueSize} ${valueColor || ""}`}>
          {value}
        </CardTitle>
      </CardHeader>
      {detail && (
        <CardContent>
          {trendIndicator ? (
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs ${
                  trendColor || trendIndicator.defaultColor
                }`}
              >
                {trendIndicator.icon}
              </span>
              <span className="text-muted-foreground text-xs">{detail}</span>
            </div>
          ) : typeof detail === "string" ? (
            <p className="text-muted-foreground text-xs">{detail}</p>
          ) : (
            detail
          )}
        </CardContent>
      )}
    </Card>
  );
}
