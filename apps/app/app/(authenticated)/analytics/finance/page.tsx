import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  getSeverityVariant,
  useFinanceAnalytics,
} from "@/app/lib/use-finance-analytics";

function FinanceAnalyticsPageClient() {
  const { data, isLoading, error, refetch } = useFinanceAnalytics({
    period: "30d",
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card className="animate-pulse" key={i}>
              <CardHeader>
                <div className="h-6 bg-muted rounded w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              </CardContent>
            </Card>
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
          <Card key={item.label}>
            <CardHeader>
              <CardTitle
                className={
                  item.isPositive !== undefined
                    ? item.isPositive
                      ? "text-green-600"
                      : "text-orange-600"
                    : ""
                }
              >
                {item.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p
                className={`text-xs ${item.isPositive !== undefined ? (item.isPositive ? "text-green-600" : "text-orange-600") : "text-muted-foreground"}`}
              >
                {item.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ledger Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {ledgerSummary.map((row) => (
              <div
                className="flex items-center justify-between"
                key={row.label}
              >
                <p className="text-muted-foreground">{row.label}</p>
                <p className="font-semibold">{row.amount}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finance Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {financeAlerts.map((alert, index) => (
              <div
                className="flex items-center justify-between rounded-md border border-border/70 px-4 py-3"
                key={index}
              >
                <p>{alert.message}</p>
                <Badge variant={getSeverityVariant(alert.severity)}>
                  {alert.severity}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
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

export default AnalyticsFinancePage;
