/**
 * Card Update Command
 *
 * Updates card properties on the command board.
 * Can be undone by reverting to the old properties.
 */

import { updateCard } from "../../actions/cards";
import type { UpdateCardInput } from "../../types";
import type { UndoRedoCommand } from "../../types/undo-redo";

/**
 * Stored card properties for undo/redo
 */
export interface StoredCardProperties {
  title?: string;
  content?: string;
  cardType?:
    | "generic"
    | "event"
    | "client"
    | "task"
    | "employee"
    | "inventory"
    | "recipe"
    | "note";
  status?: "active" | "completed" | "archived";
  color?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Command to update a card
 */
export interface CardUpdateCommand extends UndoRedoCommand {
  /**
   * ID of the card to update
   */
  cardId: string;

  /**
   * Title of the card (for description)
   */
  title: string;

  /**
   * Old properties for undo
   */
  oldProperties: StoredCardProperties;

  /**
   * New properties for execute
   */
  newProperties: StoredCardProperties;
}

/**
 * Creates a new card update command
 */
export function createCardUpdateCommand(
  cardId: string,
  title: string,
  oldProperties: StoredCardProperties,
  newProperties: StoredCardProperties,
  userId?: string
): CardUpdateCommand {
  return {
    cardId,
    title,
    oldProperties,
    newProperties,
    description: `Update card "${title}"`,
    timestamp: new Date(),
    userId,

    async execute(): Promise<void> {
      const updateInput: UpdateCardInput = {
        id: this.cardId,
        ...this.newProperties,
      };

      const result = await updateCard(updateInput);

      if (!result.success) {
        throw new Error(result.error ?? "Failed to update card");
      }
    },

    async undo(): Promise<void> {
      const updateInput: UpdateCardInput = {
        id: this.cardId,
        ...this.oldProperties,
      };

      const result = await updateCard(updateInput);

      if (!result.success) {
        throw new Error(result.error ?? "Failed to undo card update");
      }
    },
  };
}
