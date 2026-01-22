"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import {
  AlertTriangle,
  MoreVertical,
  Package,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { memo } from "react";
import type { CommandBoardCard } from "../../types";

type InventoryCardProps = {
  card: CommandBoardCard;
};

export const InventoryCard = memo(function InventoryCard({
  card,
}: InventoryCardProps) {
  const metadata = card.metadata as {
    itemNumber?: string;
    quantityOnHand?: string | number;
    reorderLevel?: string | number;
    unitCost?: string | number;
    category?: string;
  };
  const itemNumber = metadata.itemNumber || "N/A";
  const quantityOnHand = Number(metadata.quantityOnHand) || 0;
  const reorderLevel = Number(metadata.reorderLevel) || 0;
  const unitCost = Number(metadata.unitCost) || 0;
  const category = metadata.category || "Uncategorized";
  const totalValue = quantityOnHand * unitCost;

  const isLowStock = quantityOnHand <= reorderLevel;
  const stockStatus = isLowStock ? "low" : "ok";

  const stockConfig = {
    low: {
      label: "Low Stock",
      color: "bg-rose-100 text-rose-700 border-rose-200",
      icon: AlertTriangle,
    },
    ok: {
      label: "In Stock",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      icon: Package,
    },
  };

  const config = stockConfig[stockStatus];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-start justify-between gap-2">
        <Badge className="text-xs" variant="outline">
          {category}
        </Badge>
        <Badge className="text-xs" variant="secondary">
          #{itemNumber}
        </Badge>
      </div>

      <h3 className="mb-3 line-clamp-2 font-semibold text-sm">{card.title}</h3>

      <div className="mb-3 flex items-center gap-2">
        <Badge className={`${config.color} gap-1`} variant="outline">
          <config.icon className="h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      <div className="mb-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">On Hand:</span>
          <span className="font-semibold text-sm">
            {quantityOnHand.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Reorder Level:</span>
          <span className="text-xs">{reorderLevel.toLocaleString()}</span>
        </div>
        {unitCost > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Unit Cost:</span>
            <span className="text-xs">${unitCost.toFixed(2)}</span>
          </div>
        )}
        {totalValue > 0 && (
          <div className="flex items-center justify-between border-t pt-1.5">
            <span className="text-muted-foreground text-xs">Total Value:</span>
            <span className="font-semibold text-sm">
              ${totalValue.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {card.content && (
        <p className="mb-3 line-clamp-2 text-muted-foreground text-xs">
          {card.content}
        </p>
      )}

      <div className="mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="w-full justify-start gap-2"
              size="sm"
              variant="ghost"
            >
              <MoreVertical className="h-4 w-4" />
              Quick Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Item</DropdownMenuItem>
            <DropdownMenuItem>Edit Item</DropdownMenuItem>
            {isLowStock && (
              <DropdownMenuItem>
                <TrendingUp className="mr-2 h-4 w-4 text-emerald-600" />
                Add Stock
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <TrendingDown className="mr-2 h-4 w-4 text-amber-600" />
              Remove Stock
            </DropdownMenuItem>
            <DropdownMenuItem>View History</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
