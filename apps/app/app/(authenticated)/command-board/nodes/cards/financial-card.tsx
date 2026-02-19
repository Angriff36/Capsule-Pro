"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import {
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { memo } from "react";
import type {
  FinancialHealthStatus,
  ResolvedFinancialProjection,
} from "../../types/entities";
import { ENTITY_TYPE_COLORS } from "../../types/entities";

interface FinancialNodeCardProps {
  data: ResolvedFinancialProjection;
  stale: boolean;
}

/** Color and styling for health status */
const healthStatusConfig: Record<
  FinancialHealthStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  healthy: {
    bg: "bg-green-100 dark:bg-green-900/40",
    text: "text-green-800 dark:text-green-200",
    border: "border-green-300 dark:border-green-700",
    label: "Healthy",
  },
  warning: {
    bg: "bg-yellow-100 dark:bg-yellow-900/40",
    text: "text-yellow-800 dark:text-yellow-200",
    border: "border-yellow-300 dark:border-yellow-700",
    label: "Warning",
  },
  critical: {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-300 dark:border-red-700",
    label: "Critical",
  },
  unknown: {
    bg: "bg-gray-100 dark:bg-gray-900/40",
    text: "text-gray-800 dark:text-gray-200",
    border: "border-gray-300 dark:border-gray-700",
    label: "Unknown",
  },
};

/** Format currency value */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Get margin bar color based on percentage */
function getMarginColor(margin: number): string {
  if (margin >= 30) {
    return "bg-green-500";
  }
  if (margin >= 20) {
    return "bg-yellow-500";
  }
  if (margin >= 10) {
    return "bg-orange-500";
  }
  return "bg-red-500";
}

export const FinancialNodeCard = memo(function FinancialNodeCard({
  data,
  stale,
}: FinancialNodeCardProps) {
  const colors = ENTITY_TYPE_COLORS.financial_projection;
  const health = healthStatusConfig[data.healthStatus];

  return (
    <div className={cn("flex h-full flex-col gap-1.5", stale && "opacity-50")}>
      {/* Header with health status badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <DollarSign className={cn("size-3.5 shrink-0", colors.icon)} />
          <span className={cn("font-medium text-xs", colors.text)}>
            Financial
          </span>
        </div>
        <Badge
          className={cn("text-[10px] px-1.5 py-0", health.bg, health.text)}
          variant="outline"
        >
          {health.label}
        </Badge>
      </div>

      {/* Period label */}
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Calendar className="size-3" />
        <span>{data.period}</span>
      </div>

      {/* Title */}
      <h3 className="line-clamp-1 font-semibold text-sm leading-tight">
        {data.title}
      </h3>

      {/* Revenue vs Costs */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <TrendingUp className="size-3 text-green-600 dark:text-green-400" />
          <span className="font-medium">
            {formatCurrency(data.projectedRevenue)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="size-3 text-red-600 dark:text-red-400" />
          <span>{formatCurrency(data.projectedCosts)}</span>
        </div>
      </div>

      {/* Gross Profit */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">Gross Profit</span>
        <span
          className={cn(
            "font-semibold text-sm",
            data.grossProfit >= 0
              ? "text-green-700 dark:text-green-300"
              : "text-red-700 dark:text-red-300"
          )}
        >
          {formatCurrency(data.grossProfit)}
        </span>
      </div>

      {/* Margin progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Margin</span>
          <span className="font-medium">
            {data.grossProfitMargin.toFixed(1)}%
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "absolute left-0 top-0 h-full rounded-full transition-all",
              getMarginColor(data.grossProfitMargin)
            )}
            style={{ width: `${Math.min(data.grossProfitMargin, 100)}%` }}
          />
        </div>
      </div>

      {/* Event and guest counts */}
      <div className="mt-auto flex items-center gap-3 text-muted-foreground text-xs">
        <div className="flex items-center gap-1">
          <Calendar className="size-3" />
          <span>{data.eventCount} events</span>
        </div>
        {data.totalGuests !== null && (
          <div className="flex items-center gap-1">
            <Users className="size-3" />
            <span>{data.totalGuests.toLocaleString()} guests</span>
          </div>
        )}
      </div>

      {/* Cost breakdown (if available) */}
      {data.breakdown && (
        <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
          <span>Food: {formatCurrency(data.breakdown.foodCost)}</span>
          <span>Labor: {formatCurrency(data.breakdown.laborCost)}</span>
          <span>Other: {formatCurrency(data.breakdown.otherCost)}</span>
        </div>
      )}
    </div>
  );
});
