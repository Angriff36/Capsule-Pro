"use client";

import { Separator } from "@repo/design-system/components/ui/separator";
import { cn } from "@repo/design-system/lib/utils";
import type { ClientLTVMetrics } from "../actions/get-client-ltv";
import { ClientTable } from "./client-table";
import { CohortAnalysis } from "./cohort-analysis";
import { MetricsCards } from "./metrics-cards";
import { PredictiveLTV } from "./predictive-ltv";
import { RevenueTrends } from "./revenue-trends";

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
