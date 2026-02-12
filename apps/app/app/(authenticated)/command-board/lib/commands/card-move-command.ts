/**
 * Card Move Command
 *
 * Moves a card to a new position on the command board.
 * Can be undone by moving the card back to its original position.
 */

import { updateCard } from "../../actions/cards";
import type { CardPosition } from "../../types";
import type { UndoRedoCommand } from "../../types/undo-redo";

/**
 * Command to move a card
 */
export interface CardMoveCommand extends UndoRedoCommand {
  /**
   * ID of the card to move
   */
  cardId: string;

  /**
   * Title of the card (for description)
   */
  title: string;

  /**
   * Old position for undo
   */
  oldPosition: CardPosition;

  /**
   * New position for execute
   */
  newPosition: CardPosition;
}

/**
 * Creates a new card move command
 */
export function createCardMoveCommand(
  cardId: string,
  title: string,
  oldPosition: CardPosition,
  newPosition: CardPosition,
  userId?: string
): CardMoveCommand {
  return {
    cardId,
    title,
    oldPosition,
    newPosition,
    description: `Move card "${title}"`,
    timestamp: new Date(),
    userId,

    async execute(): Promise<void> {
      const result = await updateCard({
        id: this.cardId,
        position: this.newPosition,
      });

      if (!result.success) {
        throw new Error(result.error ?? "Failed to move card");
      }
    },

    async undo(): Promise<void> {
      const result = await updateCard({
        id: this.cardId,
        position: this.oldPosition,
      });

      if (!result.success) {
        throw new Error(result.error ?? "Failed to undo card move");
      }
    },
  };
}
