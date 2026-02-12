/**
 * Command pattern implementations for undo/redo functionality.
 * Each command encapsulates a reversible action on the command board.
 */

import type { UndoRedoCommand } from "../../types/undo-redo";

export * from "./card-move-command";
export * from "./card-create-command";
export * from "./card-delete-command";
export * from "./card-update-command";
export * from "./connection-create-command";
export * from "./connection-delete-command";
export * from "./connection-update-command";
export * from "./group-create-command";
export * from "./group-delete-command";
export * from "./group-update-command";
export * from "./group-collapse-command";
// export * from "./bulk-edit-command"; // TODO: Implement bulk edit command

/**
 * Type guard to check if a value is an UndoRedoCommand
 */
export function isUndoRedoCommand(value: unknown): value is UndoRedoCommand {
  return (
    typeof value === "object" &&
    value !== null &&
    "execute" in value &&
    "undo" in value &&
    "description" in value &&
    "timestamp" in value
  );
}
