Object.defineProperty(exports, "__esModule", { value: true });
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const use_finance_analytics_1 = require("@/app/lib/use-finance-analytics");
function FinanceAnalyticsPageClient() {
  const { data, isLoading, error, refetch } = (0,
  use_finance_analytics_1.useFinanceAnalytics)({
    period: "30d",
    enabled: true,
  });
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <card_1.Card className="animate-pulse" key={i}>
              <card_1.CardHeader>
                <div className="h-6 bg-muted rounded w-24" />
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              </card_1.CardContent>
            </card_1.Card>
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-lg font-medium text-destructive">
          Failed to load finance analytics
        </p>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
        <button
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }
  if (!data) {
    return null;
  }
  const { financeHighlights, ledgerSummary, financeAlerts } = data;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {financeHighlights.map((item) => (
          <card_1.Card key={item.label}>
            <card_1.CardHeader>
              <card_1.CardTitle
                className={
                  item.isPositive !== undefined
                    ? item.isPositive
                      ? "text-green-600"
                      : "text-orange-600"
                    : ""
                }
              >
                {item.value}
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p
                className={`text-xs ${item.isPositive !== undefined ? (item.isPositive ? "text-green-600" : "text-orange-600") : "text-muted-foreground"}`}
              >
                {item.trend}
              </p>
            </card_1.CardContent>
          </card_1.Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Ledger Summary</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-3 text-sm">
            {ledgerSummary.map((row) => (
              <div
                className="flex items-center justify-between"
                key={row.label}
              >
                <p className="text-muted-foreground">{row.label}</p>
                <p className="font-semibold">{row.amount}</p>
              </div>
            ))}
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Finance Alerts</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-3 text-sm">
            {financeAlerts.map((alert, index) => (
              <div
                className="flex items-center justify-between rounded-md border border-border/70 px-4 py-3"
                key={index}
              >
                <p>{alert.message}</p>
                <badge_1.Badge
                  variant={(0, use_finance_analytics_1.getSeverityVariant)(
                    alert.severity
                  )}
                >
                  {alert.severity}
                </badge_1.Badge>
              </div>
            ))}
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </div>
  );
}
const AnalyticsFinancePage = () => (
  <div className="space-y-6">
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Analytics
      </p>
      <h1 className="text-2xl font-semibold">Finance Snapshot</h1>
      <p className="text-sm text-muted-foreground">
        Monitor cash, margins, and alerts before approving the next cycle.
      </p>
    </div>

    <FinanceAnalyticsPageClient />
  </div>
);
exports.default = AnalyticsFinancePage;
