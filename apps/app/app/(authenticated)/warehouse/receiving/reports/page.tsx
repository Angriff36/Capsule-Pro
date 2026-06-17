import { listInventorySuppliers, listPurchaseOrderItems, listPurchaseOrders } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { AlertCircle, TrendingUp } from "lucide-react";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";

interface SupplierMetricsRow {
  average_lead_time: number;
  discrepancy_rate: number;
  on_time_deliveries: bigint;
  quality_score: number;
  supplier_name: string;
  total_orders: bigint;
  total_spent: number;
}

interface ReceivingSummaryRow {
  average_quality_score: number;
  pending_items: bigint;
  total_discrepancies: bigint;
  total_items_received: bigint;
  total_pos_received: bigint;
}

interface DiscrepancyBreakdownRow {
  count: bigint;
  discrepancy_type: string;
}

const getScoreBadgeVariant = (
  score: number
): "default" | "secondary" | "destructive" | "outline" => {
  if (score >= 4.5) {
    return "default";
  }
  if (score >= 3.5) {
    return "secondary";
  }
  return "destructive";
};

const formatDiscrepancyType = (type: string): string =>
  type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const discrepancyColors: Record<string, string> = {
  shortage: "bg-blue-600",
  damaged: "bg-orange-600",
  wrong_item: "bg-destructive",
  overage: "bg-emerald-600",
  quality: "bg-amber-600",
  expired: "bg-purple-600",
};

const ReceivingReportsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  await getTenantIdForOrg(orgId);
  const [purchaseOrders, purchaseOrderItems, suppliers] = await Promise.all([
    (await listPurchaseOrders()).data,
    (await listPurchaseOrderItems()).data,
    (await listInventorySuppliers()).data,
  ]);

  const supplierNameById = new Map(
    suppliers.map((supplier) => [supplier.id, supplier.name])
  );
  const itemsByOrder = new Map<string, typeof purchaseOrderItems>();
  for (const item of purchaseOrderItems) {
    const existing = itemsByOrder.get(item.purchaseOrderId) ?? [];
    existing.push(item);
    itemsByOrder.set(item.purchaseOrderId, existing);
  }

  const supplierMetricsMap = new Map<
    string,
    {
      supplier_name: string;
      total_orders: number;
      on_time_deliveries: number;
      quality_score_sum: number;
      quality_score_count: number;
      lead_time_sum: number;
      lead_time_count: number;
      total_spent: number;
      discrepancy_count: number;
      item_count: number;
    }
  >();
  for (const order of purchaseOrders) {
    const supplierName = supplierNameById.get(order.vendorId) ?? "Unknown supplier";
    const stats =
      supplierMetricsMap.get(order.vendorId) ??
      {
        supplier_name: supplierName,
        total_orders: 0,
        on_time_deliveries: 0,
        quality_score_sum: 0,
        quality_score_count: 0,
        lead_time_sum: 0,
        lead_time_count: 0,
        total_spent: 0,
        discrepancy_count: 0,
        item_count: 0,
      };

    stats.total_orders += 1;
    stats.total_spent += Number(order.total ?? 0);
    if (order.actualDeliveryDate && order.expectedDeliveryDate) {
      if (new Date(order.actualDeliveryDate) <= new Date(order.expectedDeliveryDate)) {
        stats.on_time_deliveries += 1;
      }
      stats.lead_time_sum +=
        (new Date(order.actualDeliveryDate).getTime() - new Date(order.orderDate).getTime()) /
        (1000 * 60 * 60 * 24);
      stats.lead_time_count += 1;
    }

    const orderItems = itemsByOrder.get(order.id) ?? [];
    for (const item of orderItems) {
      const qualityScore =
        item.quality_status === "accepted" ? 5 : item.quality_status === "conditional" ? 3 : 1;
      stats.quality_score_sum += qualityScore;
      stats.quality_score_count += 1;
      stats.item_count += 1;
      if (item.discrepancy_type) {
        stats.discrepancy_count += 1;
      }
    }
    supplierMetricsMap.set(order.vendorId, stats);
  }

  const supplierMetricsRows = Array.from(supplierMetricsMap.values()).map((stats) => ({
    supplier_name: stats.supplier_name,
    total_orders: BigInt(stats.total_orders),
    on_time_deliveries: BigInt(stats.on_time_deliveries),
    quality_score:
      stats.quality_score_count > 0
        ? stats.quality_score_sum / stats.quality_score_count
        : 0,
    average_lead_time:
      stats.lead_time_count > 0 ? stats.lead_time_sum / stats.lead_time_count : 0,
    total_spent: stats.total_spent,
    discrepancy_rate:
      stats.item_count > 0 ? (stats.discrepancy_count / stats.item_count) * 100 : 0,
  }));

  const receivedOrders = purchaseOrders.filter(
    (order) => order.status === "received" || order.status === "completed"
  );
  const receivedOrderIds = new Set(receivedOrders.map((order) => order.id));
  const receivedItems = purchaseOrderItems.filter((item) =>
    receivedOrderIds.has(item.purchaseOrderId)
  );
  const receivingSummaryRows: ReceivingSummaryRow[] = [
    {
      total_pos_received: BigInt(receivedOrders.length),
      total_items_received: BigInt(receivedItems.length),
      total_discrepancies: BigInt(
        receivedItems.filter((item) => Boolean(item.discrepancy_type)).length
      ),
      average_quality_score:
        receivedItems.length > 0
          ? receivedItems.reduce((sum, item) => {
              const score =
                item.quality_status === "accepted"
                  ? 5
                  : item.quality_status === "conditional"
                    ? 3
                    : 1;
              return sum + score;
            }, 0) / receivedItems.length
          : 0,
      pending_items: BigInt(
        receivedItems.filter((item) => item.quality_status === "pending").length
      ),
    },
  ];

  const discrepancyCounts = receivedItems.reduce<Record<string, number>>((acc, item) => {
    if (!item.discrepancy_type) {
      return acc;
    }
    acc[item.discrepancy_type] = (acc[item.discrepancy_type] ?? 0) + 1;
    return acc;
  }, {});
  const discrepancyRows: DiscrepancyBreakdownRow[] = Object.entries(discrepancyCounts)
    .map(([discrepancy_type, count]) => ({ discrepancy_type, count: BigInt(count) }))
    .sort((a, b) => Number(b.count - a.count));

  const supplierMetrics = supplierMetricsRows.map((row) => ({
    supplier_name: row.supplier_name,
    total_orders: Number(row.total_orders),
    on_time_deliveries: Number(row.on_time_deliveries),
    quality_score: Number(row.quality_score),
    average_lead_time: Number(row.average_lead_time),
    total_spent: Number(row.total_spent),
    discrepancy_rate: Number(row.discrepancy_rate),
  }));

  const summaryRow = receivingSummaryRows[0];
  const receivingSummary = {
    total_pos_received: Number(summaryRow?.total_pos_received ?? 0),
    total_items_received: Number(summaryRow?.total_items_received ?? 0),
    total_discrepancies: Number(summaryRow?.total_discrepancies ?? 0),
    average_quality_score: Number(summaryRow?.average_quality_score ?? 0),
    pending_items: Number(summaryRow?.pending_items ?? 0),
  };

  const discrepancies = discrepancyRows.map((row) => ({
    type: row.discrepancy_type,
    count: Number(row.count),
  }));

  const totalDiscrepancyCount = discrepancies.reduce(
    (sum, d) => sum + d.count,
    0
  );

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="font-semibold text-2xl tracking-tight">
          Receiving Reports & Supplier Performance
        </h1>
        <p className="text-muted-foreground">
          Track receiving metrics and supplier performance trends
        </p>
      </div>

      <Separator />

      {/* Performance Overview Section */}
      <section className="space-y-4">
        <h2 className="font-medium text-muted-foreground text-sm">
          Performance Overview
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card tone="soft-stone">
            <CardHeader className="pb-2">
              <CardDescription>Total POs Received</CardDescription>
              <CardTitle>
                <span>{receivingSummary.total_pos_received}</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card tone="soft-stone">
            <CardHeader className="pb-2">
              <CardDescription>Items Received</CardDescription>
              <CardTitle>
                <span>{receivingSummary.total_items_received}</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card tone="soft-stone">
            <CardHeader className="pb-2">
              <CardDescription>Quality Score</CardDescription>
              <CardTitle>
                <span>{receivingSummary.average_quality_score.toFixed(1)}</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card tone="soft-stone">
            <CardHeader className="pb-2">
              <CardDescription>Discrepancies</CardDescription>
              <CardTitle className="text-destructive">
                <span>{receivingSummary.total_discrepancies}</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Supplier Performance Section */}
      <section className="space-y-4">
        <h2 className="font-medium text-muted-foreground text-sm">
          Supplier Performance
        </h2>

        <Card tone="canvas">
          <CardContent className="pt-6">
            {supplierMetrics.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No supplier data available yet. Supplier metrics will appear
                once purchase orders have been received.
              </div>
            ) : (
              <div className="space-y-4">
                {supplierMetrics.map((supplier) => (
                  <div
                    className="space-y-3 rounded-lg border p-4"
                    key={supplier.supplier_name}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h3 className="font-medium">
                            {supplier.supplier_name}
                          </h3>
                          <Badge
                            variant={getScoreBadgeVariant(
                              supplier.quality_score
                            )}
                          >
                            {supplier.quality_score.toFixed(1)} / 5.0
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {supplier.total_orders} orders • $
                          {supplier.total_spent.toLocaleString()} total
                        </p>
                      </div>
                      <div className="text-right">
                        {supplier.discrepancy_rate > 5 ? (
                          <div className="flex items-center gap-1 text-destructive text-sm">
                            <AlertCircle className="size-4" />
                            <span>
                              {supplier.discrepancy_rate.toFixed(1)}%
                              discrepancy rate
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-emerald-600 text-sm">
                            <TrendingUp className="size-4" />
                            <span>Excellent performance</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <div>
                        <p className="mb-1 text-muted-foreground text-xs">
                          On-Time Deliveries
                        </p>
                        <p className="font-medium text-sm">
                          {supplier.on_time_deliveries} /{" "}
                          {supplier.total_orders}
                          <span className="text-muted-foreground text-xs">
                            {" "}
                            (
                            {supplier.total_orders > 0
                              ? (
                                  (supplier.on_time_deliveries /
                                    supplier.total_orders) *
                                  100
                                ).toFixed(0)
                              : 0}
                            %)
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-muted-foreground text-xs">
                          Average Lead Time
                        </p>
                        <p className="font-medium text-sm">
                          {supplier.average_lead_time.toFixed(1)} days
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-muted-foreground text-xs">
                          Quality Score
                        </p>
                        <p className="font-medium text-sm">
                          {supplier.quality_score.toFixed(1)} / 5.0
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-muted-foreground text-xs">
                          Discrepancy Rate
                        </p>
                        <p
                          className={`font-medium text-sm ${supplier.discrepancy_rate > 5 ? "text-destructive" : "text-emerald-600"}`}
                        >
                          {supplier.discrepancy_rate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Discrepancy Breakdown Section */}
      <section className="space-y-4">
        <h2 className="font-medium text-muted-foreground text-sm">
          Discrepancy Breakdown by Type
        </h2>

        <Card tone="canvas">
          <CardContent className="pt-6">
            {discrepancies.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No discrepancies recorded. This section will populate as
                receiving inspections identify issues.
              </div>
            ) : (
              <div className="space-y-4">
                {discrepancies.map((discrepancy) => {
                  const percentage =
                    totalDiscrepancyCount > 0
                      ? (discrepancy.count / totalDiscrepancyCount) * 100
                      : 0;
                  const colorClass =
                    discrepancyColors[discrepancy.type] ?? "bg-gray-600";

                  return (
                    <div key={discrepancy.type}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span>{formatDiscrepancyType(discrepancy.type)}</span>
                        <span className="font-medium">
                          {discrepancy.count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full ${colorClass}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default ReceivingReportsPage;
