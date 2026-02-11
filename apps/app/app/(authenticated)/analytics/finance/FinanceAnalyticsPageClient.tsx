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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { useState } from "react";
import {
  type FinanceAlert,
  type FinanceHighlight,
  getSeverityVariant,
  type LedgerEntry,
  useFinanceAnalytics,
} from "@/app/lib/use-finance-analytics";
import { useLocations } from "@/app/lib/use-locations";

type Period = "7d" | "30d" | "90d" | "12m";

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
];

export function FinanceAnalyticsPageClient() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("30d");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");

  const { data: locationsData } = useLocations({ isActive: true });
  const { data, isLoading, error, refetch } = useFinanceAnalytics({
    period: selectedPeriod,
    locationId: selectedLocationId === "all" ? undefined : selectedLocationId,
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

  const locations = locationsData?.locations ?? [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="location-select">
            Location:
          </label>
          <Select
            onValueChange={setSelectedLocationId}
            value={selectedLocationId}
          >
            <SelectTrigger className="w-[200px]" id="location-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="period-select">
            Period:
          </label>
          <Select
            onValueChange={(v) => setSelectedPeriod(v as Period)}
            value={selectedPeriod}
          >
            <SelectTrigger className="w-[180px]" id="period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
                  <p className="text-xs text-muted-foreground">{item.trend}</p>
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
    </div>
  );
}
