Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.default = WasteTrackingPage;
const card_1 = require("@repo/design-system/components/ui/card");
const skeleton_1 = require("@repo/design-system/components/ui/skeleton");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const waste_entries_client_1 = require("./waste-entries-client");
const waste_stats_cards_1 = require("./waste-stats-cards");
exports.dynamic = "force-dynamic";
function WasteTrackingPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Waste Tracking</h1>
          <p className="text-muted-foreground">
            Log food waste to identify reduction opportunities and cost savings
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <react_1.Suspense fallback={<WasteStatsSkeleton />}>
        <waste_stats_cards_1.WasteStatsCards />
      </react_1.Suspense>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Waste Entry Form */}
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2">
              <lucide_react_1.Trash2 className="h-5 w-5" />
              Log Waste Entry
            </card_1.CardTitle>
            <card_1.CardDescription>
              Record food waste with reason and quantity
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <react_1.Suspense fallback={<WasteFormSkeleton />}>
              <waste_entries_client_1.WasteEntriesClient />
            </react_1.Suspense>
          </card_1.CardContent>
        </card_1.Card>

        {/* Reports & Trends */}
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2">
              <lucide_react_1.TrendingUp className="h-5 w-5" />
              Waste Trends
            </card_1.CardTitle>
            <card_1.CardDescription>
              View waste analytics and reduction opportunities
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <react_1.Suspense fallback={<WasteTrendsSkeleton />}>
              <WasteTrendsView />
            </react_1.Suspense>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Detailed Reports */}
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle className="flex items-center gap-2">
            <lucide_react_1.BarChart3 className="h-5 w-5" />
            Waste Reports
          </card_1.CardTitle>
          <card_1.CardDescription>
            Detailed breakdown by item, reason, location, and date
          </card_1.CardDescription>
        </card_1.CardHeader>
        <card_1.CardContent>
          <react_1.Suspense fallback={<WasteReportsSkeleton />}>
            <WasteReportsView />
          </react_1.Suspense>
        </card_1.CardContent>
      </card_1.Card>
    </div>
  );
}
// Skeleton loaders
function WasteStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <card_1.Card key={i}>
          <card_1.CardContent className="p-6">
            <skeleton_1.Skeleton className="h-4 w-24 mb-2" />
            <skeleton_1.Skeleton className="h-8 w-32" />
          </card_1.CardContent>
        </card_1.Card>
      ))}
    </div>
  );
}
function WasteFormSkeleton() {
  return (
    <div className="space-y-4">
      <skeleton_1.Skeleton className="h-10 w-full" />
      <skeleton_1.Skeleton className="h-10 w-full" />
      <skeleton_1.Skeleton className="h-10 w-full" />
      <skeleton_1.Skeleton className="h-10 w-32" />
    </div>
  );
}
function WasteTrendsSkeleton() {
  return (
    <div className="space-y-4">
      <skeleton_1.Skeleton className="h-40 w-full" />
      <skeleton_1.Skeleton className="h-32 w-full" />
    </div>
  );
}
function WasteReportsSkeleton() {
  return (
    <div className="space-y-4">
      <skeleton_1.Skeleton className="h-12 w-full" />
      <skeleton_1.Skeleton className="h-64 w-full" />
    </div>
  );
}
// Client components for data fetching
async function WasteTrendsView() {
  const trendsResponse = await fetch(
    "/api/kitchen/waste/trends?period=30d&groupBy=day"
  );
  const trends = await trendsResponse.json();
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {trends.trends.summary.totalEntries} entries in the last 30 days
      </div>
      <div className="space-y-2">
        {trends.trends.topReasons.map((item) => (
          <div
            className="flex items-center justify-between text-sm"
            key={item.reason.id}
          >
            <span>{item.reason.name}</span>
            <span className="font-medium">${item.cost.toFixed(2)}</span>
          </div>
        ))}
      </div>
      {trends.trends.reductionOpportunities.length > 0 && (
        <div className="rounded-md bg-muted p-4 text-sm">
          <p className="font-medium mb-2">Reduction Opportunities:</p>
          <ul className="space-y-1 list-disc list-inside">
            {trends.trends.reductionOpportunities.map((opp, i) => (
              <li key={i}>
                {opp.description} - Save ${opp.potentialSavings.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
async function WasteReportsView() {
  const reportsResponse = await fetch(
    "/api/kitchen/waste/reports?groupBy=reason"
  );
  const reports = await reportsResponse.json();
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold">
            ${reports.report.summary.totalCost.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Quantity</p>
          <p className="text-2xl font-bold">
            {reports.report.summary.totalQuantity.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Entries</p>
          <p className="text-2xl font-bold">
            {reports.report.summary.entryCount}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Avg Cost/Entry</p>
          <p className="text-2xl font-bold">
            ${reports.report.summary.avgCostPerEntry.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Grouped Data */}
      <div className="space-y-4">
        <h3 className="font-semibold">Waste by Reason</h3>
        <div className="space-y-2">
          {reports.report.data.map((item) => (
            <div
              className="flex items-center justify-between rounded-lg border p-4"
              key={item.key}
            >
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">
                  {item.count} entries • {item.avgQuantityPerEntry.toFixed(2)}{" "}
                  avg qty
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">${item.totalCost.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">
                  ${item.avgCostPerEntry.toFixed(2)}/entry
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
