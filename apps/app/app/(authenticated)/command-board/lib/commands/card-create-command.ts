/**
 * Card Create Command
 *
 * Creates a new card on the command board.
 * Can be undone by deleting the card.
 */

import { createCard, deleteCard } from "../../actions/cards";
import type { CreateCardInput } from "../../types";
import type { UndoRedoCommand } from "../../types/undo-redo";

/**
 * Command to create a new card
 */
export interface CardCreateCommand extends UndoRedoCommand {
  /**
   * Board ID where the card will be created
   */
  boardId: string;

  /**
   * Input data for creating the card
   */
  input: CreateCardInput;

  /**
   * ID of the created card (populated after execute)
   */
  cardId?: string;
}

/**
 * Creates a new card create command
 */
export function createCardCreateCommand(
  boardId: string,
  input: CreateCardInput,
  userId?: string
): CardCreateCommand {
  return {
    boardId,
    input,
    cardId: undefined,
    description: `Create card "${input.title}"`,
    timestamp: new Date(),
    userId,

    async execute(): Promise<void> {
      const result = await createCard(boardId, this.input);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to create card");
      }
      // Store the card ID for undo
      this.cardId = result.card?.id;
    },

    async undo(): Promise<void> {
      if (!this.cardId) {
        throw new Error("Card ID not available for undo");
      }
      const result = await deleteCard(this.cardId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to delete card");
      }
    },
  };
}
