import { ModuleLanding } from "../components/module-landing";

const AnalyticsPage = () => (
  <ModuleLanding
    title="Analytics"
    summary="Measure operational performance across kitchen, events, and finance."
    highlights={[
      "Production throughput and task completion rates.",
      "Event profitability and margin tracking.",
      "Cost and labor analytics by period.",
    ]}
  />
);

export default AnalyticsPage;
