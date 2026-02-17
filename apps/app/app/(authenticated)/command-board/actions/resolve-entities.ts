"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type {
  EntityType,
  ResolvedClient,
  ResolvedDish,
  ResolvedEmployee,
  ResolvedEntity,
  ResolvedEvent,
  ResolvedInventoryItem,
  ResolvedKitchenTask,
  ResolvedNote,
  ResolvedPrepTask,
  ResolvedProposal,
  ResolvedRecipe,
  ResolvedShipment,
} from "../types/entities";

// ============================================================================
// Types
// ============================================================================

/** Reference to an entity that needs resolving */
export interface EntityRef {
  entityType: EntityType;
  entityId: string;
}

/** Result wrapper for the resolve operation */
export interface ResolveEntitiesResult {
  success: boolean;
  data?: Map<string, ResolvedEntity>;
  error?: string;
}

// ============================================================================
// Per-Type Batch Resolvers
// ============================================================================

/** Build a map key from entity type and id */
function entityKey(entityType: EntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

/**
 * Resolve events in a single batched query.
 * Includes client relation for clientName and venue relation for venueName.
 */
async function resolveEvents(
  tenantId: string,
  ids: string[]
): Promise<Map<string, ResolvedEntity>> {
  const results = new Map<string, ResolvedEntity>();

  const events = await database.event.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      title: true,
      eventDate: true,
      guestCount: true,
      status: true,
      budget: true,
      venueName: true,
      assignedTo: true,
      client: {
        select: {
          company_name: true,
          first_name: true,
          last_name: true,
        },
      },
      venue: {
        select: { name: true },
      },
    },
  });

  for (const event of events) {
    const clientName = event.client
      ? (event.client.company_name ??
        (`${event.client.first_name ?? ""} ${event.client.last_name ?? ""}`.trim() ||
          null))
      : null;

    // Prefer the venue relation name, fall back to the denormalized venueName field
    const venueName = event.venue?.name ?? event.venueName ?? null;

    const data: ResolvedEvent = {
      id: event.id,
      title: event.title,
      eventDate: event.eventDate,
      guestCount: event.guestCount,
      status: event.status,
      budget: event.budget ? Number(event.budget) : null,
      clientName,
      venueName,
      assignedTo: event.assignedTo,
    };

    results.set(entityKey("event", event.id), { type: "event", data });
  }

  return results;
}

/**
 * Resolve clients in a single batched query.
 */
async function resolveClients(
  tenantId: string,
  ids: string[]
): Promise<Map<string, ResolvedEntity>> {
  const results = new Map<string, ResolvedEntity>();

  const clients = await database.client.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      clientType: true,
      company_name: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
    },
  });

  for (const client of clients) {
    const data: ResolvedClient = {
      id: client.id,
      clientType: client.clientType,
      companyName: client.company_name,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      phone: client.phone,
    };

    results.set(entityKey("client", client.id), { type: "client", data });
  }

  return results;
}

/**
 * Resolve prep tasks in a single batched query.
 * PrepTask has no Prisma relation to Event, so we fetch event titles separately.
 */
async function resolvePrepTasks(
  tenantId: string,
  ids: string[]
): Promise<Map<string, ResolvedEntity>> {
  const results = new Map<string, ResolvedEntity>();

  const tasks = await database.prepTask.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      name: true,
      status: true,
      priority: true,
      dueByDate: true,
      eventId: true,
    },
  });

  // Batch-fetch event titles for all prep tasks that reference events
  const eventIds = [...new Set(tasks.map((t) => t.eventId))];
  const eventTitleMap = new Map<string, string>();

  if (eventIds.length > 0) {
    const events = await database.event.findMany({
      where: { tenantId, id: { in: eventIds }, deletedAt: null },
      select: { id: true, title: true },
    });
    for (const event of events) {
      eventTitleMap.set(event.id, event.title);
    }
  }

  for (const task of tasks) {
    const data: ResolvedPrepTask = {
      id: task.id,
      name: task.name,
      status: task.status,
      priority: String(task.priority),
      dueByDate: task.dueByDate,
      eventTitle: eventTitleMap.get(task.eventId) ?? null,
      eventId: task.eventId,
      // PrepTask has no assignee relation in the schema
      assigneeName: null,
      assigneeId: null,
    };

    results.set(entityKey("prep_task", task.id), {
      type: "prep_task",
      data,
    });
  }

  return results;
}

/**
 * Resolve kitchen tasks in a single batched query.
 */
async function resolveKitchenTasks(
  tenantId: string,
  ids: string[]
): Promise<Map<string, ResolvedEntity>> {
  const results = new Map<string, ResolvedEntity>();

  const tasks = await database.kitchenTask.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
    },
  });

  for (const task of tasks) {
    const data: ResolvedKitchenTask = {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: String(task.priority),
      dueDate: task.dueDate,
    };

    results.set(entityKey("kitchen_task", task.id), {
      type: "kitchen_task",
      data,
    });
  }

  return results;
}

/**
 * Resolve employees (User model) in a single batched query.
 * Includes the payrollRole relation for the role name.
 */
