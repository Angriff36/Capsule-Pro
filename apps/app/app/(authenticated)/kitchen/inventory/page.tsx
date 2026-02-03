import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
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
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";

type InventoryItemRow = {
  id: string;
  item_number: string;
  name: string;
  category: string | null;
  quantity_on_hand: number;
  unit_cost: number;
  reorder_level: number;
  tags: string[];
};

type InventoryAlertRow = {
  id: string;
  item_id: string;
  alert_type: string;
  threshold_value: number;
  triggered_at: Date;
  item_name: string;
};

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

const KitchenInventoryPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    return null;
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch inventory items
  const inventoryItems = await database.$queryRaw<InventoryItemRow[]>(
    Prisma.sql`
      SELECT
        id,
        item_number,
        name,
        category,
        quantity_on_hand,
        unit_cost,
        reorder_level,
        tags
      FROM tenant_inventory.inventory_items
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY category ASC, name ASC
      LIMIT 100
    `
  );

  // Fetch low stock alerts
  const lowStockAlerts = await database.$queryRaw<InventoryAlertRow[]>(
    Prisma.sql`
      SELECT
        a.id,
        a.item_id,
        a.alert_type,
        a.threshold_value,
        a.triggered_at,
        i.name AS item_name
      FROM tenant_inventory.inventory_alerts a
      JOIN tenant_inventory.inventory_items i
        ON i.tenant_id = a.tenant_id
        AND i.id = a.item_id
      WHERE a.tenant_id = ${tenantId}
        AND a.deleted_at IS NULL
        AND a.resolved_at IS NULL
        AND a.alert_type = 'low_stock'
      ORDER BY a.triggered_at DESC
      LIMIT 20
    `
  );

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
          <h1 className="text-3xl font-bold tracking-tight">Kitchen Inventory</h1>
          <p className="text-muted-foreground">
            Track kitchen ingredient stock levels, par values, and low stock alerts
          </p>
        </div>

        <Separator />

        {/* Performance Overview Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Performance Overview
          </h2>
          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Total Items</CardDescription>
                <CardTitle className="text-2xl">{inventoryItems.length}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Tracked inventory items
              </CardContent>
            </Card>
            <Card>
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
            <Card>
              <CardHeader>
                <CardDescription>Low Stock</CardDescription>
                <CardTitle className="text-2xl">{lowStockCount}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Below reorder level
              </CardContent>
            </Card>
            <Card>
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
            <h2 className="text-sm font-medium text-muted-foreground">
              Low Stock Alerts ({lowStockAlerts.length})
            </h2>
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  Items Requiring Reorder
                  <Badge className="bg-amber-600">{lowStockAlerts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {lowStockAlerts.map((alert) => (
                    <div
                      className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3"
                      key={alert.id}
                    >
                      <div>
                        <div className="font-medium">{alert.item_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Below {formatQuantity(alert.threshold_value)}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Reorder
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
          <h2 className="text-sm font-medium text-muted-foreground">
            Inventory Items ({inventoryItems.length})
          </h2>
          <Card>
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
                      <TableHead className="text-right">Reorder Level</TableHead>
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
                            {isOut ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : isLow ? (
                              <Badge className="bg-amber-500">Low Stock</Badge>
                            ) : (
                              <Badge variant="secondary">In Stock</Badge>
                            )}
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
