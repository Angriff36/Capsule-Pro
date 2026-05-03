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
    color: "bg-muted/50 text-foreground",
    icon: FileText,
  },
  pending_approval: {
    label: "Pending Approval",
    color: "bg-muted/50 text-foreground",
    icon: Clock,
  },
  pending_activation: {
    label: "Pending Activation",
    color: "bg-muted/50 text-foreground",
    icon: Clock,
  },
  active: {
    label: "Active",
    color: "bg-muted/50 text-foreground",
    icon: CheckCircle2,
  },
  expired: {
    label: "Expired",
    color: "bg-muted/50 text-foreground",
    icon: PauseCircle,
  },
  terminated: {
    label: "Terminated",
    color: "bg-muted/50 text-foreground",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-muted/50 text-foreground",
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
