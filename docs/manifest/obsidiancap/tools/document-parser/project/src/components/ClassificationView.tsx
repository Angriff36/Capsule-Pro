import { Brain } from 'lucide-react';
import type { ClassificationResult } from '../data/mock-pipeline';

interface Props {
  classifications: ClassificationResult[];
  visible: boolean;
}

const CLASS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  menu_item: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  modifier: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  ingredient_list: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  instruction: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  note: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  noise: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
};

function confidenceBar(conf: number): { width: string; color: string } {
  const pct = `${(conf * 100).toFixed(0)}%`;
  if (conf >= 0.8) return { width: pct, color: 'bg-teal-500' };
  if (conf >= 0.6) return { width: pct, color: 'bg-amber-500' };
  return { width: pct, color: 'bg-red-500' };
}

export function ClassificationView({ classifications, visible }: Props) {
  return (
    <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-700">Stage 3: Classification</h3>
        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Rule-based fallback</span>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Block</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Classification</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-40">Confidence</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rationale</th>
                <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Linked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classifications.map((c, i) => {
                const style = CLASS_STYLES[c.classification] || CLASS_STYLES.noise;
                const bar = confidenceBar(c.confidence);
                return (
                  <tr
                    key={c.blockId}
                    className="hover:bg-slate-50/50 transition-all duration-500"
                    style={{
                      opacity: visible ? 1 : 0,
                      transform: visible ? 'none' : 'translateX(-12px)',
                      transitionDelay: `${i * 70}ms`,
                    }}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{c.blockId}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {c.classification.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${bar.color} transition-all duration-700`} style={{ width: bar.width }} />
                        </div>
                        <span className="text-xs font-mono text-slate-500 w-8 text-right">{(c.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[250px]">{c.rationale}</td>
                    <td className="px-4 py-2.5 text-center">
                      {c.belongsToPreviousItem && (
                        <span className="text-[10px] bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded border border-sky-200">prev</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
