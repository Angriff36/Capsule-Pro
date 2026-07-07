"use client";

import {
  OperationalColumn,
  PageBody,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
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
import { type TenantLocation, useLocations } from "@/app/lib/use-locations";

type Period = "7d" | "30d" | "90d" | "12m";

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
];

function LoadingSkeleton() {
  return (
    <PageCanvas>
      <PageBody>
        <OperationalColumn>
          <section className="space-y-4">
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card className="animate-pulse" key={i}>
                  <CardHeader>
                    <div className="h-6 w-24 rounded bg-muted" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 w-32 rounded bg-muted" />
                      <div className="h-3 w-24 rounded bg-muted" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  );
}

function ErrorState({ error, refetch }: { error: Error; refetch: () => void }) {
  return (
    <PageCanvas>
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="font-medium text-destructive text-lg">
          Failed to load finance analytics
        </p>
        <p className="mt-2 text-muted-foreground text-sm">{error.message}</p>
        <button
          className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          onClick={() => refetch()}
          type="button"
        >
          Retry
        </button>
      </div>
    </PageCanvas>
  );
}

function LocationSelect({
  selectedLocationId,
  setSelectedLocationId,
  locations,
}: {
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  locations: TenantLocation[];
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="font-medium text-sm" htmlFor="location-select">
        Location:
      </label>
      <Select onValueChange={setSelectedLocationId} value={selectedLocationId}>
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
  );
}

function PeriodSelect({
  selectedPeriod,
  setSelectedPeriod,
}: {
  selectedPeriod: Period;
  setSelectedPeriod: (period: Period) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="font-medium text-sm" htmlFor="period-select">
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
  );
}

function PerformanceOverview({
  financeHighlights,
}: {
  financeHighlights: FinanceHighlight[];
}) {
  return (
    <section className="space-y-4">
      <SectionHeader title="Performance Overview" />
      <div className="grid gap-6 md:grid-cols-3">
        {financeHighlights.map((item: FinanceHighlight) => (
          <Card key={item.label}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle>{item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">{item.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function LedgerSummaryCard({
  ledgerSummary,
}: {
  ledgerSummary: LedgerEntry[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ledger Summary</CardTitle>
        <CardDescription>Income, expenses, and net position</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {ledgerSummary.map((row: LedgerEntry) => (
          <div className="flex items-center justify-between" key={row.label}>
            <p className="text-muted-foreground">{row.label}</p>
            <p className="font-semibold">{row.amount}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FinanceAlertsCard({
  financeAlerts,
}: {
  financeAlerts: FinanceAlert[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Finance Alerts</CardTitle>
        <CardDescription>Items requiring attention or review</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {financeAlerts.map((alert: FinanceAlert) => (
          <div
            className="flex items-center justify-between rounded-[22px] border border-hairline bg-soft-stone px-4 py-3"
            key={`${alert.message}-${alert.severity}`}
          >
            <p>{alert.message}</p>
            <Badge variant={getSeverityVariant(alert.severity)}>
              {alert.severity}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FinancialAnalysis({
  ledgerSummary,
  financeAlerts,
}: {
  ledgerSummary: LedgerEntry[];
  financeAlerts: FinanceAlert[];
}) {
  return (
    <section className="space-y-4">
      <SectionHeader title="Financial Analysis" />
      <div className="grid gap-6 lg:grid-cols-2">
        <LedgerSummaryCard ledgerSummary={ledgerSummary} />
        <FinanceAlertsCard financeAlerts={financeAlerts} />
      </div>
    </section>
  );
}

function Filters({
  selectedPeriod,
  setSelectedPeriod,
  selectedLocationId,
  setSelectedLocationId,
  locations,
}: {
  selectedPeriod: Period;
  setSelectedPeriod: (period: Period) => void;
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  locations: TenantLocation[];
}) {
  return (
    <div className="rounded-[22px] border border-hairline bg-soft-stone p-6">
      <div className="flex items-center justify-end gap-4">
        <LocationSelect
          locations={locations}
          selectedLocationId={selectedLocationId}
          setSelectedLocationId={setSelectedLocationId}
        />
        <PeriodSelect
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
        />
      </div>
    </div>
  );
}

function AnalyticsContent({
  financeHighlights,
  ledgerSummary,
  financeAlerts,
  selectedPeriod,
  setSelectedPeriod,
  selectedLocationId,
  setSelectedLocationId,
  locations,
}: {
  financeHighlights: FinanceHighlight[];
  ledgerSummary: LedgerEntry[];
  financeAlerts: FinanceAlert[];
  selectedPeriod: Period;
  setSelectedPeriod: (period: Period) => void;
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  locations: TenantLocation[];
}) {
  return (
    <PageBody>
      <OperationalColumn>
        <Filters
          locations={locations}
          selectedLocationId={selectedLocationId}
          selectedPeriod={selectedPeriod}
          setSelectedLocationId={setSelectedLocationId}
          setSelectedPeriod={setSelectedPeriod}
        />
        <PerformanceOverview financeHighlights={financeHighlights} />
        <FinancialAnalysis
          financeAlerts={financeAlerts}
          ledgerSummary={ledgerSummary}
        />
      </OperationalColumn>
    </PageBody>
  );
}

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
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} refetch={refetch} />;
  }

  if (!data) {
    return null;
  }

  const { financeHighlights, ledgerSummary, financeAlerts } = data;
  const locations: TenantLocation[] = locationsData?.locations ?? [];

  return (
    <AnalyticsContent
      financeAlerts={financeAlerts}
      financeHighlights={financeHighlights}
      ledgerSummary={ledgerSummary}
      locations={locations}
      selectedLocationId={selectedLocationId}
      selectedPeriod={selectedPeriod}
      setSelectedLocationId={setSelectedLocationId}
      setSelectedPeriod={setSelectedPeriod}
    />
  );
}
