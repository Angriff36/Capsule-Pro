"use server";

import { database, type Prisma } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type { CardMetadata, CardType, CreateCardInput } from "../types";
import type { CardResult } from "./cards";

export type CreateEntityCardInput = CreateCardInput & {
  entityType: "client" | "event" | "task" | "employee" | "inventory";
  entityId: string;
};

async function getClientMetadata(
  tenantId: string,
  entityId: string
): Promise<{ title: string; metadata: CardMetadata } | null> {
  const client = await database.client.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
  });

  if (!client) {
    return null;
  }

  const title =
    client.company_name ||
    `${client.first_name} ${client.last_name}`.trim() ||
    "Client";
  const metadata: CardMetadata = {
    clientType: client.clientType,
    companyName: client.company_name,
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email,
    phone: client.phone,
    city: client.city,
    stateProvince: client.stateProvince,
  };

  return { title, metadata };
}

async function getEventMetadata(
  tenantId: string,
  entityId: string
): Promise<{ title: string; metadata: CardMetadata } | null> {
  const event = await database.event.findFirst({
    where: { tenantId, id: entityId },
  });

  if (!event) {
    return null;
  }

  const title = event.title;
  const metadata: CardMetadata = {
    status: event.status,
    eventType: event.eventType,
    eventDate: event.eventDate,
    guestCount: event.guestCount,
    budget: event.budget ? Number(event.budget) : undefined,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
  };

  return { title, metadata };
}

async function getTaskMetadata(
  tenantId: string,
  entityId: string
): Promise<{ title: string; metadata: CardMetadata } | null> {
  const task = await database.kitchenTask.findFirst({
    where: { tenantId, id: entityId },
  });

  if (!task) {
    return null;
  }

  const title = task.title;
  const metadata: CardMetadata = {
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    summary: task.summary,
  };

  return { title, metadata };
}

async function getEmployeeMetadata(
  tenantId: string,
  entityId: string
): Promise<{ title: string; metadata: CardMetadata } | null> {
  const user = await database.user.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
  });

  if (!user) {
    return null;
  }

  const title = `${user.firstName} ${user.lastName}`.trim() || "Employee";
  const metadata: CardMetadata = {
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };

  return { title, metadata };
}

async function getInventoryMetadata(
  tenantId: string,
  entityId: string
): Promise<{ title: string; metadata: CardMetadata } | null> {
  const item = await database.inventoryItem.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
  });

  if (!item) {
    return null;
  }

  const title = item.name;
  const metadata: CardMetadata = {
    itemNumber: item.item_number,
    category: item.category,
    unitCost: item.unitCost,
    quantityOnHand: item.quantityOnHand,
    reorderLevel: item.reorder_level,
  };

  return { title, metadata };
}

export async function createEntityCard(
  boardId: string,
  input: CreateEntityCardInput
): Promise<CardResult> {
  try {
    const tenantId = await requireTenantId();

    let cardType: CardType = "generic";
    let title = input.title;
    let metadata: CardMetadata = {
      entityId: input.entityId,
    };

    switch (input.entityType) {
      case "client": {
        const result = await getClientMetadata(tenantId, input.entityId);
        if (!result) {
          return { success: false, error: "Client not found" };
        }
        title = result.title;
        cardType = "client";
        metadata = { ...metadata, ...result.metadata };
        break;
      }
      case "event": {
        const result = await getEventMetadata(tenantId, input.entityId);
        if (!result) {
          return { success: false, error: "Event not found" };
        }
        title = result.title;
        cardType = "event";
        metadata = { ...metadata, ...result.metadata };
        break;
      }
      case "task": {
        const result = await getTaskMetadata(tenantId, input.entityId);
        if (!result) {
          return { success: false, error: "Task not found" };
        }
        title = result.title;
        cardType = "task";
        metadata = { ...metadata, ...result.metadata };
        break;
      }
      case "employee": {
        const result = await getEmployeeMetadata(tenantId, input.entityId);
        if (!result) {
          return { success: false, error: "Employee not found" };
        }
        title = result.title;
        cardType = "employee";
        metadata = { ...metadata, ...result.metadata };
        break;
      }
      case "inventory": {
        const result = await getInventoryMetadata(tenantId, input.entityId);
        if (!result) {
          return { success: false, error: "Inventory item not found" };
        }
        title = result.title;
        cardType = "inventory";
        metadata = { ...metadata, ...result.metadata };
        break;
      }
      default: {
        return { success: false, error: "Invalid entity type" };
      }
    }

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
        // @ts-expect-error - Metadata type incompatibility with Prisma JsonValue
        metadata: metadata as Prisma.JsonValue,
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