async function resolveEmployees(
  tenantId: string,
  ids: string[]
): Promise<Map<string, ResolvedEntity>> {
  const results = new Map<string, ResolvedEntity>();

  const users = await database.user.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      payrollRole: {
        select: { name: true },
      },
    },
  });

  for (const user of users) {
    const data: ResolvedEmployee = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      roleName: user.payrollRole?.name ?? null,
      isActive: user.isActive,
    };

    results.set(entityKey("employee", user.id), {
      type: "employee",
      data,
    });
  }

  return results;
}

/**
 * Resolve inventory items in a single batched query.
 */
async function resolveInventoryItems(
  tenantId: string,
  ids: string[]
): Promise<Map<string, ResolvedEntity>> {
  const results = new Map<string, ResolvedEntity>();

  const items = await database.inventoryItem.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      name: true,
      category: true,
      quantityOnHand: true,
      parLevel: true,
      unitOfMeasure: true,
    },
  });

  for (const item of items) {
    const data: ResolvedInventoryItem = {
      id: item.id,
      name: item.name,
      category: item.category,
      quantityOnHand: Number(item.quantityOnHand),
      parLevel: Number(item.parLevel),
      unit: item.unitOfMeasure,
    };

    results.set(entityKey("inventory_item", item.id), {
      type: "inventory_item",
      data,
    });
  }

  return results;
}

/**
 * Resolve recipes in a single batched query.
 * Fetches the latest RecipeVersion separately (no direct Prisma relation on Recipe).
 */
async function resolveRecipes(
  tenantId: string,
  ids: string[]
): Promise<Map<string, ResolvedEntity>> {
  const results = new Map<string, ResolvedEntity>();

  const recipes = await database.recipe.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      name: true,
      category: true,
      cuisineType: true,
    },
  });

  // Batch-fetch latest recipe versions for all recipes
  // Get the highest versionNumber per recipeId
  const latestVersionMap = new Map<
    string,
    {
      prepTimeMinutes: number | null;
      cookTimeMinutes: number | null;
      yieldQuantity: number | null;
      totalCost: number | null;
    }
  >();

  if (recipes.length > 0) {
    const recipeIds = recipes.map((r) => r.id);
    const versions = await database.recipeVersion.findMany({
      where: {
        tenantId,
        recipeId: { in: recipeIds },
        deletedAt: null,
      },
      orderBy: { versionNumber: "desc" },
      select: {
        recipeId: true,
        versionNumber: true,
        prepTimeMinutes: true,
        cookTimeMinutes: true,
        yieldQuantity: true,
        totalCost: true,
      },
    });

    // Keep only the first (highest version) per recipeId
    for (const v of versions) {
      if (!latestVersionMap.has(v.recipeId)) {
        latestVersionMap.set(v.recipeId, {
          prepTimeMinutes: v.prepTimeMinutes,
          cookTimeMinutes: v.cookTimeMinutes,
          yieldQuantity: v.yieldQuantity ? Number(v.yieldQuantity) : null,
          totalCost: v.totalCost ? Number(v.totalCost) : null,
        });
      }
    }
  }

  for (const recipe of recipes) {
    const data: ResolvedRecipe = {
      id: recipe.id,
      name: recipe.name,
      category: recipe.category,
      cuisineType: recipe.cuisineType,
      latestVersion: latestVersionMap.get(recipe.id) ?? null,
    };

    results.set(entityKey("recipe", recipe.id), { type: "recipe", data });
  }

  return results;
}

/**
 * Resolve dishes in a single batched query.
 */
async function resolveDishes(
  tenantId: string,
  ids: string[]
): Promise<Map<string, ResolvedEntity>> {
  const results = new Map<string, ResolvedEntity>();

  const dishes = await database.dish.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      name: true,
      category: true,
      serviceStyle: true,
      pricePerPerson: true,
      dietaryTags: true,
    },
  });

  for (const dish of dishes) {
    const data: ResolvedDish = {
      id: dish.id,
      name: dish.name,
      category: dish.category,
      serviceStyle: dish.serviceStyle,
      pricePerPerson: dish.pricePerPerson ? Number(dish.pricePerPerson) : null,
      dietaryTags: dish.dietaryTags,
    };

    results.set(entityKey("dish", dish.id), { type: "dish", data });
  }

  return results;
}

/**
 * Resolve proposals in a single batched query.
 * Includes client relation for clientName.
 */
