import { Suspense } from "react";
import { getExecutiveKPIMetrics } from "./actions/get-executive-kpis";
import { ExecutiveDashboardClient } from "./components/executive-dashboard-client";

async function ExecutiveDashboardContent() {
  const metrics = await getExecutiveKPIMetrics();

  return <ExecutiveDashboardClient metrics={metrics} />;
}

export function ExecutiveDashboardWrapper() {
  return (
    <Suspense fallback={<ExecutiveDashboardSkeleton />}>
      <ExecutiveDashboardContent />
    </Suspense>
  );
}

function ExecutiveDashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
      </div>

      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div className="h-24 animate-pulse rounded-lg bg-muted" key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
