"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type { EntityType } from "../types/entities";

// ============================================================================
// Types
// ============================================================================

/** A single search result item */
export interface SearchResultItem {
  id: string;
  entityType: EntityType;
  title: string;
  subtitle: string | null;
}

/** Grouped search results by entity type */
export interface SearchResults {
  events: SearchResultItem[];
  clients: SearchResultItem[];
  prepTasks: SearchResultItem[];
  kitchenTasks: SearchResultItem[];
  employees: SearchResultItem[];
  inventoryItems: SearchResultItem[];
  recipes: SearchResultItem[];
  notes: SearchResultItem[];
}

export interface SearchEntitiesResult {
  success: boolean;
  data?: SearchResults;
  error?: string;
}

/** Max results per entity type to keep the response fast */
const RESULTS_PER_TYPE = 5;

// ============================================================================
// Per-Type Search Functions
// ============================================================================

async function searchEvents(
  tenantId: string,
  query: string
): Promise<SearchResultItem[]> {
  const events = await database.event.findMany({
    where: {
      tenantId,
      deletedAt: null,
      title: { contains: query, mode: "insensitive" },
    },
    select: { id: true, title: true, status: true },
    take: RESULTS_PER_TYPE,
    orderBy: { updatedAt: "desc" },
  });

  return events.map((e) => ({
    id: e.id,
    entityType: "event" as const,
    title: e.title,
    subtitle: e.status,
  }));
}

