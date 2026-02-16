"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { AlertTriangle, Package } from "lucide-react";
import { memo } from "react";
import type { ResolvedInventoryItem } from "../../types/entities";
import { ENTITY_TYPE_COLORS } from "../../types/entities";

interface InventoryNodeCardProps {
  data: ResolvedInventoryItem;
  stale: boolean;
}

export const InventoryNodeCard = memo(function InventoryNodeCard({
  data,
  stale,
}: InventoryNodeCardProps) {
  const colors = ENTITY_TYPE_COLORS.inventory_item;
  const isLowStock =
    data.parLevel != null && data.quantityOnHand <= data.parLevel;

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
        {isLowStock && (
          <Badge
            className="gap-1 text-xs"
            variant="destructive"
          >
            <AlertTriangle className="size-3" />
            Low Stock
          </Badge>
        )}

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">On Hand:</span>
          <span className="font-semibold text-sm">
            {data.quantityOnHand.toLocaleString()}
            {data.unit ? ` ${data.unit}` : ""}
          </span>
        </div>

        {data.parLevel != null && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Par Level:</span>
            <span className="text-xs">
              {data.parLevel.toLocaleString()}
              {data.unit ? ` ${data.unit}` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
