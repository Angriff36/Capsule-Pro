import { Suspense } from "react";
import { OperationalPageSkeleton } from "../../../components/operational-page-shell";
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
  return <OperationalPageSkeleton />;
}
