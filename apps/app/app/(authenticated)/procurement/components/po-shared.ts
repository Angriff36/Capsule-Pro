import {
  FileText,
  Clock,
  CheckCircle2,
  Truck,
  Package,
  XCircle,
  AlertTriangle,
} from "lucide-react";

export interface POStatusConfig {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STATUS_CONFIG: Record<string, POStatusConfig> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileText },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700", icon: Clock },
  approved: { label: "Approved", color: "bg-indigo-100 text-indigo-700", icon: CheckCircle2 },
  ordered: { label: "Ordered", color: "bg-purple-100 text-purple-700", icon: Truck },
  received: { label: "Received", color: "bg-green-100 text-green-700", icon: Package },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle },
  rejected: { label: "Rejected", color: "bg-orange-100 text-orange-700", icon: AlertTriangle },
};

export const STATUS_WORKFLOW: Record<string, string[]> = {
  submitted: ["approved", "rejected", "cancelled"],
  approved: ["ordered", "cancelled"],
  ordered: ["received"],
};

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n),
  );

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
