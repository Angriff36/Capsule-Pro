"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type {
  CardConnection,
  RelationshipType,
} from "../types";

export interface ConnectionResult {
  success: boolean;
  connection?: CardConnection;
  error?: string;
}

export interface CreateConnectionInput {
  fromCardId: string;
  toCardId: string;
  relationshipType: RelationshipType;
  label?: string;
  visible?: boolean;
}

export interface UpdateConnectionInput {
  id: string;
  relationshipType?: RelationshipType;
  label?: string;
  visible?: boolean;
}

export async function createConnection(
  boardId: string,
  input: CreateConnectionInput
): Promise<ConnectionResult> {
  try {
    const tenantId = await requireTenantId();

    // Verify board exists and belongs to tenant
    const board = await database.commandBoard.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: boardId,
        },
      },
    });

    if (!board) {
      return {
        success: false,
        error: "Board not found",
      };
    }

    // Verify both cards exist and belong to the board
    const cards = await database.commandBoardCard.findMany({
      where: {
        tenantId,
        id: { in: [input.fromCardId, input.toCardId] },
        boardId,
        deletedAt: null,
      },
    });

    if (cards.length !== 2) {
      return {
        success: false,
        error: "Both cards must exist on the same board",
      };
    }

    // Check if connection already exists
    const existing = await database.commandBoardConnection.findUnique({
      where: {
        boardId_fromCardId_toCardId_relationshipType: {
          boardId,
          fromCardId: input.fromCardId,
          toCardId: input.toCardId,
          relationshipType: input.relationshipType,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: "Connection already exists",
      };
    }

    const connection = await database.commandBoardConnection.create({
      data: {
        tenantId,
        boardId,
        id: crypto.randomUUID(),
        fromCardId: input.fromCardId,
        toCardId: input.toCardId,
        relationshipType: input.relationshipType,
        label: input.label ?? null,
        visible: input.visible ?? true,
      },
    });

    return {
      success: true,
      connection: {
        id: connection.id,
        fromCardId: connection.fromCardId,
        toCardId: connection.toCardId,
        relationshipType: connection.relationshipType as RelationshipType,
        label: connection.label ?? undefined,
        visible: connection.visible,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create connection",
    };
  }
}

export async function updateConnection(
  input: UpdateConnectionInput
): Promise<ConnectionResult> {
  try {
    const tenantId = await requireTenantId();

    const updateData: {
      relationshipType?: string;
      label?: string | null;
      visible?: boolean;
    } = {};

    if (input.relationshipType !== undefined) {
      updateData.relationshipType = input.relationshipType;
    }
    if (input.label !== undefined) {
      updateData.label = input.label;
    }
    if (input.visible !== undefined) {
      updateData.visible = input.visible;
    }

    const connection = await database.commandBoardConnection.update({
      where: {
        tenantId_id: {
          tenantId,
          id: input.id,
        },
      },
      data: updateData,
    });

    return {
      success: true,
      connection: {
        id: connection.id,
        fromCardId: connection.fromCardId,
        toCardId: connection.toCardId,
        relationshipType: connection.relationshipType as RelationshipType,
        label: connection.label ?? undefined,
        visible: connection.visible,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update connection",
    };
  }
}

export async function deleteConnection(
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await requireTenantId();

    // Soft delete the connection
    await database.commandBoardConnection.update({
      where: {
        tenantId_id: {
          tenantId,
          id: connectionId,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete connection",
    };
  }
}

export async function getConnectionsForBoard(
  boardId: string
): Promise<{
  success: boolean;
  connections?: CardConnection[];
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();

    const connections = await database.commandBoardConnection.findMany({
      where: {
        tenantId,
        boardId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      success: true,
      connections: connections.map((connection) => ({
        id: connection.id,
        fromCardId: connection.fromCardId,
        toCardId: connection.toCardId,
        relationshipType: connection.relationshipType as RelationshipType,
        label: connection.label ?? undefined,
        visible: connection.visible,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get connections",
    };
  }
}

export async function getConnectionsForCard(
  cardId: string
): Promise<{
  success: boolean;
  connections?: CardConnection[];
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();

    const connections = await database.commandBoardConnection.findMany({
      where: {
        tenantId,
        OR: [
          { fromCardId: cardId },
          { toCardId: cardId },
        ],
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      success: true,
      connections: connections.map((connection) => ({
        id: connection.id,
        fromCardId: connection.fromCardId,
        toCardId: connection.toCardId,
        relationshipType: connection.relationshipType as RelationshipType,
        label: connection.label ?? undefined,
        visible: connection.visible,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get connections",
    };
  }
}
