"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Progress } from "@repo/design-system/components/ui/progress";
import { cn } from "@repo/design-system/lib/utils";
import { DollarSign, TrendingUp, TrendingDown, Users, Calendar } from "lucide-react";
import { memo } from "react";
import type {
  FinancialHealthStatus,
  ResolvedFinancialProjection,
} from "../../types/entities";
import { ENTITY_TYPE_COLORS } from "../../types/entities";

interface FinancialProjectionNodeCardProps {
  data: ResolvedFinancialProjection;
  stale: boolean;
}

/** Color and styling for health status levels */
const healthStatusConfig: Record<
  FinancialHealthStatus,
  { bg: string; text: string; border: string; label: string; progressColor: string }
> = {
  healthy: {
    bg: "bg-green-100 dark:bg-green-900/40",
    text: "text-green-800 dark:text-green-200",
    border: "border-green-300 dark:border-green-700",
    label: "Healthy",
    progressColor: "bg-green-500",
  },
  warning: {
    bg: "bg-yellow-100 dark:bg-yellow-900/40",
    text: "text-yellow-800 dark:text-yellow-200",
    border: "border-yellow-300 dark:border-yellow-700",
    label: "Warning",
    progressColor: "bg-yellow-500",
  },
  critical: {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-300 dark:border-red-700",
    label: "Critical",
    progressColor: "bg-red-500",
  },
  unknown: {
    bg: "bg-gray-100 dark:bg-gray-900/40",
    text: "text-gray-800 dark:text-gray-200",
    border: "border-gray-300 dark:border-gray-700",
    label: "Unknown",
    progressColor: "bg-gray-500",
  },
};

/** Format currency for display */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format percentage for display */
function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export const FinancialProjectionNodeCard = memo(function FinancialProjectionNodeCard({
  data,
  stale,
}: FinancialProjectionNodeCardProps) {
  const colors = ENTITY_TYPE_COLORS.financial_projection;
  const health = healthStatusConfig[data.healthStatus];

  return (
    <div className={cn("flex h-full flex-col gap-1.5", stale && "opacity-50")}>
      {/* Header with health status badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <DollarSign className={cn("size-3.5 shrink-0", colors.icon)} />
          <span className={cn("font-medium text-xs", colors.text)}>Financial</span>
        </div>
        <Badge
          className={cn("text-[10px] px-1.5 py-0", health.bg, health.text, health.border)}
          variant="outline"
        >
          {health.label}
        </Badge>
      </div>

      {/* Period */}
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <Calendar className="size-3 shrink-0" />
        <span className="truncate">{data.period}</span>
      </div>

      {/* Title */}
      <h3 className="line-clamp-1 font-semibold text-sm leading-tight">
        {data.title}
      </h3>

      {/* Financial metrics */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
        {/* Revenue */}
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[10px]">Revenue</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(data.projectedRevenue)}
          </span>
        </div>

        {/* Costs */}
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[10px]">Costs</span>
          <span className="font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(data.projectedCosts)}
          </span>
        </div>

        {/* Gross Profit */}
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[10px]">Gross Profit</span>
          <span
            className={cn(
              "font-semibold",
              data.grossProfit >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {formatCurrency(data.grossProfit)}
          </span>
        </div>

        {/* Margin */}
        <div className="flex flex-col">
          <span className="text-muted-foreground text-[10px]">Margin</span>
          <div className="flex items-center gap-1">
            {data.grossProfitMargin >= 30 ? (
              <TrendingUp className="size-3 text-green-500" />
            ) : data.grossProfitMargin < 20 ? (
              <TrendingDown className="size-3 text-red-500" />
            ) : null}
            <span
              className={cn(
                "font-semibold",
                data.grossProfitMargin >= 30
                  ? "text-green-600 dark:text-green-400"
                  : data.grossProfitMargin >= 20
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
              )}
            >
              {formatPercentage(data.grossProfitMargin)}
            </span>
          </div>
        </div>
      </div>

      {/* Margin progress bar */}
      <div className="mt-1">
        <Progress
          className="h-1.5"
          value={Math.min(Math.max(data.grossProfitMargin, 0), 100)}
        />
      </div>

      {/* Event and guest count */}
      <div className="mt-auto flex items-center justify-between text-muted-foreground text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3 shrink-0" />
          <span>{data.eventCount} event{data.eventCount !== 1 ? "s" : ""}</span>
        </div>
        {data.totalGuests !== null && (
          <div className="flex items-center gap-1.5">
            <Users className="size-3 shrink-0" />
            <span>{data.totalGuests.toLocaleString()} guests</span>
          </div>
        )}
      </div>

      {/* Cost breakdown if available */}
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
