"use server";

import { database, Prisma } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type { BoardProjection, BoardScope } from "../types/board";
import type { EntityType } from "../types/entities";

// ============================================================================
// Types
// ============================================================================

/** Result of an auto-populate operation */
export interface AutoPopulateResult {
  success: boolean;
  /** Newly created projections (not including existing ones) */
  newProjections: BoardProjection[];
  /** Total entities matched by scope */
  matchedCount: number;
  /** How many were already on the board */
  skippedCount: number;
  error?: string;
}

/** Internal entity reference discovered by scope queries */
interface DiscoveredEntity {
  entityType: EntityType;
  entityId: string;
}

// ============================================================================
// Default Scope
// ============================================================================

/** Default scope when a board has autoPopulate=true but no explicit scope */
const DEFAULT_BOARD_SCOPE: BoardScope = {
  entityTypes: ["event", "prep_task"],
  dateRange: { start: "now", end: "+7d" },
  statuses: ["pending", "in_progress", "confirmed", "overdue"],
};

// ============================================================================
// Date Range Helpers
// ============================================================================

/** Regex for relative date strings like "+7d", "-3d", "+2w" */
const RELATIVE_DATE_RE = /^([+-])(\d+)([dhwm])$/;

/** Parse a relative date string like "now", "+7d", "-3d" into a Date */
function parseRelativeDate(value: string): Date {
  const now = new Date();

  if (value === "now") {
    // Start of today
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const match = RELATIVE_DATE_RE.exec(value);
  if (!match) {
    // Try parsing as ISO date
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
    console.error(
      `[auto-populate] Invalid date value: ${value}, defaulting to now`
    );
    return now;
  }

  const sign = match[1] === "+" ? 1 : -1;
  const amount = Number.parseInt(match[2], 10);
  const unit = match[3];

  const result = new Date(now);
  switch (unit) {
    case "d":
      result.setDate(result.getDate() + sign * amount);
      break;
    case "h":
      result.setHours(result.getHours() + sign * amount);
      break;
    case "w":
      result.setDate(result.getDate() + sign * amount * 7);
      break;
    case "m":
      result.setMonth(result.getMonth() + sign * amount);
      break;
  }

  return result;
}

// ============================================================================
// Per-Type Entity Discovery
// ============================================================================

/**
 * Discover events matching the scope filters.
 * Filters by: dateRange (eventDate), statuses, assignedTo.
 */
async function discoverEvents(
  tenantId: string,
  scope: BoardScope
): Promise<DiscoveredEntity[]> {
  const where: Record<string, unknown> = {
    tenantId,
    deletedAt: null,
  };

  // Date range filter on eventDate
  if (scope.dateRange) {
    const start = parseRelativeDate(scope.dateRange.start);
    const end = parseRelativeDate(scope.dateRange.end);
    where.eventDate = { gte: start, lte: end };
  }

  // Status filter
  if (scope.statuses && scope.statuses.length > 0) {
    where.status = { in: scope.statuses };
  }

  // Assigned-to filter
  if (scope.assignedTo && scope.assignedTo.length > 0) {
    where.assignedTo = { in: scope.assignedTo };
  }

  try {
    const events = await database.event.findMany({
      where,
      select: { id: true },
      take: 100, // Safety cap
    });

    return events.map(
      (e): DiscoveredEntity => ({ entityType: "event", entityId: e.id })
    );
  } catch (error) {
    console.error("[auto-populate] Failed to discover events:", error);
    return [];
  }
}

/**
 * Discover prep tasks matching the scope filters.
 * Filters by: dateRange (dueByDate), statuses.
 */
async function discoverPrepTasks(
  tenantId: string,
  scope: BoardScope
): Promise<DiscoveredEntity[]> {
  const where: Record<string, unknown> = {
    tenantId,
    deletedAt: null,
  };

  // Date range filter on dueByDate
  if (scope.dateRange) {
    const start = parseRelativeDate(scope.dateRange.start);
    const end = parseRelativeDate(scope.dateRange.end);
    where.dueByDate = { gte: start, lte: end };
  }

  // Status filter
  if (scope.statuses && scope.statuses.length > 0) {
    where.status = { in: scope.statuses };
  }

  try {
    const tasks = await database.prepTask.findMany({
      where,
      select: { id: true },
      take: 100,
    });

    return tasks.map(
      (t): DiscoveredEntity => ({ entityType: "prep_task", entityId: t.id })
    );
  } catch (error) {
    console.error("[auto-populate] Failed to discover prep tasks:", error);
    return [];
  }
}

/**
 * Discover kitchen tasks matching the scope filters.
 * Filters by: dateRange (dueDate), statuses.
 */
async function discoverKitchenTasks(
  tenantId: string,
  scope: BoardScope
): Promise<DiscoveredEntity[]> {
  const where: Record<string, unknown> = {
    tenantId,
    deletedAt: null,
  };

  if (scope.dateRange) {
    const start = parseRelativeDate(scope.dateRange.start);
    const end = parseRelativeDate(scope.dateRange.end);
    where.dueDate = { gte: start, lte: end };
  }

  if (scope.statuses && scope.statuses.length > 0) {
    where.status = { in: scope.statuses };
  }

  try {
    const tasks = await database.kitchenTask.findMany({
      where,
      select: { id: true },
      take: 100,
    });

    return tasks.map(
      (t): DiscoveredEntity => ({ entityType: "kitchen_task", entityId: t.id })
    );
  } catch (error) {
    console.error("[auto-populate] Failed to discover kitchen tasks:", error);
    return [];
  }
}

/**
 * Discover clients — no date/status filters apply, just returns recent active clients.
 * Only included if explicitly in scope.entityTypes.
 */
async function discoverClients(
  tenantId: string,
  _scope: BoardScope
): Promise<DiscoveredEntity[]> {
  try {
    const clients = await database.client.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return clients.map(
      (c): DiscoveredEntity => ({ entityType: "client", entityId: c.id })
    );
  } catch (error) {
    console.error("[auto-populate] Failed to discover clients:", error);
    return [];
  }
}

/**
 * Discover employees — returns active employees.
 * Only included if explicitly in scope.entityTypes.
 */
async function discoverEmployees(
  tenantId: string,
  _scope: BoardScope
): Promise<DiscoveredEntity[]> {
  try {
    const users = await database.user.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: { id: true },
      take: 50,
    });

    return users.map(
      (u): DiscoveredEntity => ({ entityType: "employee", entityId: u.id })
    );
  } catch (error) {
    console.error("[auto-populate] Failed to discover employees:", error);
    return [];
  }
}

