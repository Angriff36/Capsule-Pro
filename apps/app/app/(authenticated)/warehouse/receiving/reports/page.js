"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReceivingReportsPage;
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const lucide_react_1 = require("lucide-react");
function ReceivingReportsPage() {
  const supplierMetrics = [
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
  const receivingSummary = {
    total_pos_received: 105,
    total_items_received: 1234,
    total_discrepancies: 18,
    average_quality_score: 4.5,
    pending_items: 12,
  };
  const getScoreColor = (score) => {
    if (score >= 4.5) {
      return "text-green-600";
    }
    if (score >= 3.5) {
      return "text-yellow-600";
    }
    return "text-red-600";
  };
  const getScoreBadge = (score) => {
    if (score >= 4.5) {
      return "bg-green-100 text-green-800";
    }
    if (score >= 3.5) {
      return "bg-yellow-100 text-yellow-800";
    }
    return "bg-red-100 text-red-800";
  };
  const getTrendIcon = (isPositive) => {
    if (isPositive) {
      return <lucide_react_1.ArrowUpRight className="h-4 w-4 text-green-600" />;
    }
    return <lucide_react_1.ArrowDownRight className="h-4 w-4 text-red-600" />;
  };
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Receiving Reports & Supplier Performance
        </h1>
        <p className="text-muted-foreground">
          Track receiving metrics and supplier performance trends
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <card_1.Card>
          <card_1.CardHeader className="pb-2">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Total POs Received
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {receivingSummary.total_pos_received}
              </div>
              <div className="flex items-center gap-1 text-green-600 text-xs">
                {getTrendIcon(true)}
                <span>+12%</span>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="pb-2">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Items Received
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {receivingSummary.total_items_received}
              </div>
              <div className="flex items-center gap-1 text-green-600 text-xs">
                {getTrendIcon(true)}
                <span>+8%</span>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="pb-2">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Quality Score
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`text-2xl font-bold ${getScoreColor(receivingSummary.average_quality_score)}`}
              >
                {receivingSummary.average_quality_score.toFixed(1)}
              </div>
              <div className="flex items-center gap-1 text-green-600 text-xs">
                {getTrendIcon(true)}
                <span>+0.2</span>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="pb-2">
            <card_1.CardTitle className="text-sm font-medium text-muted-foreground">
              Discrepancies
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-red-600">
                {receivingSummary.total_discrepancies}
              </div>
              <div className="flex items-center gap-1 text-green-600 text-xs">
                {getTrendIcon(false)}
                <span>-5%</span>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle className="flex items-center gap-2">
            <lucide_react_1.TrendingUp className="h-5 w-5" />
            Supplier Performance
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="space-y-4">
            {supplierMetrics.map((supplier) => (
              <div
                className="rounded-lg border p-4 space-y-3"
                key={supplier.supplier_name}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">
                        {supplier.supplier_name}
                      </h3>
                      <badge_1.Badge
                        className={getScoreBadge(supplier.quality_score)}
                      >
                        {supplier.quality_score.toFixed(1)} / 5.0
                      </badge_1.Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {supplier.total_orders} orders • $
                      {supplier.total_spent.toLocaleString()} total
                    </p>
                  </div>
                  <div className="text-right">
                    {supplier.discrepancy_rate > 5 ? (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <lucide_react_1.AlertCircle className="h-4 w-4" />
                        <span>
                          {supplier.discrepancy_rate}% discrepancy rate
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <lucide_react_1.TrendingUp className="h-4 w-4" />
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
                    <p className="text-sm font-semibold">
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
                    <p className="text-sm font-semibold">
                      {supplier.average_lead_time.toFixed(1)} days
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Quality Score
                    </p>
                    <p
                      className={`text-sm font-semibold ${getScoreColor(supplier.quality_score)}`}
                    >
                      {supplier.quality_score.toFixed(1)} / 5.0
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Discrepancy Rate
                    </p>
                    <p
                      className={`text-sm font-semibold ${supplier.discrepancy_rate > 5 ? "text-red-600" : "text-green-600"}`}
                    >
                      {supplier.discrepancy_rate}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Discrepancy Breakdown by Type</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Shortages</span>
                <span className="font-semibold">8 (44%)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: "44%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Damaged Items</span>
                <span className="font-semibold">6 (33%)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500"
                  style={{ width: "33%" }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Wrong Items</span>
                <span className="font-semibold">3 (17%)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: "17%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overage</span>
                <span className="font-semibold">1 (6%)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: "6%" }} />
              </div>
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>
  );
}
