"use server";

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireTenantId } from "../../../lib/tenant";
import { autoPopulateBoard } from "./auto-populate";
import type { BoardScope } from "../types/board";
import type { BoardCommandId } from "./command-definitions";

// Re-export types so existing consumers don't break
export type { BoardCommandId } from "./command-definitions";

/** Result of executing a board command */
export interface ExecuteCommandResult {
  success: boolean;
  message: string;
  /** Number of projections affected */
  affectedCount?: number;
  error?: string;
}

// ============================================================================
// Command Execution
// ============================================================================

/**
 * Execute a board command by ID.
 *
 * Commands modify the board's projections — clearing, auto-populating,
 * or changing the scope and re-populating.
 */
export async function executeCommand(
  boardId: string,
  commandId: BoardCommandId
): Promise<ExecuteCommandResult> {
  try {
    const tenantId = await requireTenantId();

    switch (commandId) {
      case "clear_board":
        return await clearBoard(tenantId, boardId);

      case "auto_populate":
        return await runAutoPopulate(boardId);

      case "show_this_week":
        return await setScopeAndPopulate(tenantId, boardId, {
          entityTypes: ["event", "prep_task", "kitchen_task"],
          dateRange: { start: "now", end: "+7d" },
          statuses: ["pending", "in_progress", "confirmed"],
        });

      case "show_overdue":
        return await setScopeAndPopulate(tenantId, boardId, {
          entityTypes: ["event", "prep_task", "kitchen_task"],
          dateRange: { start: "-90d", end: "now" },
          statuses: ["overdue", "past_due", "late"],
        });

      case "show_all_events":
        return await setScopeAndPopulate(tenantId, boardId, {
          entityTypes: ["event"],
        });

      case "show_all_tasks":
        return await setScopeAndPopulate(tenantId, boardId, {
          entityTypes: ["prep_task", "kitchen_task"],
          statuses: ["pending", "in_progress", "confirmed", "overdue"],
        });

      default: {
        const _exhaustive: never = commandId;
        return {
          success: false,
          message: `Unknown command: ${_exhaustive}`,
          error: `Unknown command: ${_exhaustive}`,
        };
      }
    }
  } catch (error) {
    console.error(`[execute-command] Failed to execute ${commandId}:`, error);
    return {
      success: false,
      message: "Command failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Command Implementations
// ============================================================================

/** Soft-delete all projections on a board */
async function clearBoard(
  tenantId: string,
  boardId: string
): Promise<ExecuteCommandResult> {
  const result = await database.boardProjection.updateMany({
    where: {
      tenantId,
      boardId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath(`/command-board/${boardId}`);

  return {
    success: true,
    message: `Cleared ${result.count} projections from the board`,
    affectedCount: result.count,
  };
}

/** Run auto-populate with the board's current scope */
async function runAutoPopulate(
  boardId: string
): Promise<ExecuteCommandResult> {
  const result = await autoPopulateBoard(boardId);

  if (!result.success) {
    return {
      success: false,
      message: "Auto-populate failed",
      error: result.error,
    };
  }

  revalidatePath(`/command-board/${boardId}`);

  return {
    success: true,
    message:
      result.newProjections.length > 0
        ? `Added ${result.newProjections.length} entities (${result.skippedCount} already on board)`
        : `No new entities to add (${result.skippedCount} already on board)`,
    affectedCount: result.newProjections.length,
  };
}

/** Update the board's scope and auto-populate flag, then run auto-populate */
async function setScopeAndPopulate(
  tenantId: string,
  boardId: string,
  scope: BoardScope
): Promise<ExecuteCommandResult> {
  // Update board scope and enable auto-populate
  await database.commandBoard.update({
    where: {
      tenantId_id: { tenantId, id: boardId },
    },
    data: {
      scope: JSON.parse(JSON.stringify(scope)),
      autoPopulate: true,
    },
  });

  // Run auto-populate with the new scope
  const result = await autoPopulateBoard(boardId);

  if (!result.success) {
    return {
      success: false,
      message: "Scope updated but auto-populate failed",
      error: result.error,
    };
  }

  revalidatePath(`/command-board/${boardId}`);

  return {
    success: true,
    message:
      result.newProjections.length > 0
        ? `Added ${result.newProjections.length} entities to the board`
        : "Scope updated — no new entities matched",
    affectedCount: result.newProjections.length,
  };
}
