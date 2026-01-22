import { Suspense } from "react";
import { ModuleSection } from "../../components/module-section";
import { CLVDashboard } from "./components/clv-dashboard";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { getClientLTVMetrics } from "./actions/get-client-ltv";

async function ClientAnalyticsContent() {
  const metrics = await getClientLTVMetrics();
  const clients = metrics.topClients;

  return <CLVDashboard metrics={metrics} clients={clients} />;
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

export { ClientAnalyticsPage };
