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
import { Progress } from "@repo/design-system/components/ui/progress";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BoxesIcon,
  ClipboardListIcon,
  PackageIcon,
  PackagePlusIcon,
  RefreshCwIcon,
  TruckIcon,
  WarehouseIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";
import { Header } from "../components/header";
import { RecentActivityCard } from "./components/recent-activity-card";
import { StockAlertsCard } from "./components/stock-alerts-card";
import {
  calculateInventoryMetrics,
  getStockHealthStatus,
  type StockHealthStatus,
  stockHealthBadgeVariants,
  stockHealthLabels,
} from "./lib/inventory-status";

const WarehouseDashboardPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch inventory items with stock levels
  const inventoryItems = await database.$queryRaw<
    Array<{
      id: string;
      tenant_id: string;
      item_number: string;
      name: string;
      category: string;
      unit_cost: number;
      quantity_on_hand: number;
      reorder_level: number;
      tags: string[];
      created_at: Date;
    }>
  >(
    Prisma.sql`
      SELECT
        id,
        tenant_id,
        item_number,
        name,
        category,
        unit_cost,
        quantity_on_hand,
        reorder_level,
        tags,
        created_at
      FROM tenant_inventory.inventory_items
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
      ORDER BY name ASC
    `
  );

  // Calculate metrics
  const itemsForMetrics = inventoryItems.map((item) => ({
    quantityOnHand: Number(item.quantity_on_hand),
    reorderLevel: Number(item.reorder_level),
  }));

  const metrics = calculateInventoryMetrics(itemsForMetrics);

  // Get items that need attention (low or critical stock)
  const alertItems = inventoryItems
    .map((item) => {
      const qoh = Number(item.quantity_on_hand);
      const reorder = Number(item.reorder_level);
      return {
        id: item.id,
        name: item.name,
        itemNumber: item.item_number,
        category: item.category,
        quantityOnHand: qoh,
        reorderLevel: reorder,
        status: getStockHealthStatus(qoh, reorder),
      };
    })
    .filter((item) => item.status !== "healthy")
    .sort((a, b) => {
      // Sort by severity: out_of_stock > critical > low
      const order: Record<StockHealthStatus, number> = {
        out_of_stock: 0,
        critical: 1,
        low: 2,
        healthy: 3,
      };
      return order[a.status] - order[b.status];
    });

  // Fetch recent transactions
  const recentTransactions = await database.$queryRaw<
    Array<{
      id: string;
      item_id: string;
      item_name: string;
      transaction_type: string;
      quantity: number;
      transaction_date: Date;
      reference: string | null;
    }>
  >(
    Prisma.sql`
      SELECT
        t.id,
        t.item_id,
        i.name as item_name,
        t.transaction_type,
        t.quantity,
        t.transaction_date,
        t.reference
      FROM tenant_inventory.inventory_transactions t
      LEFT JOIN tenant_inventory.inventory_items i
        ON i.tenant_id = t.tenant_id AND i.id = t.item_id
      WHERE t.tenant_id = ${tenantId}::uuid
      ORDER BY t.transaction_date DESC
      LIMIT 10
    `
  );

  const transactions = recentTransactions.map((t) => ({
    id: t.id,
    itemName: t.item_name ?? "Unknown Item",
    transactionType: t.transaction_type,
    quantity: Number(t.quantity),
    transactionDate: t.transaction_date,
    reference: t.reference,
  }));

  // Fetch pending purchase orders
  const pendingOrders = await database.$queryRaw<
    Array<{
      id: string;
      po_number: string;
      vendor_id: string;
      status: string;
      total: number;
      expected_delivery_date: Date | null;
      item_count: bigint;
    }>
  >(
    Prisma.sql`
      SELECT
        po.id,
        po.po_number,
        po.vendor_id,
        po.status,
        po.total,
        po.expected_delivery_date,
        COUNT(poi.id) as item_count
      FROM tenant_inventory.purchase_orders po
      LEFT JOIN tenant_inventory.purchase_order_items poi
        ON poi.tenant_id = po.tenant_id AND poi.purchase_order_id = po.id
      WHERE po.tenant_id = ${tenantId}::uuid
        AND po.deleted_at IS NULL
        AND po.status IN ('submitted', 'approved', 'ordered', 'partial')
      GROUP BY po.id, po.po_number, po.vendor_id, po.status, po.total, po.expected_delivery_date
      ORDER BY po.expected_delivery_date ASC NULLS LAST
      LIMIT 5
    `
  );

  // Fetch pending shipments count
  const shipmentCounts = await database.$queryRaw<
    [{ inbound: bigint; outbound: bigint }]
  >(
    Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('draft', 'scheduled', 'in_transit') AND supplier_id IS NOT NULL) as inbound,
        COUNT(*) FILTER (WHERE status IN ('draft', 'scheduled', 'in_transit') AND event_id IS NOT NULL) as outbound
      FROM tenant_inventory.shipments
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
    `
  );

  const inboundCount = Number(shipmentCounts[0]?.inbound ?? 0);
  const outboundCount = Number(shipmentCounts[0]?.outbound ?? 0);

  // Calculate total inventory value
  const totalValue = inventoryItems.reduce((sum, item) => {
    return sum + Number(item.quantity_on_hand) * Number(item.unit_cost);
  }, 0);

  // Get category breakdown
  const categoryBreakdown = inventoryItems.reduce(
    (acc, item) => {
      const cat = item.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const topCategories = Object.entries(categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <>
      <Header page="Warehouse Dashboard" pages={["Warehouse"]}>
        <div className="flex items-center gap-3 px-4">
          <Badge className="text-sm font-medium" variant="outline">
            {metrics.totalItems} Items
          </Badge>
          {metrics.healthPercentage >= 80 ? (
            <Badge className="gap-1" variant="default">
              <WarehouseIcon className="size-3" />
              {metrics.healthPercentage}% Healthy
            </Badge>
          ) : (
            <Badge className="gap-1" variant="secondary">
              <AlertTriangleIcon className="size-3" />
              {alertItems.length} need attention
            </Badge>
          )}
          <Button asChild size="sm" variant="ghost">
            <Link href="/warehouse">
              <RefreshCwIcon className="size-4 mr-1" />
              Refresh
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/warehouse/receiving">
              <PackagePlusIcon className="size-4 mr-1" />
              Receive Stock
            </Link>
          </Button>
        </div>
      </Header>

      <Separator />

      <div className="flex flex-1 gap-8 p-4 pt-0">
        {/* Left Sidebar */}
        <aside className="hidden w-72 shrink-0 flex-col gap-8 lg:flex">
          {/* Quick Navigation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                asChild
                className="w-full justify-start"
                variant="outline"
              >
                <Link href="/warehouse/receiving">
                  <PackagePlusIcon className="size-4 mr-2" />
                  Receiving
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start"
                variant="outline"
              >
                <Link href="/warehouse/shipments">
                  <TruckIcon className="size-4 mr-2" />
                  Shipments
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start"
                variant="outline"
              >
                <Link href="/warehouse/audits">
                  <ClipboardListIcon className="size-4 mr-2" />
                  Cycle Counts
                </Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start"
                variant="outline"
              >
                <Link href="/inventory/items">
                  <BoxesIcon className="size-4 mr-2" />
                  All Items
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Stock Alerts */}
          <StockAlertsCard alerts={alertItems} maxItems={4} />

          {/* Category Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">By Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topCategories.map(([category, count]) => (
                <div
                  className="flex items-center justify-between text-sm"
                  key={category}
                >
                  <span className="text-muted-foreground capitalize truncate max-w-32">
                    {category}
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
              {Object.keys(categoryBreakdown).length > 5 && (
                <Link
                  className="text-xs text-muted-foreground hover:text-primary"
                  href="/inventory/items"
                >
                  +{Object.keys(categoryBreakdown).length - 5} more categories
                </Link>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col gap-8">
          {/* Stats Cards Row */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              Performance Overview
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <BoxesIcon className="size-4" />
                    Total SKUs
                  </CardDescription>
                  <CardTitle className="text-3xl">
                    {metrics.totalItems}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Progress
                      className="h-1.5 flex-1"
                      value={metrics.healthPercentage}
                    />
                    <span className="text-xs text-muted-foreground">
                      {metrics.healthPercentage}% healthy
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <AlertTriangleIcon className="size-4" />
                    Stock Alerts
                  </CardDescription>
                  <CardTitle
                    className={`text-3xl ${alertItems.length > 0 ? "text-destructive" : ""}`}
                  >
                    {alertItems.length}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1">
                  {metrics.outOfStockCount > 0 && (
                    <Badge className="text-xs" variant="destructive">
                      {metrics.outOfStockCount} out
                    </Badge>
                  )}
                  {metrics.criticalCount > 0 && (
                    <Badge className="text-xs" variant="destructive">
                      {metrics.criticalCount} critical
                    </Badge>
                  )}
                  {metrics.lowCount > 0 && (
                    <Badge className="text-xs" variant="secondary">
                      {metrics.lowCount} low
                    </Badge>
                  )}
                  {alertItems.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      All items healthy
                    </span>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TruckIcon className="size-4" />
                    Pending Shipments
                  </CardDescription>
                  <CardTitle className="text-3xl">
                    {inboundCount + outboundCount}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-3 text-sm text-muted-foreground">
                  <span>{inboundCount} inbound</span>
                  <span>{outboundCount} outbound</span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <PackageIcon className="size-4" />
                    Inventory Value
                  </CardDescription>
                  <CardTitle className="text-3xl">
                    $
                    {totalValue.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {inventoryItems.length > 0
                    ? `$${(totalValue / inventoryItems.length).toFixed(2)} avg per SKU`
                    : "No items"}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Main Grid */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              Inventory Activity
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Activity */}
              <RecentActivityCard maxItems={6} transactions={transactions} />

              {/* Pending Purchase Orders */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Pending Purchase Orders
                    </CardTitle>
                    <Badge className="text-xs" variant="outline">
                      {pendingOrders.length} orders
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Orders awaiting delivery
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pendingOrders.length > 0 ? (
                    pendingOrders.map((po) => (
                      <Link
                        className="group block"
                        href={`/warehouse/receiving?po=${po.po_number}`}
                        key={po.id}
                      >
                        <div className="flex items-center justify-between gap-2 rounded-md border p-2 transition hover:bg-muted/50">
                          <div className="min-w-0">
                            <p className="text-sm font-medium group-hover:text-primary">
                              {po.po_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {Number(po.item_count)} items
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                ${Number(po.total).toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {po.status}
                              </p>
                            </div>
                            <ArrowRightIcon className="size-4 text-muted-foreground group-hover:text-primary" />
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      No pending orders
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Low Stock Items Table */}
          {alertItems.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Items Requiring Attention
                </h2>
                <Button asChild size="sm" variant="outline">
                  <Link href="/inventory/items?filter=low_stock">
                    View All
                    <ArrowRightIcon className="size-4 ml-1" />
                  </Link>
                </Button>
              </div>
              <Card>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {alertItems.slice(0, 6).map((item) => (
                      <Link
                        className="group"
                        href={`/inventory/items?highlight=${item.id}`}
                        key={item.id}
                      >
                        <Card className="transition hover:border-primary/40 hover:shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate group-hover:text-primary">
                                  {item.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.itemNumber}
                                </p>
                              </div>
                              <Badge
                                className="text-xs shrink-0"
                                variant={stockHealthBadgeVariants[item.status]}
                              >
                                {stockHealthLabels[item.status]}
                              </Badge>
                            </div>
                            <div className="mt-3 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  On Hand
                                </span>
                                <span className="font-medium">
                                  {item.quantityOnHand.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Reorder At
                                </span>
                                <span>
                                  {item.reorderLevel.toLocaleString()}
                                </span>
                              </div>
                              <Progress
                                className="h-1.5 mt-2"
                                value={Math.min(
                                  (item.quantityOnHand / item.reorderLevel) *
                                    100,
                                  100
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default WarehouseDashboardPage;
