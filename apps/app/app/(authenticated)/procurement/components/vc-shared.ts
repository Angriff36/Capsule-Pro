import {
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  PauseCircle,
  XCircle,
} from "lucide-react";

export interface VCStatusConfig {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const VC_STATUS_CONFIG: Record<string, VCStatusConfig> = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-700",
    icon: FileText,
  },
  pending_approval: {
    label: "Pending Approval",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  pending_activation: {
    label: "Pending Activation",
    color: "bg-indigo-100 text-indigo-700",
    icon: Clock,
  },
  active: {
    label: "Active",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  expired: {
    label: "Expired",
    color: "bg-yellow-100 text-yellow-700",
    icon: PauseCircle,
  },
  terminated: {
    label: "Terminated",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-orange-100 text-orange-700",
    icon: Ban,
  },
};

export const CONTRACT_TYPE_CONFIG: Record<string, string> = {
  purchase: "Purchase",
  service: "Service",
  lease: "Lease",
  maintenance: "Maintenance",
  consulting: "Consulting",
  distribution: "Distribution",
};

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(n));

export const formatDate = (d: string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

export const formatDateShort = (d: string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";
