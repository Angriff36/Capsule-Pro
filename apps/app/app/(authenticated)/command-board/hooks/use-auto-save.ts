"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardState } from "../types";

// Auto-save configuration interface
export interface AutoSaveConfig {
  /** Debounce time in milliseconds for rapid changes (default: 2000ms) */
  debounceMs?: number;
  /** Interval time in milliseconds for periodic saves (default: 30000ms) */
  intervalMs?: number;
  /** Custom storage key for localStorage (auto-generated if not provided) */
  storageKey?: string;
}

// Auto-save state interface
export interface AutoSaveState {
  /** Whether a save operation is currently in progress */
  isSaving: boolean;
  /** Timestamp of the last successful save */
  lastSavedAt: Date | null;
  /** Whether there are unsaved changes that need to be saved */
  hasUnsavedChanges: boolean;
  /** Function to trigger an immediate save */
  saveNow: () => Promise<void>;
  /** Function to clear the draft from localStorage */
  clearDraft: () => void;
}

// Default configuration values
const DEFAULT_CONFIG: Required<AutoSaveConfig> = {
  debounceMs: 2000,
  intervalMs: 30_000,
  storageKey: "",
};

// Helper to generate storage key based on boardId
const generateStorageKey = (boardId: string): string =>
  `command-board-draft-${boardId}`;

// Helper to deep compare two objects
const deepEqual = (obj1: unknown, obj2: unknown): boolean => {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 == null || obj2 == null) {
    return false;
  }

  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  if (typeof obj1 !== "object") {
    return obj1 === obj2;
  }

  const obj1Keys = Object.keys(obj1 as object);
  const obj2Keys = Object.keys(obj2 as object);

  if (obj1Keys.length !== obj2Keys.length) {
    return false;
  }

  return obj1Keys.every((key) =>
    deepEqual(
      (obj1 as Record<string, unknown>)[key],
      (obj2 as Record<string, unknown>)[key]
    )
  );
};

/**
 * Hook for managing auto-save functionality for command boards
 *
 * Features:
 * - Debounces rapid state changes to avoid excessive saves
 * - Saves draft to localStorage for crash recovery
 * - Periodically saves to server
 * - Tracks save status and unsaved changes
 * - Provides manual save and draft clearance
 */
export function useAutoSave(
  boardId: string,
  state: BoardState,
  config: AutoSaveConfig = {}
): AutoSaveState {
  // Merge config with defaults
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Use provided storage key or generate one based on boardId
  const storageKey = config.storageKey || generateStorageKey(boardId);

  // State management
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedState, setLastSavedState] = useState<BoardState | null>(null);

  // Refs for intervals and timeouts
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Save to server
  const saveToServer = useCallback(async (): Promise<void> => {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/command-board/${boardId}/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state: {
            cards: state.cards,
            connections: state.connections,
            viewport: state.viewport,
          },
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to save board: ${response.status} ${response.statusText}`
        );
      }

      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving board:", error);
      // Don't throw - let the UI handle the error state
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [boardId, state.cards, state.connections, state.viewport]);

  // Save to localStorage
  const saveToLocalStorage = useCallback(
    (draftState: BoardState): void => {
      try {
        const draft = {
          state: draftState,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch (error) {
        console.error("Error saving draft to localStorage:", error);
      }
    },
    [storageKey]
  );

  // Load draft from localStorage
  const _loadDraft = useCallback((): BoardState | null => {
    try {
      const draftStr = localStorage.getItem(storageKey);
      if (!draftStr) {
        return null;
      }

      const draft = JSON.parse(draftStr);
      return {
        ...draft.state,
        board: state.board, // Preserve board data from current state
      };
    } catch (error) {
      console.error("Error loading draft from localStorage:", error);
      return null;
    }
  }, [storageKey, state.board]);

  // Check for unsaved changes
  const checkUnsavedChanges = useCallback((): boolean => {
    if (!lastSavedState) {
      return true;
    }

    // Compare only the parts that should trigger auto-save
    const comparableState = {
      cards: state.cards,
      connections: state.connections,
      viewport: state.viewport,
    };

    const comparableLastSaved = {
      cards: lastSavedState.cards,
      connections: lastSavedState.connections,
      viewport: lastSavedState.viewport,
    };

    return !deepEqual(comparableState, comparableLastSaved);
  }, [state, lastSavedState]);

  // Trigger save (with debounce)
  const triggerSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      if (isMountedRef.current) {
        await saveToServer();
      }
    }, finalConfig.debounceMs);
  }, [saveToServer, finalConfig.debounceMs]);

  // Manual save function
  const saveNow = useCallback(async (): Promise<void> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveToServer();
  }, [saveToServer]);

  // Clear draft from localStorage
  const clearDraft = useCallback((): void => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Error clearing draft from localStorage:", error);
    }
  }, [storageKey]);

  // Effect to handle state changes and auto-save
  useEffect(() => {
    if (!state) {
      return;
    }

    const hasChanges = checkUnsavedChanges();
    setHasUnsavedChanges(hasChanges);

    if (hasChanges) {
      // Save draft to localStorage immediately
      saveToLocalStorage(state);

      // Debounce server save
      triggerSave();
    }

    // Update last saved state for comparison
    setLastSavedState({
      ...state,
      board: state.board,
    });

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, checkUnsavedChanges, saveToLocalStorage, triggerSave]);

  // Effect for periodic saves
  useEffect(() => {
    // Start periodic save interval
    intervalRef.current = setInterval(async () => {
      if (isMountedRef.current && hasUnsavedChanges && !isSaving) {
        await saveToServer();
      }
    }, finalConfig.intervalMs);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [hasUnsavedChanges, isSaving, saveToServer, finalConfig.intervalMs]);

  // Effect for cleanup
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle component unmount - save final state
  useEffect(() => {
    const handleBeforeUnload = (): void => {
      if (hasUnsavedChanges) {
        // Save one final time to localStorage
        saveToLocalStorage(state);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, saveToLocalStorage, state]);

  return {
    isSaving,
    lastSavedAt,
    hasUnsavedChanges,
    saveNow,
    clearDraft,
  };
}
