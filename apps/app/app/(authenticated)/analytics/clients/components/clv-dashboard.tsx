"use client";

import { cn } from "@repo/design-system/lib/utils";
import type { ClientLTVMetrics } from "../actions/get-client-ltv";
import { ClientTable } from "./client-table";
import { CohortAnalysis } from "./cohort-analysis";
import { MetricsCards } from "./metrics-cards";
import { PredictiveLTV } from "./predictive-ltv";
import { RevenueTrends } from "./revenue-trends";

type CLVDashboardProps = {
  metrics: ClientLTVMetrics;
  clients: ClientLTVMetrics["topClients"];
  className?: string;
};

export function CLVDashboard({
  metrics,
  clients,
  className,
}: CLVDashboardProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <MetricsCards metrics={metrics} />
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueTrends data={metrics.revenueByMonth} />
        <CohortAnalysis data={metrics.cohortData} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ClientTable clients={clients} />
        <PredictiveLTV data={metrics.predictiveLTV} />
      </div>
    </div>
  );
}
