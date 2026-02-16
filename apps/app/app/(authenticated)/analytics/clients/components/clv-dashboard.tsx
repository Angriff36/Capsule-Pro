"use client";

import { Separator } from "@repo/design-system/components/ui/separator";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { cn } from "@repo/design-system/lib/utils";
import dynamic from "next/dynamic";
import type { ClientLTVMetrics } from "../actions/get-client-ltv";
import { ClientTable } from "./client-table";
import { CohortAnalysis } from "./cohort-analysis";
import { MetricsCards } from "./metrics-cards";

// Lazy load chart components to reduce initial bundle size
// Recharts (~200KB gzipped) is only loaded when these components are rendered
const RevenueTrends = dynamic(
  () =>
    import("./revenue-trends").then((mod) => ({ default: mod.RevenueTrends })),
  {
    loading: () => (
      <div className="flex h-[300px] w-full items-center justify-center">
        <Skeleton className="h-[300px] w-full" />
      </div>
    ),
  }
);

const PredictiveLTV = dynamic(
  () =>
    import("./predictive-ltv").then((mod) => ({ default: mod.PredictiveLTV })),
  {
    loading: () => (
      <div className="flex h-[340px] w-full items-center justify-center">
        <Skeleton className="h-[340px] w-full" />
      </div>
    ),
  }
);

interface CLVDashboardProps {
  metrics: ClientLTVMetrics;
  clients: ClientLTVMetrics["topClients"];
  className?: string;
}

export function CLVDashboard({
  metrics,
  clients,
  className,
}: CLVDashboardProps) {
  return (
    <div className={cn("flex flex-col gap-8", className)}>
      <Separator />

      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Performance Overview
        </h2>
        <MetricsCards metrics={metrics} />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Revenue & Cohort Analysis
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueTrends data={metrics.revenueByMonth} />
          <CohortAnalysis data={metrics.cohortData} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Client Insights
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <ClientTable clients={clients} />
          <PredictiveLTV data={metrics.predictiveLTV} />
        </div>
      </section>
    </div>
  );
}
