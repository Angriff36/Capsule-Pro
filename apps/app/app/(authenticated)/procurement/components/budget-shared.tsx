import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

export interface Budget {
  budget_amount: number;
  category: string | null;
  committed_amount: number;
  created_at: string;
  description: string | null;
  fiscal_year: number;
  id: string;
  name: string;
  notes: string | null;
  period_end: string | null;
  period_start: string | null;
  period_type: string;
  spent_amount: number;
  status: string;
  threshold_critical_pct: number;
  threshold_warning_pct: number;
  unacknowledged_alert_count: number;
  updated_at: string;
}

export interface BudgetSpend {
  committed: number;
  poCount: number;
  remaining: number;
  totalSpent: number;
  utilizationPct: number;
}

export interface BudgetAlert {
  acknowledged_at: string | null;
  alert_type: string;
  budget_id: string;
  created_at: string;
  id: string;
  is_acknowledged: boolean;
  message: string;
  resolved: boolean;
  utilization_pct: number;
}

export interface MonthlyBreakdown {
  amount: number;
  month: string;
  po_count: number;
}

export const PERIOD_TYPE_OPTIONS = [
  { value: "annual", label: "Annual" },
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
];

export const formatPeriodType = (t: string) => {
  const opt = PERIOD_TYPE_OPTIONS.find((o) => o.value === t);
  return opt?.label || t;
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-muted/50 text-foreground";
    case "paused":
      return "bg-muted/50 text-foreground";
    case "closed":
      return "bg-muted/50 text-foreground";
    default:
      return "bg-muted/50 text-foreground";
  }
};

export const getUtilizationColor = (
  pct: number,
  warningPct: number,
  criticalPct: number
) => {
  if (pct >= criticalPct) {
    return "bg-red-500";
  }
  if (pct >= warningPct) {
    return "bg-amber-500";
  }
  return "bg-blue-500";
};

export const getUtilizationBarColor = (
  pct: number,
  warningPct: number,
  criticalPct: number
) => {
  if (pct >= criticalPct) {
    return "bg-red-500";
  }
  if (pct >= warningPct) {
    return "bg-amber-500";
  }
  if (pct >= warningPct * 0.7) {
    return "bg-blue-400";
  }
  return "bg-blue-500";
};

export const UtilizationBar = ({
  pct,
  warningPct,
  criticalPct,
  label,
  compact = false,
}: {
  pct: number;
  warningPct: number;
  criticalPct: number;
  label?: string;
  compact?: boolean;
}) => {
  const clampedPct = Math.min(pct, 150);
  const displayPct = Math.round(clampedPct);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span
          className={`font-medium text-sm ${
            pct >= criticalPct
              ? "text-red-600"
              : pct >= warningPct
                ? "text-amber-600"
                : "text-foreground"
          }`}
        >
          {label ? `${label}: ` : ""}
          {displayPct}%
        </span>
        {pct >= criticalPct && !compact && (
          <span className="flex items-center gap-1 text-red-600 text-xs">
            <AlertTriangle className="h-3 w-3" />
            Over budget
          </span>
        )}
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted/50">
        {/* Warning threshold marker */}
        <div
          className="absolute top-0 z-10 h-full w-0.5 bg-amber-300"
          style={{ left: `${Math.min(warningPct, 100)}%` }}
        />
        {/* Critical threshold marker */}
        <div
          className="absolute top-0 z-10 h-full w-0.5 bg-red-300"
          style={{ left: `${Math.min(criticalPct, 100)}%` }}
        />
        {/* Progress bar */}
        <div
          className={`h-full rounded-full transition-all duration-300 ${getUtilizationBarColor(pct, warningPct, criticalPct)}`}
          style={{ width: `${Math.min(clampedPct, 100)}%` }}
        />
      </div>
    </div>
  );
};

export const TrendIcon = ({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) => {
  if (previous === 0) {
    return null;
  }
  const change = ((current - previous) / previous) * 100;
  if (change > 0) {
    return (
      <span className="flex items-center gap-0.5 text-red-600 text-xs">
        <TrendingUp className="h-3 w-3" />+{change.toFixed(0)}%
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="flex items-center gap-0.5 text-green-600 text-xs">
        <TrendingDown className="h-3 w-3" />
        {change.toFixed(0)}%
      </span>
    );
  }
  return null;
};
