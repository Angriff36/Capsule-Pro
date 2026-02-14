/**
 * use-undo-redo Hook
 *
 * React hook that integrates the UndoManager with Command Board state.
 * Provides undo/redo functionality with keyboard shortcuts and auto-save.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type CommandType,
  clearAllStacksFromStorage,
  createUndoManager,
  restoreFromSnapshot,
  type UndoManager,
  type UndoStack,
} from "../lib/undo-manager";
import type { BoardState } from "../types";

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for useUndoRedo hook
 */
export interface UseUndoRedoReturn {
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of undoable actions */
  undoCount: number;
  /** Number of redoable actions */
  redoCount: number;
  /** Execute undo operation */
  undo: () => void;
  /** Execute redo operation */
  redo: () => void;
  /** Record an action before execution */
  recordAction: (
    command: CommandType,
    currentState: BoardState,
    description?: string
  ) => void;
  /** Clear the undo stack */
  clear: () => void;
  /** Current undo stack (for debugging/display) */
  undoStack: UndoStack;
  /** Pause undo tracking (useful for batch operations) */
  pause: () => void;
  /** Resume undo tracking */
  resume: () => void;
  /** Whether undo tracking is paused */
  isPaused: boolean;
}

// =============================================================================
// Options
// =============================================================================

/**
 * Options for useUndoRedo hook
 */
export interface UseUndoRedoOptions {
  /** Board ID for storage key */
  boardId: string;
  /** Initial board state */
  initialState?: BoardState;
  /** Callback when state needs to be restored (undo) */
  onStateRestore: (state: Partial<BoardState>) => void;
  /** Callback when redo needs to re-execute action */
  onRedoExecute?: (item: {
    command: CommandType;
    description?: string;
  }) => void;
  /** Enable keyboard shortcuts (default: true) */
  enableShortcuts?: boolean;
  /** Auto-clear stack on unmount (default: false) */
  clearOnUnmount?: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useUndoRedo Hook
 *
 * Provides undo/redo functionality for the command board.
 *
 * @example
 * ```tsx
 * const { canUndo, canRedo, undo, redo, recordAction } = useUndoRedo({
 *   boardId: board.id,
 *   onStateRestore: (state) => {
 *     dispatch({ type: "SET_CARDS", payload: state.cards ?? [] });
 *     dispatch({ type: "SET_CONNECTIONS", payload: state.connections ?? [] });
 *   },
 * });
 *
 * // When executing an action:
 * recordAction("createCard", state);
 * const result = await createCard(boardId, input);
 * ```
 */
export function useUndoRedo({
  boardId,
  initialState,
  onStateRestore,
  onRedoExecute,
  enableShortcuts = true,
  clearOnUnmount = false,
}: UseUndoRedoOptions): UseUndoRedoReturn {
  // Refs to avoid recreating manager on re-renders
  const managerRef = useRef<UndoManager | null>(null);
  const isPausedRef = useRef(false);

  // State for tracking undo/redo availability
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [undoStack, setUndoStack] = useState<UndoStack>({
    past: [],
    future: [],
  });

  // Execute undo
  const undo = useCallback((): void => {
    const manager = managerRef.current;
    if (!manager) {
      console.warn("UndoManager not initialized");
      return;
    }

    if (!manager.canUndo()) {
      toast.error("Nothing to undo");
      return;
    }

    const snapshot = manager.undo();
    if (snapshot) {
      const state = restoreFromSnapshot(snapshot);
      onStateRestore(state);
      toast.success("Undo successful");
    }
  }, [onStateRestore]);

  // Execute redo
  const redo = useCallback((): void => {
    const manager = managerRef.current;
    if (!manager) {
      console.warn("UndoManager not initialized");
      return;
    }

    if (!manager.canRedo()) {
      toast.error("Nothing to redo");
      return;
    }

    const item = manager.redo();
    if (item) {
      // For redo, we need to re-execute the original action
      // The onRedoExecute callback should handle this
      if (onRedoExecute) {
        onRedoExecute({
          command: item.command,
          description: item.description,
        });
      }
      toast.success("Redo successful");
    }
  }, [onRedoExecute]);

  // Initialize manager
  if (!managerRef.current) {
    managerRef.current = createUndoManager(boardId, initialState);
    const stack = managerRef.current.getStack();
    setCanUndo(managerRef.current.canUndo());
    setCanRedo(managerRef.current.canRedo());
    setUndoCount(managerRef.current.getPastCount());
    setRedoCount(managerRef.current.getFutureCount());
    setUndoStack(stack);
  }

  // Subscribe to manager changes
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }

