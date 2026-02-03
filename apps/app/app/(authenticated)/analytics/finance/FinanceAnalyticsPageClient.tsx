"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  type FinanceAlert,
  type FinanceHighlight,
  getSeverityVariant,
  type LedgerEntry,
  useFinanceAnalytics,
} from "@/app/lib/use-finance-analytics";

export function FinanceAnalyticsPageClient() {
  const { data, isLoading, error, refetch } = useFinanceAnalytics({
    period: "30d",
    enabled: true,
  });

  if (isLoading) {
    return (
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Performance Overview
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
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
      </section>
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
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Performance Overview
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {financeHighlights.map((item: FinanceHighlight) => (
            <Card key={item.label}>
              <CardHeader>
                <CardDescription>{item.label}</CardDescription>
                <CardTitle>{item.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {item.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Financial Analysis
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ledger Summary</CardTitle>
              <CardDescription>
                Income, expenses, and net position
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ledgerSummary.map((row: LedgerEntry) => (
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
              <CardDescription>
                Items requiring attention or review
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {financeAlerts.map((alert: FinanceAlert, index: number) => (
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
      </section>
    </div>
  );
}
