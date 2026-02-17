"use client";

import { useCallback, useMemo, useState } from "react";
import type { BoardProjection } from "../types/board";

interface BoardState {
  projections: BoardProjection[];
}

interface HistoryEntry {
  past: BoardState;
  future: BoardState;
}

const MAX_HISTORY_SIZE = 50;

export function useBoardHistory() {
  const [past, setPast] = useState<BoardState[]>([]);
  const [future, setFuture] = useState<BoardState[]>([]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // Push a new state to history (called before making a change)
  const pushState = useCallback((projections: BoardProjection[]) => {
    setPast((prev) => {
      const newPast = [...prev, { projections }];
      // Limit history size
      if (newPast.length > MAX_HISTORY_SIZE) {
        return newPast.slice(-MAX_HISTORY_SIZE);
      }
      return newPast;
    });
    // Clear future when new action is performed
    setFuture([]);
  }, []);

  // Undo: restore previous state
  const undo = useCallback(
    (currentProjections: BoardProjection[]): BoardProjection[] => {
      if (past.length === 0) {
        return currentProjections;
      }

      const previous = past.at(-1);
      if (!previous) {
        return currentProjections;
      }
      const newPast = past.slice(0, -1);

      setPast(newPast);
      setFuture((prev) => [{ projections: currentProjections }, ...prev]);

      return previous.projections;
    },
    [past]
  );

  // Redo: restore next state
  const redo = useCallback(
    (currentProjections: BoardProjection[]): BoardProjection[] => {
      if (future.length === 0) {
        return currentProjections;
      }

      const next = future[0];
      const newFuture = future.slice(1);

      setFuture(newFuture);
      setPast((prev) => [...prev, { projections: currentProjections }]);

      return next.projections;
    },
    [future]
  );

  // Clear history
  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return useMemo(
    () => ({
      canUndo,
      canRedo,
      pushState,
      undo,
      redo,
      clearHistory,
    }),
    [canUndo, canRedo, pushState, undo, redo, clearHistory]
  );
}
