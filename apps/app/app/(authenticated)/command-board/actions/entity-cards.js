"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.createEntityCard = createEntityCard;
const database_1 = require("@repo/database");
const tenant_1 = require("../../../lib/tenant");
async function getClientMetadata(tenantId, entityId) {
  const client = await database_1.database.client.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
  });
  if (!client) {
    return null;
  }
  const title =
    client.company_name ||
    `${client.first_name} ${client.last_name}`.trim() ||
    "Client";
  const metadata = {
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
async function getEventMetadata(tenantId, entityId) {
  const event = await database_1.database.event.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
  });
  if (!event) {
    return null;
  }
  const title = event.title;
  const metadata = {
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
async function getTaskMetadata(tenantId, entityId) {
  const task = await database_1.database.kitchenTask.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
  });
  if (!task) {
    return null;
  }
  const title = task.title;
  const metadata = {
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    summary: task.summary,
  };
  return { title, metadata };
}
async function getEmployeeMetadata(tenantId, entityId) {
  const user = await database_1.database.user.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
  });
  if (!user) {
    return null;
  }
  const title = `${user.firstName} ${user.lastName}`.trim() || "Employee";
  const metadata = {
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
  return { title, metadata };
}
async function getInventoryMetadata(tenantId, entityId) {
  const item = await database_1.database.inventoryItem.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
  });
  if (!item) {
    return null;
  }
  const title = item.name;
  const metadata = {
    itemNumber: item.item_number,
    category: item.category,
    unitCost: item.unitCost,
    quantityOnHand: item.quantityOnHand,
    reorderLevel: item.reorder_level,
  };
  return { title, metadata };
}
async function createEntityCard(boardId, input) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    let cardType = "generic";
    let title = input.title;
    let metadata = {
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
    const card = await database_1.database.commandBoardCard.create({
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
        // @ts-expect-error - Metadata type incompatibility
        metadata,
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
        status: card.status,
        position: {
          x: card.positionX,
          y: card.positionY,
          width: card.width,
          height: card.height,
          zIndex: card.zIndex,
        },
        color: card.color,
        metadata: card.metadata || {},
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
