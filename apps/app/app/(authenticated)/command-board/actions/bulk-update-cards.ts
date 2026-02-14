"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type { CardStatus } from "../types";

export interface BulkUpdateInput {
  cardIds: string[];
  status?: CardStatus;
  color?: string | null;
  title?: string;
  content?: string | null;
}

export interface BulkUpdateResult {
  success: boolean;
  updatedCount?: number;
  error?: string;
}

/**
 * Bulk update multiple cards with common properties.
 * Only updates properties that are explicitly provided.
 */
export async function bulkUpdateCards(
  input: BulkUpdateInput
): Promise<BulkUpdateResult> {
  try {
    const tenantId = await requireTenantId();

    if (input.cardIds.length === 0) {
      return { success: false, error: "No cards selected" };
    }

    // Build update data with only provided fields
    const updateData: {
      status?: CardStatus;
      color?: string | null;
      title?: string;
      content?: string | null;
    } = {};

    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    if (input.color !== undefined) {
      updateData.color = input.color;
    }
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.content !== undefined) {
      updateData.content = input.content;
    }

    // If no updates to apply, return early
    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "No properties to update" };
    }

    // Update all cards in a single transaction
    const result = await database.commandBoardCard.updateMany({
      where: {
        tenantId,
        id: { in: input.cardIds },
        deletedAt: null,
      },
      data: updateData,
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update cards",
    };
  }
}
