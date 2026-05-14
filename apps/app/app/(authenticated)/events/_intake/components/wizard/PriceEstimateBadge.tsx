import { TrendingUp } from "lucide-react";
import type { PriceEstimate } from "../../types/wizard";
import { formatCurrency } from "../../utils/webhookPayload";

interface PriceEstimateBadgeProps {
  estimate: PriceEstimate;
  compact?: boolean;
}

export default function PriceEstimateBadge({
  estimate,
  compact,
}: PriceEstimateBadgeProps) {
  if (estimate.low === 0 && estimate.high === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-50 rounded-full px-3 py-1.5">
        <TrendingUp className="w-3 h-3" />
        <span>
          Est. {formatCurrency(estimate.low)} &ndash;{" "}
          {formatCurrency(estimate.high)}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl p-6 border border-stone-200">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-stone-500" />
        <span className="text-xs uppercase tracking-wider text-stone-500 font-medium">
          Estimated Range
        </span>
      </div>
      <div className="text-3xl font-light text-stone-800 tracking-tight">
        {formatCurrency(estimate.low)} &ndash; {formatCurrency(estimate.high)}
      </div>
      <p className="text-xs text-stone-400 mt-3 leading-relaxed">
        This is a non-binding estimate based on the details you have provided.
        Final pricing will be confirmed after a consultation with our team.
      </p>
    </div>
  );
}
