"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type { EntityType } from "../types/entities";

// ============================================================================
// Types
// ============================================================================

/** A browsable entity item (no search query needed) */
export interface BrowseItem {
  id: string;
  entityType: EntityType;
  title: string;
  subtitle: string | null;
}

export interface BrowseEntitiesResult {
  success: boolean;
  items: BrowseItem[];
  error?: string;
}

/** Max items per category */
const BROWSE_LIMIT = 25;

// ============================================================================
// Browse by Entity Type
// ============================================================================

/**
 * List recent entities for a given type. No search query — just the most
 * recently updated items so users can browse and pick.
 */
export async function browseEntities(
  entityType: EntityType
): Promise<BrowseEntitiesResult> {
  try {
    const tenantId = await requireTenantId();

    switch (entityType) {
      case "event":
        return {
          success: true,
          items: await browseEvents(tenantId),
        };
      case "client":
        return {
          success: true,
          items: await browseClients(tenantId),
        };
      case "prep_task":
        return {
          success: true,
          items: await browsePrepTasks(tenantId),
        };
      case "kitchen_task":
        return {
          success: true,
          items: await browseKitchenTasks(tenantId),
        };
      case "employee":
        return {
          success: true,
          items: await browseEmployees(tenantId),
        };
      case "inventory_item":
        return {
          success: true,
          items: await browseInventoryItems(tenantId),
        };
      case "recipe":
        return {
          success: true,
          items: await browseRecipes(tenantId),
        };
      case "dish":
        return {
          success: true,
          items: await browseDishes(tenantId),
        };
      case "proposal":
        return {
          success: true,
          items: await browseProposals(tenantId),
        };
      case "shipment":
        return {
          success: true,
          items: await browseShipments(tenantId),
        };
      case "note":
        return {
          success: true,
          items: await browseNotes(tenantId),
        };
      case "risk":
        // Risks are derived from conflicts, not browsable directly
        return {
          success: true,
          items: [],
        };
      case "financial_projection":
        // Financial projections are derived from events, not browsable directly
        return {
          success: true,
          items: [],
        };
      default:
        return {
          success: false,
          items: [],
          error: `Unknown entity type: ${entityType}`,
        };
    }
  } catch (error) {
    console.error(`[browse-entities] Failed to browse ${entityType}:`, error);
    return {
      success: false,
      items: [],
      error:
        error instanceof Error ? error.message : "Failed to browse entities",
    };
  }
}

// ============================================================================
// Per-Type Browse Functions
// ============================================================================

async function browseEvents(tenantId: string): Promise<BrowseItem[]> {
  const rows = await database.event.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, title: true, status: true, eventDate: true },
    take: BROWSE_LIMIT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    entityType: "event" as const,
    title: r.title,
    subtitle: r.status,
  }));
}

async function browseClients(tenantId: string): Promise<BrowseItem[]> {
  const rows = await database.client.findMany({
    where: { tenantId, deletedAt: null },
    select: {
      id: true,
      company_name: true,
      first_name: true,
      last_name: true,
      email: true,
    },
    take: BROWSE_LIMIT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    entityType: "client" as const,
    title:
      r.company_name ??
      (`${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Unknown Client"),
    subtitle: r.email,
  }));
}

async function browsePrepTasks(tenantId: string): Promise<BrowseItem[]> {
  const rows = await database.prepTask.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, status: true },
    take: BROWSE_LIMIT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    entityType: "prep_task" as const,
    title: r.name,
    subtitle: r.status,
  }));
}

async function browseKitchenTasks(tenantId: string): Promise<BrowseItem[]> {
  const rows = await database.kitchenTask.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, title: true, status: true },
    take: BROWSE_LIMIT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    entityType: "kitchen_task" as const,
    title: r.title,
    subtitle: r.status,
  }));
}

async function browseEmployees(tenantId: string): Promise<BrowseItem[]> {
  const rows = await database.user.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, role: true },
    take: BROWSE_LIMIT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    entityType: "employee" as const,
    title: `${r.firstName} ${r.lastName}`.trim() || "Employee",
    subtitle: r.role,
  }));
}

async function browseInventoryItems(tenantId: string): Promise<BrowseItem[]> {
  const rows = await database.inventoryItem.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, category: true },
    take: BROWSE_LIMIT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    entityType: "inventory_item" as const,
    title: r.name,
    subtitle: r.category,
  }));
}

async function browseRecipes(tenantId: string): Promise<BrowseItem[]> {
  const rows = await database.recipe.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, category: true },
    take: BROWSE_LIMIT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    entityType: "recipe" as const,
    title: r.name,
    subtitle: r.category,
  }));
}

async function browseDishes(tenantId: string): Promise<BrowseItem[]> {
  const rows = await database.dish.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, category: true },
    take: BROWSE_LIMIT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    entityType: "dish" as const,
    title: r.name,
    subtitle: r.category,
  }));
}

async function browseProposals(tenantId: string): Promise<BrowseItem[]> {
  const rows = await database.proposal.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, title: true, status: true },
    take: BROWSE_LIMIT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    entityType: "proposal" as const,
    title: r.title,
    subtitle: r.status,
  }));
}

async function browseShipments(tenantId: string): Promise<BrowseItem[]> {
  const rows = await database.shipment.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, shipmentNumber: true, status: true },
    take: BROWSE_LIMIT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    entityType: "shipment" as const,
    title: r.shipmentNumber ?? `Shipment ${r.id.slice(0, 8)}`,
    subtitle: r.status,
  }));
}

async function browseNotes(tenantId: string): Promise<BrowseItem[]> {
  const rows = await database.note.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, title: true, color: true },
    take: BROWSE_LIMIT,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    entityType: "note" as const,
    title: r.title,
    subtitle: null,
  }));
}
