import type { ClientLTVMetrics } from "../actions/get-client-ltv";
interface CLVDashboardProps {
  metrics: ClientLTVMetrics;
  clients: ClientLTVMetrics["topClients"];
  className?: string;
}
export declare function CLVDashboard({
  metrics,
  clients,
  className,
}: CLVDashboardProps): import("react").JSX.Element;
//# sourceMappingURL=clv-dashboard.d.ts.map
