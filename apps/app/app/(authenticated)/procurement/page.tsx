import {
  ClipboardCheck,
  FileText,
  Landmark,
  Package,
  Users,
} from "lucide-react";
import { ModuleLanding } from "../components/module-landing";

const ProcurementPage = () => (
  <ModuleLanding
    eyebrow="Operations / Procurement"
    highlights={[
      {
        title: "Requisitions",
        description:
          "Create, submit, and track purchase requisitions with multi-level approval.",
        href: "/procurement/requisitions",
        actionLabel: "View requisitions",
        icon: ClipboardCheck,
      },
      {
        title: "Purchase orders",
        description:
          "Generate purchase orders from approved requisitions and track fulfillment.",
        href: "/procurement/purchase-orders",
        actionLabel: "View orders",
        icon: Package,
      },
      {
        title: "Vendor contracts",
        description:
          "Manage vendor agreements, SLAs, compliance requirements, and renewals.",
        href: "/procurement/vendor-contracts",
        actionLabel: "View contracts",
        icon: FileText,
      },
      {
        title: "Vendors",
        description:
          "Vendor directory with catalogs, ratings, and contact management.",
        href: "/procurement/vendors",
        actionLabel: "Manage vendors",
        icon: Users,
      },
      {
        title: "Budget",
        description:
          "Procurement budgets, spending tracking, and budget alerts.",
        href: "/procurement/budget",
        actionLabel: "View budget",
        icon: Landmark,
      },
      {
        title: "Approvals",
        description:
          "Pending requisition and contract approvals requiring your action.",
        href: "/procurement/approvals",
        actionLabel: "Review approvals",
        icon: ClipboardCheck,
      },
    ]}
    summary="Requisitions, purchase orders, vendor contracts, and budgets — source and procure with control."
    title="Procurement"
  />
);

export default ProcurementPage;
