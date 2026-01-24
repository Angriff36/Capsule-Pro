Object.defineProperty(exports, "__esModule", { value: true });
const module_landing_1 = require("../components/module-landing");
const PayrollPage = () => (
  <module_landing_1.ModuleLanding
    highlights={[
      "Timecard capture tied to events and roles.",
      "Approval workflows and exception handling.",
      "Payout summaries by pay period.",
    ]}
    summary="Track time, approvals, and payouts with event-level visibility."
    title="Payroll"
  />
);
exports.default = PayrollPage;
