Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientAnalyticsPage = void 0;
exports.default = ClientAnalyticsPageWithData;
const spinner_1 = require("@repo/design-system/components/ui/spinner");
const react_1 = require("react");
const module_section_1 = require("../../components/module-section");
const get_client_ltv_1 = require("./actions/get-client-ltv");
const clv_dashboard_1 = require("./components/clv-dashboard");
async function ClientAnalyticsContent() {
  const metrics = await (0, get_client_ltv_1.getClientLTVMetrics)();
  const clients = metrics.topClients;
  return <clv_dashboard_1.CLVDashboard clients={clients} metrics={metrics} />;
}
const ClientAnalyticsPage = () => (
  <module_section_1.ModuleSection
    summary="Analyze client profitability, lifetime value, retention rates, and predictive modeling."
    title="Client Analytics"
  />
);
exports.ClientAnalyticsPage = ClientAnalyticsPage;
function ClientAnalyticsPageWithData() {
  return (
    <>
      <ClientAnalyticsPage />
      <react_1.Suspense
        fallback={
          <div className="flex h-96 items-center justify-center">
            <spinner_1.Spinner className="h-8 w-8" />
          </div>
        }
      >
        <ClientAnalyticsContent />
      </react_1.Suspense>
    </>
  );
}
