"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Progress } from "@repo/design-system/components/ui/progress";
import { cn } from "@repo/design-system/lib/utils";
import {
  AlertTriangle,
  CheckCircle,
  Package,
  PackageX,
  TrendingDown,
} from "lucide-react";
import { memo } from "react";
import type { ResolvedInventoryItem } from "../../types/entities";
import {
  calculateInventoryThreshold,
  ENTITY_TYPE_COLORS,
  getInventoryThresholdLabel,
  type InventoryThreshold,
} from "../../types/entities";

/**
 * Get icon component for inventory threshold status.
 */
function getThresholdIcon(status: InventoryThreshold) {
  switch (status) {
    case "out_of_stock":
      return <PackageX className="size-3" />;
    case "critical":
      return <AlertTriangle className="size-3" />;
    case "low":
      return <TrendingDown className="size-3" />;
    case "good":
      return <CheckCircle className="size-3" />;
    default: {
      const _exhaustive: never = status;
      return null;
    }
  }
}

/**
 * Badge variants for inventory threshold status.
 */
const thresholdBadgeVariants: Record<
  InventoryThreshold,
  "default" | "secondary" | "destructive" | "outline"
> = {
  good: "default",
  low: "secondary",
  critical: "destructive",
  out_of_stock: "destructive",
};

/**
 * Get progress bar color class based on inventory threshold status.
 */
function getProgressColorClass(status: InventoryThreshold): string {
  switch (status) {
    case "out_of_stock":
      return "[&>div]:bg-destructive";
    case "critical":
      return "[&>div]:bg-destructive";
    case "low":
      return "[&>div]:bg-amber-500";
    case "good":
      return "[&>div]:bg-green-500";
    default: {
      const _exhaustive: never = status;
      return "";
    }
  }
}

interface InventoryNodeCardProps {
  data: ResolvedInventoryItem;
  stale: boolean;
}

export const InventoryNodeCard = memo(function InventoryNodeCard({
  data,
  stale,
}: InventoryNodeCardProps) {
  const colors = ENTITY_TYPE_COLORS.inventory_item;
  const thresholdStatus = calculateInventoryThreshold(
    data.quantityOnHand,
    data.parLevel,
    data.reorderLevel
  );
  const showHealthIndicator = data.parLevel != null && data.parLevel > 0;
  const stockPercentage =
    data.parLevel != null && data.parLevel > 0
      ? Math.min((data.quantityOnHand / data.parLevel) * 100, 100)
      : 100;

  return (
    <div className={cn("flex h-full flex-col", stale && "opacity-50")}>
      {/* Header */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Package className={cn("size-3.5 shrink-0", colors.icon)} />
          <span className={cn("font-medium text-xs", colors.text)}>
            Inventory
          </span>
        </div>
        {data.category && (
          <Badge className="text-xs" variant="outline">
            {data.category}
          </Badge>
        )}
      </div>

      {/* Name */}
      <h3 className="mb-1.5 line-clamp-2 font-semibold text-sm leading-tight">
        {data.name}
      </h3>

      {/* Stock info */}
      <div className="space-y-1.5">
        {/* Stock health badge - only show if not healthy */}
        {showHealthIndicator && thresholdStatus !== "good" && (
          <Badge
            className="gap-1 text-xs"
            variant={thresholdBadgeVariants[thresholdStatus]}
          >
            {getThresholdIcon(thresholdStatus)}
            {getInventoryThresholdLabel(thresholdStatus)}
          </Badge>
        )}

        {/* Progress bar for stock level visualization */}
        {showHealthIndicator && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Stock Level</span>
              <span className="font-medium">
                {Math.round(stockPercentage)}%
              </span>
            </div>
            <Progress
              className={cn("h-1.5", getProgressColorClass(thresholdStatus))}
              value={stockPercentage}
            />
          </div>
        )}

        {/* Quantity on hand */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">On Hand:</span>
          <span
            className={cn(
              "font-semibold text-sm",
              thresholdStatus === "out_of_stock" && "text-destructive"
            )}
          >
            {data.quantityOnHand.toLocaleString()}
            {data.unit ? ` ${data.unit}` : ""}
          </span>
        </div>

        {/* Par level */}
        {data.parLevel != null && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Par Level:</span>
            <span className="text-xs">
              {data.parLevel.toLocaleString()}
              {data.unit ? ` ${data.unit}` : ""}
            </span>
          </div>
        )}

        {/* Reorder level */}
        {data.reorderLevel != null && data.reorderLevel > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Reorder At:</span>
            <span
              className={cn(
                "text-xs",
                data.quantityOnHand <= data.reorderLevel &&
                  "text-destructive font-medium"
              )}
            >
              {data.reorderLevel.toLocaleString()}
              {data.unit ? ` ${data.unit}` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
