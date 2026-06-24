import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { AlertCircle, TrendingUp } from "lucide-react";
import { notFound } from "next/navigation";
import { OperationalPageShell, OperationalSection } from "../../../components/operational-page-shell";
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

  const tenantId = await getTenantIdForOrg(orgId);

  const [supplierMetricsRows, receivingSummaryRows, discrepancyRows] =
    await Promise.all([
      database.$queryRaw<SupplierMetricsRow[]>(
        Prisma.sql`
          SELECT
            s.name as supplier_name,
            COUNT(DISTINCT po.id) as total_orders,
            SUM(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 ELSE 0 END) as on_time_deliveries,
            COALESCE(AVG(CASE WHEN poi.quality_status = 'accepted' THEN 5.0 WHEN poi.quality_status = 'conditional' THEN 3.0 ELSE 1.0 END), 0) as quality_score,
            COALESCE(AVG(EXTRACT(DAY FROM (po.actual_delivery_date - po.order_date))), 0) as average_lead_time,
            COALESCE(SUM(po.total), 0) as total_spent,
            CASE WHEN COUNT(poi.id) > 0
              THEN (COUNT(CASE WHEN poi.discrepancy_type IS NOT NULL THEN 1 END)::float / COUNT(poi.id)::float * 100)
              ELSE 0
            END as discrepancy_rate
          FROM tenant_inventory.purchase_orders po
          JOIN tenant_inventory.inventory_suppliers s ON po.vendor_id = s.id AND po.tenant_id = s.tenant_id
          LEFT JOIN tenant_inventory.purchase_order_items poi ON po.id = poi.purchase_order_id AND po.tenant_id = poi.tenant_id AND poi.deleted_at IS NULL
          WHERE po.tenant_id = ${tenantId}::uuid
            AND po.deleted_at IS NULL
            AND po.status IN ('received', 'completed', 'ordered', 'approved')
          GROUP BY s.name
          ORDER BY total_orders DESC
        `
      ),
      database.$queryRaw<ReceivingSummaryRow[]>(
        Prisma.sql`
          SELECT
            COUNT(DISTINCT po.id) as total_pos_received,
            COUNT(poi.id) as total_items_received,
            COUNT(CASE WHEN poi.discrepancy_type IS NOT NULL THEN 1 END) as total_discrepancies,
            COALESCE(AVG(CASE WHEN poi.quality_status = 'accepted' THEN 5.0 WHEN poi.quality_status = 'conditional' THEN 3.0 ELSE 1.0 END), 0) as average_quality_score,
            COUNT(CASE WHEN poi.quality_status = 'pending' THEN 1 END) as pending_items
          FROM tenant_inventory.purchase_orders po
          LEFT JOIN tenant_inventory.purchase_order_items poi ON po.id = poi.purchase_order_id AND po.tenant_id = poi.tenant_id AND poi.deleted_at IS NULL
          WHERE po.tenant_id = ${tenantId}::uuid
            AND po.deleted_at IS NULL
            AND po.status IN ('received', 'completed')
        `
      ),
      database.$queryRaw<DiscrepancyBreakdownRow[]>(
        Prisma.sql`
          SELECT
            COALESCE(poi.discrepancy_type, 'none') as discrepancy_type,
            COUNT(*) as count
          FROM tenant_inventory.purchase_order_items poi
          JOIN tenant_inventory.purchase_orders po ON poi.purchase_order_id = po.id AND poi.tenant_id = po.tenant_id
          WHERE poi.tenant_id = ${tenantId}::uuid
            AND poi.deleted_at IS NULL
            AND po.deleted_at IS NULL
            AND poi.discrepancy_type IS NOT NULL
          GROUP BY poi.discrepancy_type
          ORDER BY count DESC
        `
      ),
    ]);

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
    <OperationalPageShell
      description="Track receiving metrics and supplier performance trends."
      eyebrow="Warehouse / Receiving"
      title="Receiving reports"
    >
      <OperationalSection title="Performance overview">
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
      </OperationalSection>

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
    </OperationalPageShell>
  );
};

export default ReceivingReportsPage;
