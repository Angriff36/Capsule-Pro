import {
  FileCheck,
  FileSignature,
  List,
  AlertTriangle,
} from "lucide-react";
import { ModuleLanding } from "../components/module-landing";

const ContractsPage = () => (
  <ModuleLanding
    eyebrow="Operations / Contracts"
    highlights={[
      {
        title: "Event contracts",
        description:
          "Client-facing event contracts with signature capture and compliance tracking.",
        href: "/events/contracts",
        actionLabel: "View event contracts",
        icon: FileSignature,
      },
      {
        title: "Vendor contracts",
        description:
          "Supplier and vendor agreements, SLAs, compliance, and renewal management.",
        href: "/procurement/vendor-contracts",
        actionLabel: "View vendor contracts",
        icon: FileCheck,
      },
      {
        title: "All contracts",
        description:
          "Unified view of event and vendor contracts across all statuses.",
        href: "/events/contracts",
        actionLabel: "View all",
        icon: List,
      },
      {
        title: "Expiry monitoring",
        description:
          "Contracts approaching expiry, renewal reminders, and SLA breach alerts.",
        href: "/events/contracts",
        actionLabel: "Review expiring",
        icon: AlertTriangle,
      },
    ]}
    summary="Event and vendor contracts, signatures, compliance, and expiry monitoring."
    title="Contracts"
  />
);

export default ContractsPage;
