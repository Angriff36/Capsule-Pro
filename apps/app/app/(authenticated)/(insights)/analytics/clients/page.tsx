import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { Suspense } from "react";
import { getClientLTVMetrics } from "./actions/get-client-ltv";
import { CLVDashboard } from "./components/clv-dashboard";

async function ClientAnalyticsContent() {
  const metrics = await getClientLTVMetrics();
  const clients = metrics.topClients;

  return <CLVDashboard clients={clients} metrics={metrics} />;
}

const ClientAnalyticsPage = () => (
  <CommandBand>
    <CommandBandHeader>
      <div className="space-y-4">
        <MonoLabel tone="dark">Analytics / Clients</MonoLabel>
        <DisplayHeading>Client Analytics</DisplayHeading>
        <CommandBandLede>
          Analyze client profitability, lifetime value, retention rates, and
          lifetime value analysis.
        </CommandBandLede>
      </div>
    </CommandBandHeader>
  </CommandBand>
);

export default function ClientAnalyticsPageWithData() {
  return (
    <PageCanvas>
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
    </PageCanvas>
  );
}
