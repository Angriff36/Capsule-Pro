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
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const REQ_STATUS_CONFIG: Record<string, ReqStatusConfig> = {
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-700",
    icon: FileText,
  },
  pending_manager: {
    label: "Pending Manager",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  pending_finance: {
    label: "Pending Finance",
    color: "bg-indigo-100 text-indigo-700",
    icon: Loader2,
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  converted: {
    label: "Converted to PO",
    color: "bg-purple-100 text-purple-700",
    icon: ArrowRightLeft,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-orange-100 text-orange-700",
    icon: Ban,
  },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> =
  {
    low: { label: "Low", color: "bg-gray-100 text-gray-600" },
    normal: { label: "Normal", color: "bg-blue-100 text-blue-600" },
    high: { label: "High", color: "bg-orange-100 text-orange-600" },
    urgent: { label: "Urgent", color: "bg-red-100 text-red-600" },
    critical: { label: "Critical", color: "bg-red-200 text-red-800" },
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
