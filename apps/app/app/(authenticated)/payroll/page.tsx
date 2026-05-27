import {
  CalendarClockIcon,
  CircleDollarSignIcon,
  ClipboardCheckIcon,
} from "lucide-react";
import { ModuleLanding } from "../components/module-landing";

const PayrollPage = () => (
  <ModuleLanding
    eyebrow="Operations / Payroll"
    highlights={[
      {
        title: "Timecards",
        description:
          "Track time entries tied to events, roles, and worked hours.",
        href: "/payroll/timecards",
        actionLabel: "View Timecards",
        icon: CalendarClockIcon,
      },
      {
        title: "Approvals",
        description:
          "Review pending approvals and payroll risks before the next run.",
        href: "/payroll/approvals",
        actionLabel: "Review Approvals",
        icon: ClipboardCheckIcon,
      },
      {
        title: "Payouts",
        description: "Inspect payout channels and run-level payroll summaries.",
        href: "/payroll/payouts",
        actionLabel: "Open Payouts",
        icon: CircleDollarSignIcon,
      },
    ]}
    summary="Track time, approvals, and payouts with event-level visibility."
    title="Payroll"
  />
);

export default PayrollPage;
