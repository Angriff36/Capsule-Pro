import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Package,
  Truck,
  XCircle,
} from "lucide-react";

export interface POStatusConfig {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export const STATUS_CONFIG: Record<string, POStatusConfig> = {
  draft: {
    label: "Draft",
    color: "bg-muted/50 text-foreground",
    icon: FileText,
  },
  submitted: {
    label: "Submitted",
    color: "bg-muted/50 text-foreground",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "bg-muted/50 text-foreground",
    icon: CheckCircle2,
  },
  ordered: {
    label: "Ordered",
    color: "bg-muted/50 text-foreground",
    icon: Truck,
  },
  received: {
    label: "Received",
    color: "bg-muted/50 text-foreground",
    icon: Package,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-muted/50 text-foreground",
    icon: XCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-muted/50 text-foreground",
    icon: AlertTriangle,
  },
};

export const STATUS_WORKFLOW: Record<string, string[]> = {
  submitted: ["approved", "rejected", "cancelled"],
  approved: ["ordered", "cancelled"],
  ordered: ["received"],
};

export { formatCurrency };

export const formatDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

export const formatDateShort = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";
