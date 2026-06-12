import { TrendingUp } from "lucide-react";
import type { PriceEstimate } from "../../types/wizard";
import { formatCurrency } from "../../utils/webhookPayload";

interface PriceEstimateBadgeProps {
  compact?: boolean;
  estimate: PriceEstimate;
}

export default function PriceEstimateBadge({
  estimate,
  compact,
}: PriceEstimateBadgeProps) {
  if (estimate.low === 0 && estimate.high === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-stone-50 px-3 py-1.5 text-stone-500 text-xs">
        <TrendingUp className="h-3 w-3" />
        <span>
          Est. {formatCurrency(estimate.low)} &ndash;{" "}
          {formatCurrency(estimate.high)}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-stone-100 p-6">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-stone-500" />
        <span className="font-medium text-stone-500 text-xs uppercase tracking-wider">
          Estimated Range
        </span>
      </div>
      <div className="font-light text-3xl text-stone-800 tracking-tight">
        {formatCurrency(estimate.low)} &ndash; {formatCurrency(estimate.high)}
      </div>
      <p className="mt-3 text-stone-400 text-xs leading-relaxed">
        This is a non-binding estimate based on the details you have provided.
        Final pricing will be confirmed after a consultation with our team.
      </p>
    </div>
  );
}
