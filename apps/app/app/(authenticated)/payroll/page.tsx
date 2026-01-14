import { ModuleLanding } from "../components/module-landing";

const PayrollPage = () => (
  <ModuleLanding
    title="Payroll"
    summary="Track time, approvals, and payouts with event-level visibility."
    highlights={[
      "Timecard capture tied to events and roles.",
      "Approval workflows and exception handling.",
      "Payout summaries by pay period.",
    ]}
  />
);

export default PayrollPage;
