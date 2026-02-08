"use server";

import { database, type Prisma } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type { CardMetadata, CardType, CreateCardInput, EntityType } from "../types";
import type { CardResult } from "./cards";

export type CreateEntityCardInput = CreateCardInput & {
  entityType: "client" | "event" | "task" | "employee" | "inventory";
  entityId: string;
};

/**
 * Validates that an entity exists and returns its basic display info.
 * The card will store entityId/entityType for live data fetching instead of snapshots.
 */
async function getClientMetadata(
  tenantId: string,
  entityId: string
): Promise<{ title: string; cardType: CardType } | null> {
  const client = await database.client.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
    select: {
      clientType: true,
      company_name: true,
      first_name: true,
      last_name: true,
    },
  });

  if (!client) {
    return null;
  }

  const title =
    client.company_name ||
    `${client.first_name} ${client.last_name}`.trim() ||
    "Client";

  return { title, cardType: "client" };
}

async function getEventMetadata(
  tenantId: string,
  entityId: string
): Promise<{ title: string; cardType: CardType } | null> {
  const event = await database.event.findFirst({
    where: { tenantId, id: entityId },
    select: {
      title: true,
      status: true,
    },
  });

  if (!event) {
    return null;
  }

  return { title: event.title, cardType: "event" };
}

async function getTaskMetadata(
  tenantId: string,
  entityId: string
): Promise<{ title: string; cardType: CardType } | null> {
  const task = await database.kitchenTask.findFirst({
    where: { tenantId, id: entityId },
    select: {
      title: true,
      status: true,
    },
  });

  if (!task) {
    return null;
  }

  return { title: task.title, cardType: "task" };
}

async function getEmployeeMetadata(
  tenantId: string,
  entityId: string
): Promise<{ title: string; cardType: CardType } | null> {
  const user = await database.user.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
    select: {
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  if (!user) {
    return null;
  }

  const title = `${user.firstName} ${user.lastName}`.trim() || "Employee";
  return { title, cardType: "employee" };
}

async function getInventoryMetadata(
  tenantId: string,
  entityId: string
): Promise<{ title: string; cardType: CardType } | null> {
  const item = await database.inventoryItem.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
    select: {
      name: true,
      category: true,
    },
  });

  if (!item) {
    return null;
  }

  return { title: item.name, cardType: "inventory" };
}

export async function createEntityCard(
  boardId: string,
  input: CreateEntityCardInput
): Promise<CardResult> {
  try {
    const tenantId = await requireTenantId();

    let cardType: CardType = "generic";
    let title = input.title;

    // Validate entity exists and get initial title/cardType
    switch (input.entityType) {
      case "client": {
        const result = await getClientMetadata(tenantId, input.entityId);
        if (!result) {
          return { success: false, error: "Client not found" };
        }
        title = result.title;
        cardType = result.cardType;
        break;
      }
      case "event": {
        const result = await getEventMetadata(tenantId, input.entityId);
        if (!result) {
          return { success: false, error: "Event not found" };
        }
        title = result.title;
        cardType = result.cardType;
        break;
      }
      case "task": {
        const result = await getTaskMetadata(tenantId, input.entityId);
        if (!result) {
          return { success: false, error: "Task not found" };
        }
        title = result.title;
        cardType = result.cardType;
        break;
      }
      case "employee": {
        const result = await getEmployeeMetadata(tenantId, input.entityId);
        if (!result) {
          return { success: false, error: "Employee not found" };
        }
        title = result.title;
        cardType = result.cardType;
        break;
      }
      case "inventory": {
        const result = await getInventoryMetadata(tenantId, input.entityId);
        if (!result) {
          return { success: false, error: "Inventory item not found" };
        }
        title = result.title;
        cardType = result.cardType;
        break;
      }
      default: {
        return { success: false, error: "Invalid entity type" };
      }
    }

    // Create card with entity reference fields for live data fetching
    const card = await database.commandBoardCard.create({
      data: {
        tenantId,
        boardId,
        id: crypto.randomUUID(),
        title,
        content: input.content ?? null,
        cardType,
        status: "active",
        positionX: input.position?.x ?? 100,
        positionY: input.position?.y ?? 100,
        width: input.position?.width ?? 280,
        height: input.position?.height ?? 180,
        zIndex: input.position?.zIndex ?? 1,
        color: input.color ?? null,
        entityId: input.entityId,
        entityType: input.entityType,
        // Minimal metadata - card components will fetch live data
        metadata: {},
      },
    });

    return {
      success: true,
      card: {
        id: card.id,
        tenantId: card.tenantId,
        boardId: card.boardId,
        title: card.title,
        content: card.content,
        cardType,
        status: card.status as "active" | "completed" | "archived",
        position: {
          x: card.positionX,
          y: card.positionY,
          width: card.width,
          height: card.height,
          zIndex: card.zIndex,
        },
        color: card.color,
        metadata: (card.metadata as CardMetadata) || {},
        entityId: card.entityId ?? undefined,
        entityType: (card.entityType ?? undefined) as EntityType | undefined,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        deletedAt: card.deletedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create entity card",
    };
  }
}
