"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  formatCurrency,
  getFSAStatusColor,
  getFSAStatusLabel,
  getStockStatusColor,
  getStockStatusLabel,
} from "../../../../lib/inventory";

interface SerializedItem {
  id: string;
  item_number: string;
  name: string;
  description: string | null;
  category: string;
  unitOfMeasure: string;
  unit_cost: number;
  quantity_on_hand: number;
  par_level: number;
  reorder_level: number;
  supplierId: string | null;
  tags: string[];
  fsa_status: string | null;
  fsa_temp_logged: boolean | null;
  fsa_allergen_info: boolean | null;
  fsa_traceable: boolean | null;
  total_value: number;
  stock_status: string;
  supplier: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface ItemDetailClientProps {
  item: SerializedItem;
}

const ItemDetailClient = ({ item }: ItemDetailClientProps) => {
  const createdDate = new Date(item.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const updatedDate = new Date(item.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const categoryLabel = item.category
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>General item information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {item.description && (
            <div>
              <span className="text-muted-foreground">Description</span>
              <p className="mt-0.5">{item.description}</p>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span className="font-medium">{categoryLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unit of Measure</span>
            <span className="font-medium">{item.unitOfMeasure}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Supplier</span>
            <span className="font-medium">
              {item.supplier?.name ?? "No supplier assigned"}
            </span>
          </div>
          {item.tags.length > 0 && (
            <div>
              <span className="text-muted-foreground">Tags</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock Information</CardTitle>
          <CardDescription>Current inventory levels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quantity on Hand</span>
            <span className="font-medium">
              {item.quantity_on_hand.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Par Level</span>
            <span className="font-medium">{item.par_level.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reorder Level</span>
            <span className="font-medium">{item.reorder_level.toFixed(3)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Stock Status</span>
            <Badge
              className={getStockStatusColor(
                item.stock_status as "in_stock" | "low_stock" | "out_of_stock"
              )}
              variant="outline"
            >
              {getStockStatusLabel(
                item.stock_status as "in_stock" | "low_stock" | "out_of_stock"
              )}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost Information</CardTitle>
          <CardDescription>Pricing and valuation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unit Cost</span>
            <span className="font-medium">
              {formatCurrency(item.unit_cost)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Value</span>
            <span className="font-medium">
              {formatCurrency(item.total_value)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>FSA Compliance</CardTitle>
          <CardDescription>Food safety compliance status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">FSA Status</span>
            <Badge
              className={getFSAStatusColor(
                (item.fsa_status ?? "unknown") as
                  | "compliant"
                  | "non_compliant"
                  | "requires_review"
                  | "exempt"
                  | "unknown"
              )}
              variant="outline"
            >
              {getFSAStatusLabel(
                (item.fsa_status ?? "unknown") as
                  | "compliant"
                  | "non_compliant"
                  | "requires_review"
                  | "exempt"
                  | "unknown"
              )}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Temperature Logged</span>
            <Badge variant={item.fsa_temp_logged ? "default" : "outline"}>
              {item.fsa_temp_logged ? "Yes" : "No"}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Allergen Info</span>
            <Badge variant={item.fsa_allergen_info ? "default" : "outline"}>
              {item.fsa_allergen_info ? "Yes" : "No"}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Traceable</span>
            <Badge variant={item.fsa_traceable ? "default" : "outline"}>
              {item.fsa_traceable ? "Yes" : "No"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle>Record Info</CardTitle>
          <CardDescription>Timestamps and identifiers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Item Number</span>
            <span className="font-mono font-medium">{item.item_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Item ID</span>
            <span className="font-mono text-xs">{item.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{createdDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Updated</span>
            <span>{updatedDate}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { ItemDetailClient };
export type { SerializedItem as ItemDetailData };
