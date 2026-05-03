import {
  BookOpen,
  CreditCard,
  FileText,
  TrendingUp,
} from "lucide-react";
import { ModuleLanding } from "../components/module-landing";

const AccountingPage = () => (
  <ModuleLanding
    eyebrow="Operations / Accounting"
    highlights={[
      {
        title: "Invoices",
        description:
          "Create, send, and track invoices across events, clients, and vendors.",
        href: "/accounting/invoices",
        actionLabel: "View invoices",
        icon: FileText,
      },
      {
        title: "Payments",
        description:
          "Record payments, manage payment methods, and reconcile against invoices.",
        href: "/accounting/payments",
        actionLabel: "Manage payments",
        icon: CreditCard,
      },
      {
        title: "Chart of accounts",
        description:
          "Configure your general ledger accounts, categories, and coding structure.",
        href: "/accounting/chart-of-accounts",
        actionLabel: "View accounts",
        icon: BookOpen,
      },
      {
        title: "Financial reports",
        description:
          "Revenue recognition, profit-and-loss, and balance sheet reporting.",
        href: "/analytics/finance",
        actionLabel: "View reports",
        icon: TrendingUp,
      },
    ]}
    summary="Invoices, payments, chart of accounts, and financial reporting — your books in one place."
    title="Accounting"
  />
);

export default AccountingPage;