/**
 * Discover inventory items — returns items below par level (actionable).
 * Only included if explicitly in scope.entityTypes.
 */
async function discoverInventoryItems(
  tenantId: string,
  _scope: BoardScope
): Promise<DiscoveredEntity[]> {
  try {
    // Only surface items that need attention (below par level)
    const items = await database.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM tenant_inventory."InventoryItem"
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND par_level IS NOT NULL
        AND quantity_on_hand < par_level
      LIMIT 50
    `;

    return items.map(
      (i): DiscoveredEntity => ({
        entityType: "inventory_item",
        entityId: i.id,
      })
    );
  } catch (error) {
    console.error("[auto-populate] Failed to discover inventory items:", error);
    return [];
  }
}

// ============================================================================
// Auto-Layout
// ============================================================================

/** Grid layout constants */
const GRID_COLS = 4;
const CARD_WIDTH = 280;
const CARD_HEIGHT = 180;
const GAP_X = 40;
const GAP_Y = 40;
const OFFSET_X = 100;
const OFFSET_Y = 100;

function isUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002";
  }

  if (error instanceof Error) {
    return error.message.includes("Unique constraint failed");
  }

  return false;
}

/** Calculate grid position for the Nth new card, offset by existing card count */
function gridPosition(
  index: number,
  existingCount: number
): { x: number; y: number } {
  const totalIndex = existingCount + index;
  const col = totalIndex % GRID_COLS;
  const row = Math.floor(totalIndex / GRID_COLS);

  return {
    x: OFFSET_X + col * (CARD_WIDTH + GAP_X),
    y: OFFSET_Y + row * (CARD_HEIGHT + GAP_Y),
  };
}

// ============================================================================
// Main Auto-Populate Action
// ============================================================================

/**
 * Auto-populate a board based on its scope configuration.
 *
 * 1. Reads the board's scope (or uses DEFAULT_BOARD_SCOPE)
 * 2. Discovers matching entities per type
 * 3. Filters out entities already projected on the board
 * 4. Creates new projections with grid layout
 * 5. Returns the new projections for the client to render
 */
export async function autoPopulateBoard(
  boardId: string
): Promise<AutoPopulateResult> {
  try {
    const tenantId = await requireTenantId();

    // Fetch board to get scope and autoPopulate flag
    const board = await database.commandBoard.findUnique({
      where: {
        tenantId_id: { tenantId, id: boardId },
      },
      select: {
        autoPopulate: true,
        scope: true,
      },
    });

    if (!board) {
      return {
        success: false,
        newProjections: [],
        matchedCount: 0,
        skippedCount: 0,
        error: "Board not found",
      };
    }

    if (!board.autoPopulate) {
      return {
        success: true,
        newProjections: [],
        matchedCount: 0,
        skippedCount: 0,
      };
    }

    // Parse scope — use default if not set
    const scope: BoardScope = board.scope
      ? (board.scope as unknown as BoardScope)
      : DEFAULT_BOARD_SCOPE;

    // Discover entities matching scope, per type in parallel
    const discoveryPromises: Promise<DiscoveredEntity[]>[] = [];

    for (const entityType of scope.entityTypes) {
      switch (entityType) {
        case "event":
          discoveryPromises.push(discoverEvents(tenantId, scope));
          break;
        case "prep_task":
          discoveryPromises.push(discoverPrepTasks(tenantId, scope));
          break;
        case "kitchen_task":
          discoveryPromises.push(discoverKitchenTasks(tenantId, scope));
          break;
        case "client":
          discoveryPromises.push(discoverClients(tenantId, scope));
          break;
        case "employee":
          discoveryPromises.push(discoverEmployees(tenantId, scope));
          break;
        case "inventory_item":
          discoveryPromises.push(discoverInventoryItems(tenantId, scope));
          break;
        // Types without discovery logic — skip silently
        default:
          break;
      }
    }

    const discoveredArrays = await Promise.all(discoveryPromises);
    const allDiscovered = discoveredArrays.flat();

    if (allDiscovered.length === 0) {
      return {
        success: true,
        newProjections: [],
        matchedCount: 0,
        skippedCount: 0,
      };
    }

    // Fetch existing projections to avoid duplicates
    const existingProjections = await database.boardProjection.findMany({
      where: {
        tenantId,
        boardId,
        deletedAt: null,
      },
      select: {
        entityType: true,
        entityId: true,
        zIndex: true,
      },
    });

    const existingKeys = new Set(
      existingProjections.map((p) => `${p.entityType}:${p.entityId}`)
    );

    // Filter out already-projected entities
    const newEntities = allDiscovered.filter(
      (e) => !existingKeys.has(`${e.entityType}:${e.entityId}`)
    );

    const matchedCount = allDiscovered.length;
    const skippedCount = matchedCount - newEntities.length;

    if (newEntities.length === 0) {
      return {
        success: true,
        newProjections: [],
        matchedCount,
        skippedCount,
      };
    }

    // Calculate starting zIndex
    const maxZ = existingProjections.reduce(
      (max, p) => Math.max(max, p.zIndex),
      0
    );

    // Create projections one-by-one so uniqueness races don't fail the whole run.
    const createdRows: Array<
      Awaited<ReturnType<typeof database.boardProjection.create>>
    > = [];
    let raceSkippedCount = 0;

    for (const [index, entity] of newEntities.entries()) {
      const pos = gridPosition(index, existingProjections.length);
      try {
        const created = await database.boardProjection.create({
          data: {
            tenantId,
            id: crypto.randomUUID(),
            boardId,
            entityType: entity.entityType,
            entityId: entity.entityId,
            positionX: pos.x,
            positionY: pos.y,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            zIndex: maxZ + index + 1,
          },
        });
        createdRows.push(created);
      } catch (createError) {
        if (isUniqueConstraintError(createError)) {
          // Another process inserted this projection between discovery and create.
          raceSkippedCount += 1;
          continue;
        }
        throw createError;
      }
    }

    // Map to domain type
    const newProjections: BoardProjection[] = createdRows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      boardId: row.boardId,
      entityType: row.entityType as EntityType,
      entityId: row.entityId,
      positionX: row.positionX,
      positionY: row.positionY,
      width: row.width,
      height: row.height,
      zIndex: row.zIndex,
      colorOverride: row.colorOverride,
      collapsed: row.collapsed,
      groupId: row.groupId,
      pinned: row.pinned,
    }));

    console.info(
      `[auto-populate] Board ${boardId}: discovered ${matchedCount} entities, ` +
        `skipped ${skippedCount + raceSkippedCount} existing, created ${newProjections.length} new projections`
    );

    return {
      success: true,
      newProjections,
      matchedCount,
      skippedCount: skippedCount + raceSkippedCount,
    };
  } catch (error) {
    console.error("[auto-populate] Failed to auto-populate board:", error);
    return {
      success: false,
      newProjections: [],
      matchedCount: 0,
      skippedCount: 0,
      error:
        error instanceof Error
          ? error.message
          : "Failed to auto-populate board",
    };
  }
}
