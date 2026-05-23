import { useState, useCallback, useRef } from 'react';

export type PipelineStage = 'idle' | 'extracting' | 'segmenting' | 'classifying' | 'normalizing' | 'complete';

const STAGE_ORDER: PipelineStage[] = ['idle', 'extracting', 'segmenting', 'classifying', 'normalizing', 'complete'];
const STAGE_DURATIONS: Record<PipelineStage, number> = {
  idle: 0,
  extracting: 1200,
  segmenting: 900,
  classifying: 1100,
  normalizing: 800,
  complete: 0,
};

export function usePipelineAnimation() {
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const runPipeline = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    setStage('idle');

    let index = 1;
    const advance = () => {
      if (index >= STAGE_ORDER.length) {
        setIsRunning(false);
        return;
      }
      const nextStage = STAGE_ORDER[index];
      setStage(nextStage);
      index++;
      if (nextStage !== 'complete') {
        timerRef.current = setTimeout(advance, STAGE_DURATIONS[nextStage]);
      } else {
        setIsRunning(false);
      }
    };

    timerRef.current = setTimeout(advance, 300);
  }, [isRunning]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStage('idle');
    setIsRunning(false);
  }, []);

  const stageIndex = STAGE_ORDER.indexOf(stage);

  return { stage, stageIndex, isRunning, runPipeline, reset };
}
