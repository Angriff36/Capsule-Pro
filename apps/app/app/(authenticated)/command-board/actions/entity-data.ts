"use server";

import { database } from "@repo/database";
import { cache } from "react";
import { requireTenantId } from "../../../lib/tenant";
import type { EntityType } from "../types";

/**
 * Live data for a client entity
 */
export interface ClientEntityData {
  entityType: "client";
  id: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  stateProvince: string | null;
  clientType: string;
}

/**
 * Live data for an event entity
 */
export interface EventEntityData {
  entityType: "event";
  id: string;
  title: string;
  status: string;
  eventType: string;
  eventDate: Date;
  guestCount: number;
  budget: number | null;
  venueName: string | null;
  venueAddress: string | null;
  eventId: string;
}

/**
 * Live data for a task entity
 */
export interface TaskEntityData {
  entityType: "task";
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: Date | null;
  summary: string;
}

/**
 * Live data for an employee entity
 */
export interface EmployeeEntityData {
  entityType: "employee";
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

/**
 * Live data for an inventory entity
 */
export interface InventoryEntityData {
  entityType: "inventory";
  id: string;
  name: string;
  itemNumber: string;
  category: string;
  unitCost: number | null;
  quantityOnHand: number;
  reorderLevel: number;
}

/**
 * Union type for all entity data types
 */
export type EntityData =
  | ClientEntityData
  | EventEntityData
  | TaskEntityData
  | EmployeeEntityData
  | InventoryEntityData;

/**
 * Map of entity IDs to their live data
 */
export type EntityDataMap = Map<string, EntityData>;

/**
 * Fetches live data for a single entity by type and ID
 */
async function fetchClientData(
  tenantId: string,
  entityId: string
): Promise<ClientEntityData | null> {
  const client = await database.client.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
    select: {
      id: true,
      company_name: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      city: true,
      stateProvince: true,
      clientType: true,
    },
  });

  if (!client) {
    return null;
  }

  return {
    entityType: "client",
    id: client.id,
    companyName: client.company_name,
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email,
    phone: client.phone,
    city: client.city,
    stateProvince: client.stateProvince,
    clientType: client.clientType,
  };
}

async function fetchEventData(
  tenantId: string,
  entityId: string
): Promise<EventEntityData | null> {
  const event = await database.event.findFirst({
    where: { tenantId, id: entityId },
    select: {
      id: true,
      title: true,
      status: true,
      eventType: true,
      eventDate: true,
      guestCount: true,
      budget: true,
      venueName: true,
      venueAddress: true,
      eventNumber: true,
    },
  });

  if (!event) {
    return null;
  }

  return {
    entityType: "event",
    id: event.id,
    title: event.title,
    status: event.status,
    eventType: event.eventType,
    eventDate: event.eventDate,
    guestCount: event.guestCount,
    budget: event.budget ? Number(event.budget) : null,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    eventId: event.eventNumber ?? event.id,
  };
}

async function fetchTaskData(
  tenantId: string,
  entityId: string
): Promise<TaskEntityData | null> {
  const task = await database.kitchenTask.findFirst({
    where: { tenantId, id: entityId },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      summary: true,
    },
  });

  if (!task) {
    return null;
  }

  return {
    entityType: "task",
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    summary: task.summary,
  };
}