    const unsubscribe = manager.subscribe(() => {
      setCanUndo(manager.canUndo());
      setCanRedo(manager.canRedo());
      setUndoCount(manager.getPastCount());
      setRedoCount(manager.getFutureCount());
      setUndoStack(manager.getStack());
    });

    return unsubscribe;
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!enableShortcuts) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Check for Ctrl+Z (undo) or Ctrl+Shift+Z / Ctrl+Y (redo)
      const isCtrl = event.ctrlKey || event.metaKey;

      if (!isCtrl) {
        return;
      }

      // Ignore if in input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.key === "z" && !event.shiftKey) {
        // Ctrl+Z = Undo
        event.preventDefault();
        undo();
      } else if ((event.key === "z" && event.shiftKey) || event.key === "y") {
        // Ctrl+Shift+Z or Ctrl+Y = Redo
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enableShortcuts, undo, redo]);

  // Clear on unmount if requested
  useEffect(() => {
    return () => {
      if (clearOnUnmount && managerRef.current) {
        managerRef.current.clear();
      }
    };
  }, [clearOnUnmount]);

  // Record action before execution
  const recordAction = useCallback(
    (
      command: CommandType,
      currentState: BoardState,
      description?: string
    ): void => {
      if (isPausedRef.current) {
        return;
      }

      const manager = managerRef.current;
      if (!manager) {
        console.warn("UndoManager not initialized");
        return;
      }

      manager.recordAction(command, currentState, description);
    },
    []
  );

  // Clear the undo stack
  const clear = useCallback((): void => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }

    manager.clear();
    setCanUndo(false);
    setCanRedo(false);
    setUndoCount(0);
    setRedoCount(0);
    setUndoStack({ past: [], future: [] });
  }, []);

  // Pause undo tracking
  const pause = useCallback((): void => {
    isPausedRef.current = true;
  }, []);

  // Resume undo tracking
  const resume = useCallback((): void => {
    isPausedRef.current = false;
  }, []);

  return {
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    undo,
    redo,
    recordAction,
    clear,
    undoStack,
    pause,
    resume,
    isPaused: isPausedRef.current,
  };
}

// =============================================================================
// Utility Hook for Batch Operations
// =============================================================================

/**
 * useUndoBatch Hook
 *
 * Pauses undo recording during batch operations.
 * Useful when you want to group multiple actions into a single undo step.
 *
 * @example
 * ```tsx
 * const batch = useUndoBatch();
 *
 * const handleBatchMove = async () => {
 *   batch.start();
 *   await moveCard(card1, newPos1);
 *   await moveCard(card2, newPos2);
 *   await moveCard(card3, newPos3);
 *   batch.end("Move 3 cards");
 * };
 * ```
 */
export function useUndoBatch(
  recordAction: (
    command: CommandType,
    currentState: BoardState,
    description?: string
  ) => void,
  getCurrentState: () => BoardState
): {
  start: () => void;
  end: (description?: string) => void;
  isActive: boolean;
} {
  const initialStateRef = useRef<BoardState | null>(null);
  const [isActive, setIsActive] = useState(false);

  const start = useCallback((): void => {
    initialStateRef.current = getCurrentState();
    setIsActive(true);
  }, [getCurrentState]);

  const end = useCallback(
    (description?: string): void => {
      if (initialStateRef.current) {
        recordAction(
          "batchUpdateCardPositions",
          initialStateRef.current,
          description
        );
        initialStateRef.current = null;
      }
      setIsActive(false);
    },
    [recordAction]
  );

  return {
    start,
    end,
    isActive,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Clear all undo stacks from all boards
 * Useful for cleanup or when resetting app state
 */
export function clearAllUndoStacks(): void {
  clearAllStacksFromStorage();
}

/**
 * Helper to wrap an async action with undo recording
 *
 * @example
 * ```tsx
 * const wrappedCreate = withUndo(
 *   createCard,
 *   "createCard",
 *   recordAction,
 *   state
 * );
 *
 * const result = await wrappedCreate(boardId, input);
 * ```
 */
export function withUndo<T extends unknown[], R>(
  action: (...args: T) => Promise<R>,
  commandType: CommandType,
  recordActionFn: (
    command: CommandType,
    currentState: BoardState,
    description?: string
  ) => void,
  getCurrentState: () => BoardState,
  description?: string
): (...args: T) => Promise<R> {
  return (...args: T): Promise<R> => {
    // Record state before action
    recordActionFn(commandType, getCurrentState(), description);

    // Execute the action
    return action(...args);
  };
}
