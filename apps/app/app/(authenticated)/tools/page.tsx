import { ModuleLanding } from "../components/module-landing";

const ToolsPage = () => (
  <ModuleLanding
    title="Tools"
    summary="Operational utilities for battle boards, report automation, and AI assist."
    highlights={[
      "Battleboard generation and print-ready exports.",
      "Report autofill for standardized client outputs.",
      "AI helpers for parsing and summarization.",
    ]}
  />
);

export default ToolsPage;
