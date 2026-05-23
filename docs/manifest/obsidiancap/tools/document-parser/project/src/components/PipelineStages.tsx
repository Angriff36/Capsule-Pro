import { FileSearch, Scissors, Brain, Layers, CheckCircle } from 'lucide-react';
import type { PipelineStage } from '../hooks/usePipelineAnimation';

interface Props {
  currentStage: PipelineStage;
  stageIndex: number;
}

const STAGES = [
  { key: 'extracting', label: 'Extraction', description: 'Layout-aware block extraction', icon: FileSearch },
  { key: 'segmenting', label: 'Segmentation', description: 'Rule-based filtering & grouping', icon: Scissors },
  { key: 'classifying', label: 'Classification', description: 'AI-assisted block classification', icon: Brain },
  { key: 'normalizing', label: 'Normalization', description: 'Schema validation & typing', icon: Layers },
  { key: 'complete', label: 'Complete', description: 'Review output generated', icon: CheckCircle },
] as const;

export function PipelineStages({ currentStage, stageIndex }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-5">Pipeline Stages</h2>
      <div className="flex items-start justify-between gap-2">
        {STAGES.map((stage, idx) => {
          const stagePos = idx + 1;
          const isActive = stage.key === currentStage;
          const isDone = stageIndex > stagePos;
          const Icon = stage.icon;

          return (
            <div key={stage.key} className="flex-1 flex flex-col items-center text-center relative">
              {idx > 0 && (
                <div className={`absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2 transition-colors duration-500 ${
                  isDone ? 'bg-teal-500' : isActive ? 'bg-teal-300' : 'bg-slate-200'
                }`} style={{ left: '-50%' }} />
              )}
              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                isDone
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-200'
                  : isActive
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-200 ring-4 ring-teal-100 animate-pulse'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <span className={`mt-2.5 text-xs font-semibold transition-colors duration-300 ${
                isDone || isActive ? 'text-slate-900' : 'text-slate-400'
              }`}>
                {stage.label}
              </span>
              <span className={`text-[10px] leading-tight mt-0.5 transition-colors duration-300 ${
                isDone || isActive ? 'text-slate-500' : 'text-slate-300'
              }`}>
                {stage.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
