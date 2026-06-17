import { auth } from "@repo/auth/server";
import {
  listInventoryAlerts,
  listInventoryItems,
} from "@/app/lib/manifest-client.generated";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import Link from "next/link";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";

interface InventoryItemRow {
  category: string | null;
  id: string;
  item_number: string;
  name: string;
  quantity_on_hand: number;
  reorder_level: number;
  tags: string[];
  unit_cost: number;
}

interface InventoryAlertRow {
  alert_type: string;
  id: string;
  item_id: string;
  item_name: string;
  threshold_value: number;
  triggered_at: Date;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatQuantity = (qty: number) => {
  if (qty === 0) {
    return "0";
  }
  if (qty < 0.01) {
    return "<0.01";
  }
  return qty.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
};

const renderInventoryStatusBadge = (isOut: boolean, isLow: boolean) => {
  if (isOut) {
    return <Badge variant="destructive">Out of Stock</Badge>;
  }
  if (isLow) {
    return <Badge className="bg-amber-500">Low Stock</Badge>;
  }
  return <Badge variant="secondary">In Stock</Badge>;
};

const KitchenInventoryPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    return null;
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const inventoryItems = (await listInventoryItems()).data
    .filter((item) => item.tenantId === tenantId && !item.deletedAt)
    .map<InventoryItemRow>((item) => ({
      id: item.id,
      item_number: item.item_number || "",
      name: item.name,
      category: item.category ?? null,
      quantity_on_hand: Number(item.quantityOnHand ?? 0),
      unit_cost: Number(item.unitCost ?? 0),
      reorder_level: Number(item.reorder_level ?? 0),
      tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
    }))
    .sort((a, b) => {
      const byCategory = (a.category ?? "").localeCompare(b.category ?? "");
      if (byCategory !== 0) return byCategory;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 100);
  const itemNameById = new Map(inventoryItems.map((item) => [item.id, item.name]));
  const lowStockAlerts = (await listInventoryAlerts()).data
    .filter(
      (alert) =>
        alert.tenantId === tenantId &&
        !alert.resolvedAt &&
        alert.alertType === "low_stock"
    )
    .map<InventoryAlertRow>((alert) => ({
      id: alert.id,
      item_id: alert.itemId,
      alert_type: alert.alertType,
      threshold_value: Number(alert.thresholdValue ?? 0),
      triggered_at: new Date(alert.triggeredAt),
      item_name: itemNameById.get(alert.itemId) ?? "Unknown item",
    }))
    .sort((a, b) => b.triggered_at.getTime() - a.triggered_at.getTime())
    .slice(0, 20);

  // Calculate summary stats
  const totalValue = inventoryItems.reduce(
    (sum, item) => sum + item.quantity_on_hand * item.unit_cost,
    0
  );
  const lowStockCount = inventoryItems.filter(
    (item) => item.quantity_on_hand <= item.reorder_level
  ).length;
  const outOfStockCount = inventoryItems.filter(
    (item) => item.quantity_on_hand <= 0
  ).length;

  return (
    <>
      <Header page="Kitchen Inventory" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div className="space-y-0.5">
          <h1 className="font-semibold text-2xl tracking-tight">
            Kitchen Inventory
          </h1>
          <p className="text-muted-foreground">
            Track kitchen ingredient stock levels, par values, and low stock
            alerts
          </p>
        </div>

        <Separator />

        {/* Performance Overview Section */}
        <section className="space-y-4">
          <h2 className="font-medium text-muted-foreground text-sm">
            Performance Overview
          </h2>
          <div className="grid gap-6 md:grid-cols-4">
            <Card tone="soft-stone">
              <CardHeader>
                <CardDescription>Total Items</CardDescription>
                <CardTitle className="text-2xl">
                  {inventoryItems.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Tracked inventory items
              </CardContent>
            </Card>
            <Card tone="soft-stone">
              <CardHeader>
                <CardDescription>Inventory Value</CardDescription>
                <CardTitle className="text-2xl">
                  {currencyFormatter.format(totalValue)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Total stock value
              </CardContent>
            </Card>
            <Card tone="soft-stone">
              <CardHeader>
                <CardDescription>Low Stock</CardDescription>
                <CardTitle className="text-2xl">{lowStockCount}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Below reorder level
              </CardContent>
            </Card>
            <Card tone="soft-stone">
              <CardHeader>
                <CardDescription>Out of Stock</CardDescription>
                <CardTitle className="text-2xl">{outOfStockCount}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Needs immediate attention
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Low Stock Alerts Section */}
        {lowStockAlerts.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-medium text-muted-foreground text-sm">
              Low Stock Alerts ({lowStockAlerts.length})
            </h2>
            <Card className="border-amber-900/20 bg-amber-900/10" tone="canvas">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  Items Requiring Reorder
                  <Badge className="bg-amber-600">
                    {lowStockAlerts.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {lowStockAlerts.map((alert) => (
                    <div
                      className="flex items-center justify-between rounded-lg border border-amber-900/20 bg-white p-3"
                      key={alert.id}
                    >
                      <div>
                        <div className="font-medium">{alert.item_name}</div>
                        <div className="text-muted-foreground text-sm">
                          Below {formatQuantity(alert.threshold_value)}
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/procurement/purchase-orders/new?itemId=${alert.item_id}&itemName=${encodeURIComponent(alert.item_name)}`}
                        >
                          Reorder
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Inventory Items Section */}
        <section className="space-y-4">
          <h2 className="font-medium text-muted-foreground text-sm">
            Inventory Items ({inventoryItems.length})
          </h2>
          <Card tone="canvas">
            <CardContent className="p-0">
              {inventoryItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">
                    No inventory items found. Add items to track stock levels.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">
                        Reorder Level
                      </TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.map((item) => {
                      const isLow = item.quantity_on_hand <= item.reorder_level;
                      const isOut = item.quantity_on_hand <= 0;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-sm">
                            {item.item_number}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          <TableCell>
                            {item.category && (
                              <Badge variant="outline">{item.category}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatQuantity(item.quantity_on_hand)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatQuantity(item.reorder_level)}
                          </TableCell>
                          <TableCell className="text-right">
                            {currencyFormatter.format(item.unit_cost)}
                          </TableCell>
                          <TableCell>
                            {renderInventoryStatusBadge(isOut, isLow)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
};

export default KitchenInventoryPage;