async function fetchEmployeeData(
  tenantId: string,
  entityId: string
): Promise<EmployeeEntityData | null> {
  const user = await database.user.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    entityType: "employee",
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

async function fetchInventoryData(
  tenantId: string,
  entityId: string
): Promise<InventoryEntityData | null> {
  const item = await database.inventoryItem.findUnique({
    where: { tenantId_id: { tenantId, id: entityId } },
    select: {
      id: true,
      name: true,
      item_number: true,
      category: true,
      unitCost: true,
      quantityOnHand: true,
      reorder_level: true,
    },
  });

  if (!item) {
    return null;
  }

  return {
    entityType: "inventory",
    id: item.id,
    name: item.name,
    itemNumber: item.item_number,
    category: item.category,
    unitCost: item.unitCost ? Number(item.unitCost) : null,
    quantityOnHand: Number(item.quantityOnHand),
    reorderLevel: Number(item.reorder_level),
  };
}

/**
 * Fetches live data for a single entity.
 * Cached with React.cache to avoid redundant fetches during render.
 */
export const getEntityData = cache(
  async (
    entityType: EntityType,
    entityId: string
  ): Promise<EntityData | null> => {
    const tenantId = await requireTenantId();

    switch (entityType) {
      case "client":
        return fetchClientData(tenantId, entityId);
      case "event":
        return fetchEventData(tenantId, entityId);
      case "task":
        return fetchTaskData(tenantId, entityId);
      case "employee":
        return fetchEmployeeData(tenantId, entityId);
      case "inventory":
        return fetchInventoryData(tenantId, entityId);
      default:
        return null;
    }
  }
);

/**
 * Fetches live data for multiple entities at once.
 * Returns a Map of entity IDs to their data.
 * More efficient than fetching individually.
 */
export async function getBatchEntityData(
  requests: Array<{ entityType: EntityType; entityId: string }>
): Promise<EntityDataMap> {
  const tenantId = await requireTenantId();
  const result = new Map<string, EntityData>();

  // Group by entity type for batch queries
  const byType = new Map<EntityType, string[]>();
  for (const req of requests) {
    const ids = byType.get(req.entityType) ?? [];
    ids.push(req.entityId);
    byType.set(req.entityType, ids);
  }

  // Fetch each type's entities in batch
  for (const [entityType, ids] of byType.entries()) {
    switch (entityType) {
      case "client": {
        const clients = await database.client.findMany({
          where: {
            tenantId,
            id: { in: ids },
          },
          select: {
            id: true,
            company_name: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            city: true,
            stateProvince: true,
            clientType: true,
          },
        });
        for (const client of clients) {
          result.set(client.id, {
            entityType: "client",
            id: client.id,
            companyName: client.company_name,
            firstName: client.first_name,
            lastName: client.last_name,
            email: client.email,
            phone: client.phone,
            city: client.city,
            stateProvince: client.stateProvince,
            clientType: client.clientType,
          });
        }
        break;
      }
      case "event": {
        const events = await database.event.findMany({
          where: {
            tenantId,
            id: { in: ids },
          },
          select: {
            id: true,
            title: true,
            status: true,
            eventType: true,
            eventDate: true,
            guestCount: true,
            budget: true,
            venueName: true,
            venueAddress: true,
            eventNumber: true,
          },
        });
        for (const event of events) {
          result.set(event.id, {
            entityType: "event",
            id: event.id,
            title: event.title,
            status: event.status,
            eventType: event.eventType,
            eventDate: event.eventDate,
            guestCount: event.guestCount,
            budget: event.budget ? Number(event.budget) : null,
            venueName: event.venueName,
            venueAddress: event.venueAddress,
            eventId: event.eventNumber ?? event.id,
          });
        }
        break;
      }
      case "task": {
        const tasks = await database.kitchenTask.findMany({
          where: {
            tenantId,
            id: { in: ids },
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            summary: true,
          },
        });
        for (const task of tasks) {
          result.set(task.id, {
            entityType: "task",
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            summary: task.summary,
          });
        }
        break;
      }
      case "employee": {
        const users = await database.user.findMany({
          where: {
            tenantId,
            id: { in: ids },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        });
        for (const user of users) {
          result.set(user.id, {
            entityType: "employee",
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
          });
        }
        break;
      }
      case "inventory": {
        const items = await database.inventoryItem.findMany({
          where: {
            tenantId,
            id: { in: ids },
          },
          select: {
            id: true,
            name: true,
            item_number: true,
            category: true,
            unitCost: true,
            quantityOnHand: true,
            reorder_level: true,
          },
        });
        for (const item of items) {
          result.set(item.id, {
            entityType: "inventory",
            id: item.id,
            name: item.name,
            itemNumber: item.item_number,
            category: item.category,
            unitCost: item.unitCost ? Number(item.unitCost) : null,
            quantityOnHand: Number(item.quantityOnHand),
            reorderLevel: Number(item.reorder_level),
          });
        }
        break;
      }
    }
  }

  return result;
}
