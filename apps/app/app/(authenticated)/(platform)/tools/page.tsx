import { ModuleLanding } from "../../components/module-landing";

const ToolsPage = () => (
  <ModuleLanding
    highlights={[
      "Report autofill for standardized client outputs.",
      "AI helpers for parsing and summarization.",
      "Reaction execution log and per-command P95 latency dashboards.",
    ]}
    summary="Operational utilities for report automation, AI assist, and Manifest observability."
    title="Tools"
  />
);

export default ToolsPage;
