"use client";

import { MetricsCards } from "./metrics-cards";
import { RevenueTrends } from "./revenue-trends";
import { CohortAnalysis } from "./cohort-analysis";
import { ClientTable } from "./client-table";
import { PredictiveLTV } from "./predictive-ltv";
import { cn } from "@repo/design-system/lib/utils";
import type { ClientLTVMetrics } from "../actions/get-client-ltv";

interface CLVDashboardProps {
  metrics: ClientLTVMetrics;
  clients: ClientLTVMetrics["topClients"];
  className?: string;
}

export function CLVDashboard({ metrics, clients, className }: CLVDashboardProps) {
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
