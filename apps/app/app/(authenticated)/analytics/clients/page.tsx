import { Spinner } from "@repo/design-system/components/ui/spinner";
import { Suspense } from "react";
import { ModuleSection } from "../../components/module-section";
import { getClientLTVMetrics } from "./actions/get-client-ltv";
import { CLVDashboard } from "./components/clv-dashboard";

async function ClientAnalyticsContent() {
  const metrics = await getClientLTVMetrics();
  const clients = metrics.topClients;

  return <CLVDashboard clients={clients} metrics={metrics} />;
}

const ClientAnalyticsPage = () => (
  <ModuleSection
    summary="Analyze client profitability, lifetime value, retention rates, and predictive modeling."
    title="Client Analytics"
  />
);

export default function ClientAnalyticsPageWithData() {
  return (
    <>
      <ClientAnalyticsPage />
      <Suspense
        fallback={
          <div className="flex h-96 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        }
      >
        <ClientAnalyticsContent />
      </Suspense>
    </>
  );
}
