Object.defineProperty(exports, "__esModule", { value: true });
exports.StatCard = void 0;
const trendStyles = {
  positive: "text-emerald-400",
  neutral: "text-slate-400",
  negative: "text-rose-400",
};
const StatCard = ({ label, value, trend, trendTone = "neutral" }) => (
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
exports.StatCard = StatCard;
