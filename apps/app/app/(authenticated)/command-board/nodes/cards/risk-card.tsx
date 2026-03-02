"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { AlertTriangle, Target, TrendingDown } from "lucide-react";
import { memo } from "react";
import type { ResolvedRisk, RiskSeverity } from "../../types/entities";
import { ENTITY_TYPE_COLORS } from "../../types/entities";

interface RiskNodeCardProps {
  data: ResolvedRisk;
  stale: boolean;
}

/** Color and styling for severity levels */
const severityConfig: Record<
  RiskSeverity,
  { bg: string; text: string; border: string; label: string }
> = {
  critical: {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-800 dark:text-red-200",
    border: "border-red-300 dark:border-red-700",
    label: "Critical",
  },
  high: {
    bg: "bg-orange-100 dark:bg-orange-900/40",
    text: "text-orange-800 dark:text-orange-200",
    border: "border-orange-300 dark:border-orange-700",
    label: "High",
  },
  medium: {
    bg: "bg-yellow-100 dark:bg-yellow-900/40",
    text: "text-yellow-800 dark:text-yellow-200",
    border: "border-yellow-300 dark:border-yellow-700",
    label: "Medium",
  },
  low: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-800 dark:text-blue-200",
    border: "border-blue-300 dark:border-blue-700",
    label: "Low",
  },
};

/** Status badge variant mapping */
const statusVariantMap: Record<
  string,
  "destructive" | "secondary" | "default" | "outline"
> = {
  identified: "destructive",
  monitoring: "secondary",
  mitigating: "default",
  resolved: "outline",
};

/** Category display labels */
const categoryLabels: Record<string, string> = {
  scheduling: "Scheduling",
  resource: "Resource",
  staff: "Staff",
  inventory: "Inventory",
  timeline: "Timeline",
  financial: "Financial",
  compliance: "Compliance",
};

export const RiskNodeCard = memo(function RiskNodeCard({
  data,
  stale,
}: RiskNodeCardProps) {
  const colors = ENTITY_TYPE_COLORS.risk;
  // Fallback to "medium" severity for unknown values
  const severity = severityConfig[data.severity] ?? severityConfig.medium;
  // Fallback to "outline" variant for unknown status values
  const statusVariant = statusVariantMap[data.status] ?? "outline";

  return (
    <div className={cn("flex h-full flex-col gap-1.5", stale && "opacity-50")}>
      {/* Header with severity badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className={cn("size-3.5 shrink-0", colors.icon)} />
          <span className={cn("font-medium text-xs", colors.text)}>Risk</span>
        </div>
        <Badge className="text-[10px] px-1.5 py-0" variant={statusVariant}>
          {data.status ?? "unknown"}
        </Badge>
      </div>

      {/* Severity indicator */}
      <div
        className={cn(
          "rounded border px-2 py-1 text-xs font-medium",
          severity.bg,
          severity.text,
          severity.border
        )}
      >
        {severity.label} -{" "}
        {categoryLabels[data.category] ?? data.category ?? "Unknown"}
      </div>

      {/* Title */}
      <h3 className="line-clamp-2 font-semibold text-sm leading-tight">
        {data.title}
      </h3>

      {/* Description */}
      {data.description && (
        <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
          {data.description}
        </p>
      )}

      {/* Affected entity */}
      <div className="mt-auto flex items-center gap-1.5 text-muted-foreground text-xs">
        <Target className="size-3 shrink-0" />
        <span className="truncate">
          Affects:{" "}
          {data.affectedEntityName ?? data.affectedEntityType ?? "Unknown"}
        </span>
      </div>

      {/* Probability/Impact indicators if available */}
      {(data.probability !== null || data.impact !== null) && (
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          {data.probability !== null && (
            <div className="flex items-center gap-1">
              <span className="text-[10px]">P:</span>
              <span>{Math.round(data.probability * 100)}%</span>
            </div>
          )}
          {data.impact !== null && (
            <div className="flex items-center gap-1">
              <TrendingDown className="size-3" />
              <span>{Math.round(data.impact * 100)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
