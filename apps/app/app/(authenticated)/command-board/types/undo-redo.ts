/**
 * Undo/Redo types for Command Board.
 * Provides type-safe undo/redo command pattern.
 */

import type { CommandBoardCard } from "../types";

/**
 * Base undo/redo command interface
 */
export interface UndoRedoCommand {
  /**
   * Execute the command
   */
  execute(): Promise<void>;

  /**
   * Undo the command
   */
  undo(): Promise<void>;

  /**
   * Human-readable description of what the command does
   */
  description: string;

  /**
   * Timestamp when command was created
   */
  timestamp: Date;

  /**
   * Optional user ID who performed the action
   */
  userId?: string;
}

/**
 * Result of an action that includes undo/redo support
 */
export interface UndoableResult<T = void> {
  result: T;
  undoCommand: UndoRedoCommand;
}

/**
 * Configuration for undo/redo behavior
 */
export interface UndoRedoConfig {
  /**
   * Maximum number of undo actions to store per board
   */
  maxStackSize: number;

  /**
   * Storage key for persisting undo/redo stack
   */
  storageKey: string;
}

/**
 * Default configuration
 */
export const DEFAULT_UNDO_REDO_CONFIG: UndoRedoConfig = {
  maxStackSize: 50,
  storageKey: "command-board-undo-stack",
} as const;
