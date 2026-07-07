"use client";

import {
  OperationalColumn,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
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
  className?: string;
  clients: ClientLTVMetrics["topClients"];
  metrics: ClientLTVMetrics;
}

export function CLVDashboard({
  metrics,
  clients,
  className,
}: CLVDashboardProps) {
  return (
    <OperationalColumn className={cn("", className)}>
      <section>
        <SectionHeader title="Performance Overview" />
        <MetricsCards metrics={metrics} />
      </section>

      <section>
        <SectionHeader title="Revenue & Cohort Analysis" />
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueTrends data={metrics.revenueByMonth} />
          <CohortAnalysis data={metrics.cohortData} />
        </div>
      </section>

      <section>
        <SectionHeader title="Client Insights" />
        <div className="grid gap-6 lg:grid-cols-2">
          <ClientTable clients={clients} />
          <PredictiveLTV data={metrics.predictiveLTV} />
        </div>
      </section>
    </OperationalColumn>
  );
}
