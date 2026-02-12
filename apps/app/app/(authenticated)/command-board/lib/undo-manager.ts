/**
 * Undo/Redo Manager for Command Board
 *
 * Provides undo/redo functionality for board operations using a command pattern
 * with full state snapshots. Uses sessionStorage for persistence.
 */

import type {
  BoardState,
  CardConnection,
  CommandBoardCard,
  CommandBoardGroup,
} from "../types";

// =============================================================================
// Types
// =============================================================================

/**
 * Command types that can be undone/redone
 */
export type CommandType =
  | "createCard"
  | "updateCard"
  | "deleteCard"
  | "batchUpdateCardPositions"
  | "bringCardToFront"
  | "bulkEditCards"
  | "createConnection"
  | "updateConnection"
  | "deleteConnection"
  | "createGroup"
  | "updateGroup"
  | "deleteGroup"
  | "addCardsToGroup"
  | "removeCardsFromGroup"
  | "toggleGroupCollapsed";

/**
 * Single undo/redo item containing command and previous state
 */
export interface UndoItem {
  /** Type of command that was executed */
  command: CommandType;
  /** Snapshot of state before the command was executed */
  previousState: BoardStateSnapshot;
  /** Timestamp when the command was executed */
  timestamp: number;
  /** Optional description for debugging */
  description?: string;
}

/**
 * Snapshot of board state for undo/redo
 * Contains all relevant state needed to restore the board
 */
export interface BoardStateSnapshot {
  cards: CommandBoardCard[];
  connections: CardConnection[];
  groups: CommandBoardGroup[];
  selectedCardIds: string[];
  selectedConnectionId: string | null;
  timestamp: number;
}

/**
 * The undo stack structure
 */
