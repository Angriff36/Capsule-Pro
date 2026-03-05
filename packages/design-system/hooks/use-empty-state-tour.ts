"use client";

import * as React from "react";
import {
  MicroTour,
  type MicroTourStep,
  TOUR_CONFIGS,
  type TourConfigKey,
  useMicroTourState,
} from "../components/blocks/micro-tour";

interface UseEmptyStateTourOptions {
  tourId: TourConfigKey | string;
  isEmpty: boolean;
  steps?: MicroTourStep[];
  delay?: number;
  storageKeyPrefix?: string;
  onComplete?: () => void;
  onDontShowAgain?: () => void;
}

interface UseEmptyStateTourReturn {
  isTourActive: boolean;
  isTourDismissed: boolean;
  startTour: () => void;
  endTour: () => void;
  resetTour: () => void;
  TourComponent: React.ReactNode;
}

export function useEmptyStateTour(
  options: UseEmptyStateTourOptions
): UseEmptyStateTourReturn {
  const {
    tourId,
    isEmpty,
    steps: customSteps,
    delay = 500,
    storageKeyPrefix,
    onComplete,
    onDontShowAgain,
  } = options;

  const steps = React.useMemo<MicroTourStep[]>(() => {
    if (customSteps) {
      return [...customSteps];
    }
    const predefinedKey = tourId as TourConfigKey;
    return [...(TOUR_CONFIGS[predefinedKey]?.steps ?? [])];
  }, [customSteps, tourId]);

  const {
    isActive,
    isDismissed,
    handleComplete,
    handleDontShowAgain,
    resetTour,
    setIsActive,
  } = useMicroTourState(tourId, {
    storageKeyPrefix,
    onDontShowAgain,
  });

  React.useEffect(() => {
    if (isEmpty && !isDismissed && !isActive) {
      const timer = setTimeout(() => {
        setIsActive(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isEmpty, isDismissed, isActive, delay, setIsActive]);

  React.useEffect(() => {
    if (!isEmpty && isActive) {
      handleComplete();
    }
  }, [isEmpty, isActive, handleComplete]);

  const startTour = React.useCallback(() => {
    setIsActive(true);
  }, [setIsActive]);

  const endTour = React.useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  const TourComponent = React.useMemo(() => {
    if (!isActive || steps.length === 0) {
      return null;
    }

    return React.createElement(MicroTour, {
      tourId,
      steps,
      isActive,
      onComplete: () => {
        handleComplete();
        onComplete?.();
      },
      onDontShowAgain: handleDontShowAgain,
      storageKeyPrefix,
    });
  }, [
    isActive,
    steps,
    tourId,
    handleComplete,
    handleDontShowAgain,
    storageKeyPrefix,
    onComplete,
  ]);

  return {
    isTourActive: isActive,
    isTourDismissed: isDismissed,
    startTour,
    endTour,
    resetTour,
    TourComponent,
  };
}

export function withEmptyStateTour(options: UseEmptyStateTourOptions) {
  return useEmptyStateTour(options);
}
