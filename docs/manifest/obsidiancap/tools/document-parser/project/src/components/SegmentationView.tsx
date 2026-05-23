import { Scissors, ShieldOff, Check } from 'lucide-react';
import type { CandidateBlock } from '../data/mock-pipeline';

interface Props {
  candidates: CandidateBlock[];
  visible: boolean;
}

const SEGMENT_COLORS: Record<string, string> = {
  menu_item_header: 'bg-teal-50 border-teal-200 text-teal-800',
  body_text: 'bg-slate-50 border-slate-200 text-slate-700',
  table_row: 'bg-sky-50 border-sky-200 text-sky-800',
  list_entry: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  ambiguous: 'bg-amber-50 border-amber-200 text-amber-800',
};

export function SegmentationView({ candidates, visible }: Props) {
  const active = candidates.filter((c) => !c.suppressed);
  const suppressed = candidates.filter((c) => c.suppressed);

  return (
    <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Scissors className="w-4 h-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-700">Stage 2: Segmentation & Filtering</h3>
        <span className="text-xs text-slate-400">{active.length} candidates, {suppressed.length} suppressed</span>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Check className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-xs font-medium text-slate-600">Active Candidates</span>
          </div>
          <div className="space-y-2">
            {active.map((c, i) => (
              <div
                key={c.id}
                className={`border rounded-lg p-3 transition-all duration-500 ${SEGMENT_COLORS[c.segmentationType] || SEGMENT_COLORS.ambiguous}`}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm leading-snug whitespace-pre-line flex-1">{c.mergedContent}</p>
                  <span className="text-[10px] font-mono bg-white/70 px-1.5 py-0.5 rounded border border-current/10 whitespace-nowrap shrink-0">
                    {c.segmentationType.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldOff className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-slate-600">Suppressed (Noise)</span>
          </div>
          <div className="space-y-2">
            {suppressed.map((c, i) => (
              <div
                key={c.id}
                className="border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50/50 opacity-70"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-slate-400 line-through">
                    {c.mergedContent}
                  </span>
                </div>
                <p className="text-[10px] text-amber-600 mt-1 font-medium">
                  {c.suppressionReason}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 leading-relaxed">
              Orphan numbers ("2", "3") and page markers are automatically suppressed when not adjacent to food-quantity patterns. This removes noise before classification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
