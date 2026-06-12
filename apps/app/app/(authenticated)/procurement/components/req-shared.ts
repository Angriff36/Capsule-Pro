import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";

export interface ReqStatusConfig {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export const REQ_STATUS_CONFIG: Record<string, ReqStatusConfig> = {
  draft: {
    label: "Draft",
    color: "bg-muted/50 text-foreground",
    icon: FileText,
  },
  pending_manager: {
    label: "Pending Manager",
    color: "bg-muted/50 text-foreground",
    icon: Clock,
  },
  pending_finance: {
    label: "Pending Finance",
    color: "bg-muted/50 text-foreground",
    icon: Loader2,
  },
  approved: {
    label: "Approved",
    color: "bg-muted/50 text-foreground",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "bg-muted/50 text-foreground",
    icon: XCircle,
  },
  converted: {
    label: "Converted to PO",
    color: "bg-muted/50 text-foreground",
    icon: ArrowRightLeft,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-muted/50 text-foreground",
    icon: Ban,
  },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> =
  {
    low: { label: "Low", color: "bg-muted/50 text-foreground" },
    normal: { label: "Normal", color: "bg-muted/50 text-foreground" },
    high: { label: "High", color: "bg-muted/50 text-foreground" },
    urgent: { label: "Urgent", color: "bg-muted/50 text-foreground" },
    critical: { label: "Critical", color: "bg-muted/50 text-foreground" },
  };

export { formatCurrency };

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
