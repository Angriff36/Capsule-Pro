/**
 * Bulk Edit Command
 *
 * Updates multiple cards on the command board at once.
 * Can be undone by reverting each card to its old properties.
 */

import { bulkUpdateCards } from "../../actions/bulk-update-cards";
import type { BulkUpdateInput } from "../../actions/bulk-update-cards";
import type { CommandBoardCard } from "../../types";
import type { UndoRedoCommand } from "../../types/undo-redo";

/**
 * Properties that can be bulk updated on cards (excludes cardIds)
 */
export type BulkUpdateFields = Omit<BulkUpdateInput, "cardIds">;

/**
 * Stored card properties for undo/redo
 */
export interface StoredCardProperties {
  title?: string;
  content?: string;
  status?: "active" | "completed" | "archived";
  color?: string;
}

/**
 * Properties of a card before bulk update
 */
export interface CardSnapshot {
  cardId: string;
  oldProperties: StoredCardProperties;
}

/**
 * Command to bulk update multiple cards
 */
export interface BulkEditCommand extends UndoRedoCommand {
  /**
   * IDs of cards to update
   */
  cardIds: string[];

  /**
   * Number of cards being updated
   */
  count: number;

  /**
   * Old properties for each card (for undo)
   */
  snapshots: CardSnapshot[];

  /**
   * New properties to apply to all cards
   */
  newProperties: BulkUpdateFields;
}

/**
 * Creates a new bulk edit command
 *
 * @param cardIds - IDs of cards to update
 * @param snapshots - Array of card snapshots with old properties
 * @param newProperties - Properties to update on all cards
 * @param userId - Optional user ID who performed the action
 */
export function createBulkEditCommand(
  cardIds: string[],
  snapshots: CardSnapshot[],
  newProperties: BulkUpdateFields,
  userId?: string
): BulkEditCommand {
  return {
    cardIds,
    count: cardIds.length,
    snapshots,
    newProperties,
    description: `Bulk update ${cardIds.length} card${cardIds.length !== 1 ? "s" : ""}`,
    timestamp: new Date(),
    userId,

    async execute(): Promise<void> {
      const result = await bulkUpdateCards({
        cardIds: this.cardIds,
        ...this.newProperties,
      });

      if (!result.success) {
        throw new Error(result.error ?? "Failed to bulk update cards");
      }
    },

    async undo(): Promise<void> {
      // Undo by updating each card back to its old properties
      for (const snapshot of this.snapshots) {
        const result = await bulkUpdateCards({
          cardIds: [snapshot.cardId],
          ...snapshot.oldProperties,
        });

        if (!result.success) {
          throw new Error(
            `Failed to undo bulk update for card ${snapshot.cardId}: ${result.error}`
          );
        }
      }
    },
  };
}

/**
 * Helper to extract current properties from cards for snapshots
 *
 * @param cards - Cards to create snapshots from
 * @param propertiesToUpdate - Properties that will be updated (only these need to be saved)
 * @returns Array of card snapshots
 */
export function createCardSnapshots(
  cards: CommandBoardCard[],
  propertiesToUpdate: BulkUpdateFields
): CardSnapshot[] {
  return cards.map((card) => {
    const oldProperties: StoredCardProperties = {};

    if (propertiesToUpdate.title !== undefined) {
      oldProperties.title = card.title;
    }
    if (propertiesToUpdate.content !== undefined) {
      oldProperties.content = card.content ?? "";
    }
    if (propertiesToUpdate.status !== undefined) {
      oldProperties.status = card.status;
    }
    if (propertiesToUpdate.color !== undefined) {
      oldProperties.color = card.color ?? "";
    }

    return {
      cardId: card.id,
      oldProperties,
    };
  });
}
