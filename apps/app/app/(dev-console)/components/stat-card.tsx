interface StatCardProperties {
  label: string;
  value: string;
  trend?: string;
  trendTone?: "positive" | "neutral" | "negative";
}

const trendStyles: Record<string, string> = {
  positive: "text-emerald-400",
  neutral: "text-slate-400",
  negative: "text-rose-400",
};

export const StatCard = ({
  label,
  value,
  trend,
  trendTone = "neutral",
}: StatCardProperties) => (
  <div className="dev-console-card">
    <div className="dev-console-card-label">{label}</div>
    <div className="dev-console-card-value">{value}</div>
    {trend ? (
      <div className={trendStyles[trendTone]}>{trend}</div>
    ) : (
      <div className="text-slate-500">—</div>
    )}
  </div>
);
