import { ModuleLanding } from "../components/module-landing";

const AnalyticsPage = () => (
  <ModuleLanding
    highlights={[
      "Production throughput and task completion rates.",
      "Event profitability and margin tracking.",
      "Cost and labor analytics by period.",
    ]}
    summary="Measure operational performance across kitchen, events, and finance."
    title="Analytics"
  />
);

export default AnalyticsPage;