async function resolveProposals(
  tenantId: string,
  ids: string[]
): Promise<Map<string, ResolvedEntity>> {
  const results = new Map<string, ResolvedEntity>();

  const proposals = await database.proposal.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      proposalNumber: true,
      title: true,
      status: true,
      total: true,
      client: {
        select: {
          company_name: true,
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  for (const proposal of proposals) {
    const clientName = proposal.client
      ? (proposal.client.company_name ??
        (`${proposal.client.first_name ?? ""} ${proposal.client.last_name ?? ""}`.trim() ||
          null))
      : null;

    const data: ResolvedProposal = {
      id: proposal.id,
      proposalNumber: proposal.proposalNumber,
      title: proposal.title,
      status: proposal.status,
      total: proposal.total ? Number(proposal.total) : null,
      clientName,
    };

    results.set(entityKey("proposal", proposal.id), {
      type: "proposal",
      data,
    });
  }

  return results;
}

/**
 * Resolve shipments in a single batched query.
 * Includes event and supplier relations for display names and item count.
 */
async function resolveShipments(
  tenantId: string,
  ids: string[]
): Promise<Map<string, ResolvedEntity>> {
  const results = new Map<string, ResolvedEntity>();

  const shipments = await database.shipment.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      shipmentNumber: true,
      status: true,
      totalItems: true,
      event: {
        select: { title: true },
      },
      supplier: {
        select: { name: true },
      },
    },
  });

  for (const shipment of shipments) {
    const data: ResolvedShipment = {
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      status: shipment.status,
      eventTitle: shipment.event?.title ?? null,
      supplierName: shipment.supplier?.name ?? null,
      itemCount: shipment.totalItems,
    };

    results.set(entityKey("shipment", shipment.id), {
      type: "shipment",
      data,
    });
  }

  return results;
}

/**
 * Resolve notes in a single batched query.
 */
async function resolveNotes(
  tenantId: string,
  ids: string[]
): Promise<Map<string, ResolvedEntity>> {
  const results = new Map<string, ResolvedEntity>();

  const notes = await database.note.findMany({
    where: { tenantId, id: { in: ids }, deletedAt: null },
    select: {
      id: true,
      title: true,
      content: true,
      color: true,
      tags: true,
    },
  });

  for (const note of notes) {
    const data: ResolvedNote = {
      id: note.id,
      title: note.title,
      content: note.content,
      color: note.color,
      tags: note.tags,
    };

    results.set(entityKey("note", note.id), { type: "note", data });
  }

  return results;
}

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolves entity data for board projections in batched queries.
 *
 * Instead of N+1 queries (one per card), this groups projections by entity type
 * and runs one query per type in parallel via Promise.all.
 *
 * Returns a Map keyed by "entityType:entityId" → ResolvedEntity.
 * Missing entities (deleted, not found) simply won't appear in the map —
 * the caller checks for missing entries to detect stale projections.
 */
export async function resolveEntities(
  refs: EntityRef[]
): Promise<ResolveEntitiesResult> {
  try {
    const tenantId = await requireTenantId();

    if (refs.length === 0) {
      return { success: true, data: new Map() };
    }

    // Group refs by entity type
    const byType = new Map<EntityType, string[]>();
    for (const ref of refs) {
      const ids = byType.get(ref.entityType) ?? [];
      ids.push(ref.entityId);
      byType.set(ref.entityType, ids);
    }

    // Build resolver promises — one per entity type, run in parallel
    const resolverPromises: Promise<Map<string, ResolvedEntity>>[] = [];

    for (const [entityType, ids] of byType.entries()) {
      // Deduplicate ids within each type
      const uniqueIds = [...new Set(ids)];

      const resolverPromise = (async () => {
        try {
          switch (entityType) {
            case "event":
              return await resolveEvents(tenantId, uniqueIds);
            case "client":
              return await resolveClients(tenantId, uniqueIds);
            case "prep_task":
              return await resolvePrepTasks(tenantId, uniqueIds);
            case "kitchen_task":
              return await resolveKitchenTasks(tenantId, uniqueIds);
            case "employee":
              return await resolveEmployees(tenantId, uniqueIds);
            case "inventory_item":
              return await resolveInventoryItems(tenantId, uniqueIds);
            case "recipe":
              return await resolveRecipes(tenantId, uniqueIds);
            case "dish":
              return await resolveDishes(tenantId, uniqueIds);
            case "proposal":
              return await resolveProposals(tenantId, uniqueIds);
            case "shipment":
              return await resolveShipments(tenantId, uniqueIds);
            case "note":
              return await resolveNotes(tenantId, uniqueIds);
            case "risk":
              // Risk entities are derived from conflicts, not directly resolved from DB
              // Return empty map - risks come from conflict detection
              return new Map<string, ResolvedEntity>();
            default: {
              // Exhaustive check — if a new EntityType is added, this will error at compile time
              const _exhaustive: never = entityType;
              console.error(
                `[resolve-entities] Unknown entity type: ${_exhaustive}`
              );
              return new Map<string, ResolvedEntity>();
            }
          }
        } catch (error) {
          // Log but don't fail the whole batch — other types can still resolve
          console.error(
            `[resolve-entities] Failed to resolve ${entityType} entities:`,
            error instanceof Error ? error.message : error
          );
          return new Map<string, ResolvedEntity>();
        }
      })();

      resolverPromises.push(resolverPromise);
    }

    // Run all type resolvers in parallel
    const resolvedMaps = await Promise.all(resolverPromises);

    // Merge all results into a single map
    const merged = new Map<string, ResolvedEntity>();
    for (const map of resolvedMaps) {
      for (const [key, value] of map.entries()) {
        merged.set(key, value);
      }
    }

    return { success: true, data: merged };
  } catch (error) {
    console.error("[resolve-entities] Failed to resolve entities:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to resolve entities",
    };
  }
}
