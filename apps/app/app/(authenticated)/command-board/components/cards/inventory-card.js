"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryCard = void 0;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
exports.InventoryCard = (0, react_1.memo)(function InventoryCard({ card }) {
  const metadata = card.metadata;
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
      icon: lucide_react_1.AlertTriangle,
    },
    ok: {
      label: "In Stock",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      icon: lucide_react_1.Package,
    },
  };
  const config = stockConfig[stockStatus];
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-start justify-between gap-2">
        <badge_1.Badge className="text-xs" variant="outline">
          {category}
        </badge_1.Badge>
        <badge_1.Badge className="text-xs" variant="secondary">
          #{itemNumber}
        </badge_1.Badge>
      </div>

      <h3 className="mb-3 line-clamp-2 font-semibold text-sm">{card.title}</h3>

      <div className="mb-3 flex items-center gap-2">
        <badge_1.Badge className={`${config.color} gap-1`} variant="outline">
          <config.icon className="h-3 w-3" />
          {config.label}
        </badge_1.Badge>
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
        <dropdown_menu_1.DropdownMenu>
          <dropdown_menu_1.DropdownMenuTrigger asChild>
            <button_1.Button
              className="w-full justify-start gap-2"
              size="sm"
              variant="ghost"
            >
              <lucide_react_1.MoreVertical className="h-4 w-4" />
              Quick Actions
            </button_1.Button>
          </dropdown_menu_1.DropdownMenuTrigger>
          <dropdown_menu_1.DropdownMenuContent align="end">
            <dropdown_menu_1.DropdownMenuItem>
              View Item
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem>
              Edit Item
            </dropdown_menu_1.DropdownMenuItem>
            {isLowStock && (
              <dropdown_menu_1.DropdownMenuItem>
                <lucide_react_1.TrendingUp className="mr-2 h-4 w-4 text-emerald-600" />
                Add Stock
              </dropdown_menu_1.DropdownMenuItem>
            )}
            <dropdown_menu_1.DropdownMenuItem>
              <lucide_react_1.TrendingDown className="mr-2 h-4 w-4 text-amber-600" />
              Remove Stock
            </dropdown_menu_1.DropdownMenuItem>
            <dropdown_menu_1.DropdownMenuItem>
              View History
            </dropdown_menu_1.DropdownMenuItem>
          </dropdown_menu_1.DropdownMenuContent>
        </dropdown_menu_1.DropdownMenu>
      </div>
    </div>
  );
});
