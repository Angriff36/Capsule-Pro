import { Play, RotateCcw } from 'lucide-react';
import { Header } from './components/Header';
import { PipelineStages } from './components/PipelineStages';
import { SummaryCards } from './components/SummaryCards';
import { ExtractionView } from './components/ExtractionView';
import { SegmentationView } from './components/SegmentationView';
import { ClassificationView } from './components/ClassificationView';
import { EntitiesView } from './components/EntitiesView';
import { DiagnosticsView } from './components/DiagnosticsView';
import { usePipelineAnimation } from './hooks/usePipelineAnimation';
import {
  MOCK_BLOCKS,
  MOCK_CANDIDATES,
  MOCK_CLASSIFICATIONS,
  MOCK_ENTITIES,
  MOCK_UNRESOLVED,
  MOCK_DIAGNOSTICS,
  MOCK_SUMMARY,
} from './data/mock-pipeline';

function App() {
  const { stage, stageIndex, isRunning, runPipeline, reset } = usePipelineAnimation();

  const showExtraction = stageIndex >= 1;
  const showSegmentation = stageIndex >= 2;
  const showClassification = stageIndex >= 3;
  const showNormalization = stageIndex >= 4;
  const showComplete = stageIndex >= 5;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Pipeline Demo</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Parse a mock catering PDF through all five pipeline stages
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stage === 'idle' ? (
              <button
                onClick={runPipeline}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 active:scale-[0.97]"
              >
                <Play className="w-4 h-4" />
                Run Pipeline
              </button>
            ) : (
              <button
                onClick={reset}
                disabled={isRunning}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            )}
            {isRunning && (
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                Processing...
              </span>
            )}
          </div>
        </div>

        <PipelineStages currentStage={stage} stageIndex={stageIndex} />

        {showComplete && (
          <SummaryCards summary={MOCK_SUMMARY} visible={showComplete} />
        )}

        {showExtraction && (
          <ExtractionView blocks={MOCK_BLOCKS} visible={showExtraction} />
        )}

        {showSegmentation && (
          <SegmentationView candidates={MOCK_CANDIDATES} visible={showSegmentation} />
        )}

        {showClassification && (
          <ClassificationView classifications={MOCK_CLASSIFICATIONS} visible={showClassification} />
        )}

        {showNormalization && (
          <EntitiesView
            entities={MOCK_ENTITIES}
            unresolved={MOCK_UNRESOLVED}
            visible={showNormalization}
          />
        )}

        {showComplete && (
          <DiagnosticsView diagnostics={MOCK_DIAGNOSTICS} visible={showComplete} />
        )}

        {stage === 'idle' && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
              <Play className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Click "Run Pipeline" to process a mock catering document through all five stages:
              extraction, segmentation, classification, normalization, and review output.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