async function searchClients(
  tenantId: string,
  query: string
): Promise<SearchResultItem[]> {
  const clients = await database.client.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { company_name: { contains: query, mode: "insensitive" } },
        { first_name: { contains: query, mode: "insensitive" } },
        { last_name: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      company_name: true,
      first_name: true,
      last_name: true,
      email: true,
    },
    take: RESULTS_PER_TYPE,
    orderBy: { updatedAt: "desc" },
  });

  return clients.map((c) => ({
    id: c.id,
    entityType: "client" as const,
    title:
      c.company_name ??
      (`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() ||
      "Unknown Client"),
    subtitle: c.email,
  }));
}

async function searchPrepTasks(
  tenantId: string,
  query: string
): Promise<SearchResultItem[]> {
  const tasks = await database.prepTask.findMany({
    where: {
      tenantId,
      deletedAt: null,
      name: { contains: query, mode: "insensitive" },
    },
    select: { id: true, name: true, status: true },
    take: RESULTS_PER_TYPE,
    orderBy: { updatedAt: "desc" },
  });

  return tasks.map((t) => ({
    id: t.id,
    entityType: "prep_task" as const,
    title: t.name,
    subtitle: t.status,
  }));
}

async function searchKitchenTasks(
  tenantId: string,
  query: string
): Promise<SearchResultItem[]> {
  const tasks = await database.kitchenTask.findMany({
    where: {
      tenantId,
      deletedAt: null,
      title: { contains: query, mode: "insensitive" },
    },
    select: { id: true, title: true, status: true },
    take: RESULTS_PER_TYPE,
    orderBy: { updatedAt: "desc" },
  });

  return tasks.map((t) => ({
    id: t.id,
    entityType: "kitchen_task" as const,
    title: t.title,
    subtitle: t.status,
  }));
}

async function searchEmployees(
  tenantId: string,
  query: string
): Promise<SearchResultItem[]> {
  const users = await database.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, role: true },
    take: RESULTS_PER_TYPE,
    orderBy: { updatedAt: "desc" },
  });

  return users.map((u) => ({
    id: u.id,
    entityType: "employee" as const,
    title: `${u.firstName} ${u.lastName}`.trim() || "Employee",
    subtitle: u.role,
  }));
}

async function searchInventoryItems(
  tenantId: string,
  query: string
): Promise<SearchResultItem[]> {
  const items = await database.inventoryItem.findMany({
    where: {
      tenantId,
      deletedAt: null,
      name: { contains: query, mode: "insensitive" },
    },
    select: { id: true, name: true, category: true },
    take: RESULTS_PER_TYPE,
    orderBy: { updatedAt: "desc" },
  });

  return items.map((i) => ({
    id: i.id,
    entityType: "inventory_item" as const,
    title: i.name,
    subtitle: i.category,
  }));
}

async function searchRecipes(
  tenantId: string,
  query: string
): Promise<SearchResultItem[]> {
  const recipes = await database.recipe.findMany({
    where: {
      tenantId,
      deletedAt: null,
      name: { contains: query, mode: "insensitive" },
    },
    select: { id: true, name: true, category: true },
    take: RESULTS_PER_TYPE,
    orderBy: { updatedAt: "desc" },
  });

  return recipes.map((r) => ({
    id: r.id,
    entityType: "recipe" as const,
    title: r.name,
    subtitle: r.category,
  }));
}

async function searchNotes(
  tenantId: string,
  query: string
): Promise<SearchResultItem[]> {
  const notes = await database.note.findMany({
    where: {
      tenantId,
      deletedAt: null,
      title: { contains: query, mode: "insensitive" },
    },
    select: { id: true, title: true, color: true },
    take: RESULTS_PER_TYPE,
    orderBy: { updatedAt: "desc" },
  });

  return notes.map((n) => ({
    id: n.id,
    entityType: "note" as const,
    title: n.title,
    subtitle: null,
  }));
}

// ============================================================================
// Main Search Action
// ============================================================================

/**
 * Search across all entity types by name/title.
 * Returns grouped results with up to 5 items per type.
 * All searches run in parallel for performance.
 */
export async function searchEntities(
  query: string
): Promise<SearchEntitiesResult> {
  try {
    const tenantId = await requireTenantId();

    if (!query || query.trim().length === 0) {
      return {
        success: true,
        data: {
          events: [],
          clients: [],
          prepTasks: [],
          kitchenTasks: [],
          employees: [],
          inventoryItems: [],
          recipes: [],
          notes: [],
        },
      };
    }

    const trimmedQuery = query.trim();

    // Run all searches in parallel for performance
    const [
      events,
      clients,
      prepTasks,
      kitchenTasks,
      employees,
      inventoryItems,
      recipes,
      notes,
    ] = await Promise.all([
      searchEvents(tenantId, trimmedQuery).catch((error) => {
        console.error("[search-entities] Failed to search events:", error);
        return [] as SearchResultItem[];
      }),
      searchClients(tenantId, trimmedQuery).catch((error) => {
        console.error("[search-entities] Failed to search clients:", error);
        return [] as SearchResultItem[];
      }),
      searchPrepTasks(tenantId, trimmedQuery).catch((error) => {
        console.error("[search-entities] Failed to search prep tasks:", error);
        return [] as SearchResultItem[];
      }),
      searchKitchenTasks(tenantId, trimmedQuery).catch((error) => {
        console.error(
          "[search-entities] Failed to search kitchen tasks:",
          error
        );
        return [] as SearchResultItem[];
      }),
      searchEmployees(tenantId, trimmedQuery).catch((error) => {
        console.error("[search-entities] Failed to search employees:", error);
        return [] as SearchResultItem[];
      }),
      searchInventoryItems(tenantId, trimmedQuery).catch((error) => {
        console.error(
          "[search-entities] Failed to search inventory items:",
          error
        );
        return [] as SearchResultItem[];
      }),
      searchRecipes(tenantId, trimmedQuery).catch((error) => {
        console.error("[search-entities] Failed to search recipes:", error);
        return [] as SearchResultItem[];
      }),
      searchNotes(tenantId, trimmedQuery).catch((error) => {
        console.error("[search-entities] Failed to search notes:", error);
        return [] as SearchResultItem[];
      }),
    ]);

    return {
      success: true,
      data: {
        events,
        clients,
        prepTasks,
        kitchenTasks,
        employees,
        inventoryItems,
        recipes,
        notes,
      },
    };
  } catch (error) {
    console.error("[search-entities] Failed to search entities:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to search entities",
    };
  }
}