export interface UndoStack {
  /** Stack of completed actions that can be undone */
  past: UndoItem[];
  /** Stack of undone actions that can be redone */
  future: UndoItem[];
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum number of undo actions to keep in stack
 */
const MAX_UNDO_ACTIONS = 50;

/**
 * SessionStorage key for persisting undo stack
 */
const STORAGE_KEY = "command-board-undo-stack";

/**
 * Board ID suffix pattern for multi-board storage
 */
const STORAGE_KEY_PATTERN = `${STORAGE_KEY}::`;

// =============================================================================
// State Snapshot Functions
// =============================================================================

/**
 * Create a snapshot of the current board state
 */
export function createSnapshot(state: BoardState): BoardStateSnapshot {
  return {
    cards: structuredClone(state.cards),
    connections: structuredClone(state.connections),
    groups: structuredClone(
      (state as { groups?: CommandBoardGroup[] }).groups ?? []
    ),
    selectedCardIds: structuredClone(state.selectedCardIds),
    selectedConnectionId: state.selectedConnectionId,
    timestamp: Date.now(),
  };
}

/**
 * Restore board state from a snapshot
 * Returns a partial state update that can be merged with existing state
 */
export function restoreFromSnapshot(
  snapshot: BoardStateSnapshot
): Partial<BoardState> {
  return {
    cards: structuredClone(snapshot.cards),
    connections: structuredClone(snapshot.connections),
    selectedCardIds: structuredClone(snapshot.selectedCardIds),
    selectedConnectionId: snapshot.selectedConnectionId,
  };
}

// =============================================================================
// Undo Stack Management
// =============================================================================

/**
 * Create a new empty undo stack
 */
export function createEmptyStack(_boardId: string): UndoStack {
  return {
    past: [],
    future: [],
  };
}

/**
 * Push a new undo item onto the stack
 * Clears the future stack (new action invalidates redo history)
 */
export function pushUndoItem(
  stack: UndoStack,
  command: CommandType,
  previousState: BoardStateSnapshot,
  description?: string
): UndoStack {
  const newItem: UndoItem = {
    command,
    previousState,
    timestamp: Date.now(),
    description,
  };

  // Add to past and enforce max limit
  const newPast = [...stack.past, newItem];
  if (newPast.length > MAX_UNDO_ACTIONS) {
    newPast.shift(); // Remove oldest item
  }

  // Clear future when new action is performed
  return {
    past: newPast,
    future: [],
  };
}

/**
 * Execute undo - pop from past, push to future, return previous state
 */
export function executeUndo(stack: UndoStack): {
  newStack: UndoStack;
  restoredState: BoardStateSnapshot | null;
} {
  if (stack.past.length === 0) {
    return { newStack: stack, restoredState: null };
  }

  const itemToUndo = stack.past.at(-1);
  if (!itemToUndo) {
    return { newStack: stack, restoredState: null };
  }

  const newPast = stack.past.slice(0, -1);
  const newFuture = [...stack.future, itemToUndo];

  return {
    newStack: {
      past: newPast,
      future: newFuture,
    },
    restoredState: itemToUndo.previousState,
  };
}

/**
 * Execute redo - pop from future, push to past
 * Note: redo returns the state BEFORE the undone action, which needs to be reapplied
 */
export function executeRedo(stack: UndoStack): {
  newStack: UndoStack;
  redoItem: UndoItem | null;
} {
  if (stack.future.length === 0) {
    return { newStack: stack, redoItem: null };
  }

  const itemToRedo = stack.future.at(-1);
  if (!itemToRedo) {
    return { newStack: stack, redoItem: null };
  }

  const newFuture = stack.future.slice(0, -1);
  const newPast = [...stack.past, itemToRedo];

  return {
    newStack: {
      past: newPast,
      future: newFuture,
    },
    redoItem: itemToRedo,
  };
}

/**
 * Clear the undo stack (useful when loading a new board)
 */
export function clearStack(_stack: UndoStack): UndoStack {
  return {
    past: [],
    future: [],
  };
}

// =============================================================================
// SessionStorage Persistence
// =============================================================================

/**
 * Generate storage key for a specific board
 */
function getStorageKey(boardId: string): string {
  return `${STORAGE_KEY_PATTERN}${boardId}`;
}

/**
 * Save undo stack to sessionStorage
 */
export function saveStackToStorage(boardId: string, stack: UndoStack): void {
  try {
    const key = getStorageKey(boardId);
    // Convert to plain JSON for storage (circular references not expected)
    const serialized = JSON.stringify(stack);
    sessionStorage.setItem(key, serialized);
  } catch (error) {
    // Silent fail - sessionStorage may be full or disabled
    console.warn("Failed to save undo stack to sessionStorage:", error);
  }
}

/**
 * Load undo stack from sessionStorage
 */
export function loadStackFromStorage(boardId: string): UndoStack | null {
  try {
    const key = getStorageKey(boardId);
    const serialized = sessionStorage.getItem(key);
    if (!serialized) {
      return null;
    }

    const parsed = JSON.parse(serialized) as UndoStack;
    return parsed;
  } catch (error) {
    console.warn("Failed to load undo stack from sessionStorage:", error);
    return null;
  }
}

/**
 * Clear undo stack from sessionStorage
 */
export function clearStackFromStorage(boardId: string): void {
  try {
    const key = getStorageKey(boardId);
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn("Failed to clear undo stack from sessionStorage:", error);
  }
}

/**
 * Clear all undo stacks from sessionStorage (for cleanup)
 */
export function clearAllStacksFromStorage(): void {
  try {
    const keys = Object.keys(sessionStorage);
    for (const key of keys) {
      if (key.startsWith(STORAGE_KEY_PATTERN)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn("Failed to clear all undo stacks from sessionStorage:", error);
  }
}

// =============================================================================
// Manager Class
// =============================================================================

/**
 * UndoManager manages the undo/redo state for a single board
 *
 * This class provides a clean API for:
 * - Tracking undoable actions
 * - Persisting state across page reloads
 * - Executing undo/redo operations
 */
export class UndoManager {
  private readonly boardId: string;
  private stack: UndoStack;
  private readonly listeners: Set<() => void> = new Set();

  constructor(boardId: string, initialState?: UndoStack) {
    this.boardId = boardId;
    this.stack = initialState ?? createEmptyStack(boardId);
  }

  /**
   * Get the current undo stack
   */
  getStack(): UndoStack {
    return this.stack;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.stack.past.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.stack.future.length > 0;
  }

  /**
   * Record an action for undo
   * Call this BEFORE executing the action
   */
  recordAction(
    command: CommandType,
    currentState: BoardState,
    description?: string
  ): void {
    const snapshot = createSnapshot(currentState);
    this.stack = pushUndoItem(this.stack, command, snapshot, description);
    this.save();
    this.notifyListeners();
  }

  /**
   * Execute undo - returns the state snapshot to restore
   */
  undo(): BoardStateSnapshot | null {
    const result = executeUndo(this.stack);
    this.stack = result.newStack;
    this.save();
    this.notifyListeners();
    return result.restoredState;
  }

  /**
   * Execute redo - returns the redo item (caller must re-execute)
   */
  redo(): UndoItem | null {
    const result = executeRedo(this.stack);
    this.stack = result.newStack;
    this.save();
    this.notifyListeners();
    return result.redoItem;
  }

  /**
   * Clear the undo stack
   */
  clear(): void {
    this.stack = clearStack(this.stack);
    clearStackFromStorage(this.boardId);
    this.notifyListeners();
  }

  /**
   * Save stack to sessionStorage
   */
  private save(): void {
    saveStackToStorage(this.boardId, this.stack);
  }

  /**
   * Subscribe to stack changes
   * Returns unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * Get count of undoable actions
   */
  getPastCount(): number {
    return this.stack.past.length;
  }

  /**
   * Get count of redoable actions
   */
  getFutureCount(): number {
    return this.stack.future.length;
  }

  /**
   * Get the most recent undo item without popping it
   */
  peekLastUndo(): UndoItem | null {
    if (this.stack.past.length === 0) {
      return null;
    }
    const item = this.stack.past.at(-1);
    return item ?? null;
  }

  /**
   * Get the most recent redo item without popping it
   */
  peekNextRedo(): UndoItem | null {
    if (this.stack.future.length === 0) {
      return null;
    }
    const item = this.stack.future.at(-1);
    return item ?? null;
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an UndoManager for a board, loading from storage if available
 */
export function createUndoManager(
  boardId: string,
  initialState?: BoardState
): UndoManager {
  const existingStack = loadStackFromStorage(boardId);
  const manager = new UndoManager(boardId, existingStack ?? undefined);

  // If initial state provided but no stack exists, record initial state
  if (initialState && !existingStack) {
    // No-op - we start with empty stack
  }

  return manager;
}
