import { ModuleLanding } from "../components/module-landing";

const PayrollPage = () => (
  <ModuleLanding
    highlights={[
      "Timecard capture tied to events and roles.",
      "Approval workflows and exception handling.",
      "Payout summaries by pay period.",
    ]}
    summary="Track time, approvals, and payouts with event-level visibility."
    title="Payroll"
  />
);

export default PayrollPage;
