import { Blocks, ShieldOff, BarChart3, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import type { ParseSummary } from '../data/mock-pipeline';

interface Props {
  summary: ParseSummary;
  visible: boolean;
}

const CARDS = [
  { key: 'extracted', label: 'Blocks Extracted', icon: Blocks, color: 'slate', getValue: (s: ParseSummary) => s.totalBlocksExtracted },
  { key: 'suppressed', label: 'Noise Suppressed', icon: ShieldOff, color: 'amber', getValue: (s: ParseSummary) => s.blocksSuppressed },
  { key: 'classified', label: 'Blocks Classified', icon: BarChart3, color: 'sky', getValue: (s: ParseSummary) => s.blocksClassified },
  { key: 'entities', label: 'Entities Produced', icon: CheckCircle2, color: 'teal', getValue: (s: ParseSummary) => s.entitiesProduced },
  { key: 'unresolved', label: 'Needs Review', icon: AlertTriangle, color: 'orange', getValue: (s: ParseSummary) => s.unresolvedCount },
  { key: 'confidence', label: 'Avg Confidence', icon: Target, color: 'emerald', getValue: (s: ParseSummary) => s.averageConfidence },
] as const;

const COLOR_MAP: Record<string, { bg: string; icon: string; text: string; border: string }> = {
  slate: { bg: 'bg-slate-50', icon: 'text-slate-600', text: 'text-slate-900', border: 'border-slate-200' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-900', border: 'border-amber-200' },
  sky: { bg: 'bg-sky-50', icon: 'text-sky-600', text: 'text-sky-900', border: 'border-sky-200' },
  teal: { bg: 'bg-teal-50', icon: 'text-teal-600', text: 'text-teal-900', border: 'border-teal-200' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', text: 'text-orange-900', border: 'border-orange-200' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-900', border: 'border-emerald-200' },
};

export function SummaryCards({ summary, visible }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {CARDS.map((card, idx) => {
        const colors = COLOR_MAP[card.color];
        const Icon = card.icon;
        const value = card.getValue(summary);
        const display = card.key === 'confidence' ? `${(value * 100).toFixed(0)}%` : value;

        return (
          <div
            key={card.key}
            className={`${colors.bg} border ${colors.border} rounded-lg p-4 transition-all duration-500 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: visible ? `${idx * 80}ms` : '0ms' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${colors.icon}`} />
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{card.label}</span>
            </div>
            <div className={`text-2xl font-bold ${colors.text}`}>{display}</div>
          </div>
        );
      })}
    </div>
  );
}
