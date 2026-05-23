import { Activity, Info, AlertTriangle, XCircle } from 'lucide-react';
import type { DiagnosticEntry } from '../data/mock-pipeline';

interface Props {
  diagnostics: DiagnosticEntry[];
  visible: boolean;
}

const SEVERITY_CONFIG = {
  info: { icon: Info, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', dot: 'bg-slate-400' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
  error: { icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
};

const STAGE_LABELS: Record<string, string> = {
  extraction: 'EXT',
  segmentation: 'SEG',
  classification: 'CLS',
  normalization: 'NRM',
  validation: 'VAL',
};

export function DiagnosticsView({ diagnostics, visible }: Props) {
  return (
    <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-700">Diagnostics Log</h3>
        <span className="text-xs text-slate-400">{diagnostics.length} entries</span>
      </div>
      <div className="bg-slate-900 rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-700 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <span className="text-[10px] text-slate-400 font-mono ml-2">parse-diagnostics</span>
        </div>
        <div className="p-4 max-h-80 overflow-y-auto font-mono text-xs space-y-1 custom-scrollbar">
          {diagnostics.map((d, i) => {
            const config = SEVERITY_CONFIG[d.severity as keyof typeof SEVERITY_CONFIG];
            const stageLabel = STAGE_LABELS[d.stage] || d.stage.slice(0, 3).toUpperCase();
            return (
              <div
                key={i}
                className="flex items-start gap-2 py-0.5 transition-all duration-300"
                style={{
                  opacity: visible ? 1 : 0,
                  transitionDelay: `${i * 40}ms`,
                }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot} mt-1.5 shrink-0`} />
                <span className="text-slate-500 shrink-0">[{stageLabel}]</span>
                <span className={`${
                  d.severity === 'error' ? 'text-red-400' :
                  d.severity === 'warning' ? 'text-amber-400' :
                  'text-slate-400'
                } leading-relaxed`}>
                  {d.message}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
