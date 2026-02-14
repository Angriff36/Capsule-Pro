/**
 * Card Delete Command
 *
 * Soft deletes a card from the command board.
 * Can be undone by restoring the card.
 */

import { database } from "@repo/database";
import { requireTenantId } from "../../../../lib/tenant";
import { deleteCard } from "../../actions/cards";
import type { CommandBoardCard } from "../../types";
import type { UndoRedoCommand } from "../../types-specific/undo-redo";

/**
 * Command to delete a card
 */
export interface CardDeleteCommand extends UndoRedoCommand {
  /**
   * ID of the card to delete
   */
  cardId: string;

  /**
   * Title of the card (for description)
   */
  title: string;

  /**
   * Stored card data for undo
   */
  cardData?: CommandBoardCard;
}

/**
 * Creates a new card delete command
 */
export function createCardDeleteCommand(
  cardId: string,
  title: string,
  userId?: string
): CardDeleteCommand {
  return {
    cardId,
    title,
    cardData: undefined,
    description: `Delete card "${title}"`,
    timestamp: new Date(),
    userId,

    async execute(): Promise<void> {
      const tenantId = await requireTenantId();

      // First fetch the card data for undo before deleting
      const card = await database.commandBoardCard.findUnique({
        where: {
          tenantId_id: {
            tenantId,
            id: cardId,
          },
        },
      });

      if (!card) {
        throw new Error("Card not found");
      }

      // Store card data for undo
      this.cardData = {
        id: card.id,
        tenantId: card.tenantId,
        boardId: card.boardId,
        title: card.title,
        content: card.content,
        cardType: card.cardType as
          | "generic"
          | "event"
          | "client"
          | "task"
          | "employee"
          | "inventory"
          | "recipe"
          | "note",
        status: card.status as "active" | "completed" | "archived",
        position: {
          x: card.positionX,
          y: card.positionY,
          width: card.width,
          height: card.height,
          zIndex: card.zIndex,
        },
        color: card.color,
        metadata: (card.metadata as Record<string, unknown>) ?? {},
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        deletedAt: card.deletedAt,
      };

      // Now perform the soft delete
      const result = await deleteCard(cardId);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to delete card");
      }
    },

    async undo(): Promise<void> {
      const tenantId = await requireTenantId();

      if (!this.cardData) {
        throw new Error("Card data not available for undo");
      }

      // Restore the card by setting deletedAt to null
      await database.commandBoardCard.update({
        where: {
          tenantId_id: {
            tenantId,
            id: this.cardId,
          },
        },
        data: {
          deletedAt: null,
        },
      });
    },
  };
}
