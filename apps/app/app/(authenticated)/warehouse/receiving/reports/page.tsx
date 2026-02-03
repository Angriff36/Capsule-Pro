"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

type SupplierMetrics = {
  supplier_name: string;
  total_orders: number;
  on_time_deliveries: number;
  quality_score: number;
  average_lead_time: number;
  total_spent: number;
  discrepancy_rate: number;
};

type ReceivingSummary = {
  total_pos_received: number;
  total_items_received: number;
  total_discrepancies: number;
  average_quality_score: number;
  pending_items: number;
};

export default function ReceivingReportsPage() {
  const supplierMetrics: SupplierMetrics[] = [
    {
      supplier_name: "Fresh Farms Supply Co.",
      total_orders: 45,
      on_time_deliveries: 42,
      quality_score: 4.7,
      average_lead_time: 2.3,
      total_spent: 45_250,
      discrepancy_rate: 4.4,
    },
    {
      supplier_name: "Premium Meats Ltd.",
      total_orders: 32,
      on_time_deliveries: 28,
      quality_score: 4.2,
      average_lead_time: 3.1,
      total_spent: 38_400,
      discrepancy_rate: 8.2,
    },
    {
      supplier_name: "Organic Produce Inc.",
      total_orders: 28,
      on_time_deliveries: 27,
      quality_score: 4.8,
      average_lead_time: 1.8,
      total_spent: 29_120,
      discrepancy_rate: 3.6,
    },
  ];

  const receivingSummary: ReceivingSummary = {
    total_pos_received: 105,
    total_items_received: 1234,
    total_discrepancies: 18,
    average_quality_score: 4.5,
    pending_items: 12,
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 4.5) {
      return "default";
    }
    if (score >= 3.5) {
      return "secondary";
    }
    return "destructive";
  };

  const getTrendIcon = (isPositive: boolean) => {
    if (isPositive) {
      return <ArrowUpRight className="size-4 text-emerald-600" />;
    }
    return <ArrowDownRight className="size-4 text-rose-600" />;
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">
          Receiving Reports & Supplier Performance
        </h1>
        <p className="text-muted-foreground">
          Track receiving metrics and supplier performance trends
        </p>
      </div>

      <Separator />

      {/* Performance Overview Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Performance Overview
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total POs Received</CardDescription>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <span>{receivingSummary.total_pos_received}</span>
                  <div className="flex items-center gap-1 text-emerald-600 text-sm font-normal">
                    {getTrendIcon(true)}
                    <span>+12%</span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Items Received</CardDescription>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <span>{receivingSummary.total_items_received}</span>
                  <div className="flex items-center gap-1 text-emerald-600 text-sm font-normal">
                    {getTrendIcon(true)}
                    <span>+8%</span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Quality Score</CardDescription>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <span>{receivingSummary.average_quality_score.toFixed(1)}</span>
                  <div className="flex items-center gap-1 text-emerald-600 text-sm font-normal">
                    {getTrendIcon(true)}
                    <span>+0.2</span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Discrepancies</CardDescription>
              <CardTitle className="text-destructive">
                <div className="flex items-center gap-2">
                  <span>{receivingSummary.total_discrepancies}</span>
                  <div className="flex items-center gap-1 text-emerald-600 text-sm font-normal">
                    {getTrendIcon(false)}
                    <span>-5%</span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Supplier Performance Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Supplier Performance
        </h2>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {supplierMetrics.map((supplier) => (
                <div
                  className="rounded-lg border p-4 space-y-3"
                  key={supplier.supplier_name}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">
                          {supplier.supplier_name}
                        </h3>
                        <Badge variant={getScoreBadgeVariant(supplier.quality_score)}>
                          {supplier.quality_score.toFixed(1)} / 5.0
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {supplier.total_orders} orders • $
                        {supplier.total_spent.toLocaleString()} total
                      </p>
                    </div>
                    <div className="text-right">
                      {supplier.discrepancy_rate > 5 ? (
                        <div className="flex items-center gap-1 text-destructive text-sm">
                          <AlertCircle className="size-4" />
                          <span>
                            {supplier.discrepancy_rate}% discrepancy rate
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
                      <p className="text-xs text-muted-foreground mb-1">
                        On-Time Deliveries
                      </p>
                      <p className="text-sm font-medium">
                        {supplier.on_time_deliveries} / {supplier.total_orders}
                        <span className="text-xs text-muted-foreground">
                          (
                          {(
                            (supplier.on_time_deliveries /
                              supplier.total_orders) *
                            100
                          ).toFixed(0)}
                          %)
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Average Lead Time
                      </p>
                      <p className="text-sm font-medium">
                        {supplier.average_lead_time.toFixed(1)} days
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Quality Score
                      </p>
                      <p className="text-sm font-medium">
                        {supplier.quality_score.toFixed(1)} / 5.0
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Discrepancy Rate
                      </p>
                      <p
                        className={`text-sm font-medium ${supplier.discrepancy_rate > 5 ? "text-destructive" : "text-emerald-600"}`}
                      >
                        {supplier.discrepancy_rate}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Discrepancy Breakdown Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Discrepancy Breakdown by Type
        </h2>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Shortages</span>
                  <span className="font-medium">8 (44%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: "44%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Damaged Items</span>
                  <span className="font-medium">6 (33%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-600"
                    style={{ width: "33%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Wrong Items</span>
                  <span className="font-medium">3 (17%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-destructive" style={{ width: "17%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Overage</span>
                  <span className="font-medium">1 (6%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600" style={{ width: "6%" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
