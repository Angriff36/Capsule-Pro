"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type { BoardProjection, BoardGroup, BoardAnnotation } from "../types/board";

// ---------------------------------------------------------------------------
// Legacy board types — these match the current Prisma CommandBoard model.
// The new projection-based types live in ../types/board.ts. These will be
// removed once the old CRUD actions are fully replaced by projection actions.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Simulation Types (Phase 5.1)
// ---------------------------------------------------------------------------

/** Represents a simulation session for "what-if" scenarios */
export interface SimulationContext {
  id: string;
  tenantId: string;
  sourceBoardId: string;
  simulationName: string;
  createdAt: Date;
  status: "active" | "applied" | "discarded";
  /** Projections in the simulation (copied from source) */
  projections: BoardProjection[];
  /** Groups in the simulation */
  groups: BoardGroup[];
  /** Annotations in the simulation */
  annotations: BoardAnnotation[];
  /** Manifest plans created during simulation */
  simulationPlans: string[];
}

/** Result of forking a board for simulation */
export interface ForkBoardResult {
  success: boolean;
  simulation?: SimulationContext;
  error?: string;
}

/** Delta between original and simulated board state */
export interface BoardDelta {
  addedProjections: BoardProjection[];
  removedProjectionIds: string[];
  modifiedProjections: Array<{
    id: string;
    field: string;
    original: unknown;
    simulated: unknown;
  }>;
  addedGroups: BoardGroup[];
  removedGroupIds: string[];
  addedAnnotations: BoardAnnotation[];
  removedAnnotationIds: string[];
  /** Summary of changes for display */
  summary: {
    additions: number;
    removals: number;
    modifications: number;
    totalChanges: number;
  };
}

/** Input for computing board delta */
export interface ComputeDeltaInput {
  originalProjections: BoardProjection[];
  simulatedProjections: BoardProjection[];
  originalGroups: BoardGroup[];
  simulatedGroups: BoardGroup[];
  originalAnnotations: BoardAnnotation[];
  simulatedAnnotations: BoardAnnotation[];
}

export type BoardStatus = "draft" | "active" | "archived";

export type CardStatus = "active" | "completed" | "archived";

export type CardType =
  | "generic"
  | "event"
  | "client"
  | "task"
  | "employee"
  | "inventory"
  | "recipe"
  | "note";

export interface CommandBoard {
  id: string;
  tenantId: string;
  eventId: string | null;
  name: string;
  description: string | null;
  status: BoardStatus;
  isTemplate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CommandBoardCard {
  id: string;
  tenantId: string;
  boardId: string;
  title: string;
  content: string | null;
  cardType: CardType;
  status: CardStatus;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
  };
  color: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateBoardInput {
  name: string;
  description?: string;
  eventId?: string;
  isTemplate?: boolean;
  tags?: string[];
}

export interface UpdateBoardInput {
  id: string;
  name?: string;
  description?: string;
  status?: BoardStatus;
  eventId?: string | null;
  isTemplate?: boolean;
  tags?: string[];
}

function dbBoardToBoard(board: {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: string;
  isTemplate: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  eventId: string | null;
}): CommandBoard {
  return {
    id: board.id,
    tenantId: board.tenantId,
    eventId: board.eventId,
    name: board.name,
    description: board.description,
    status: (board.status as BoardStatus) || "draft",
    isTemplate: board.isTemplate,
    tags: board.tags,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
    deletedAt: board.deletedAt,
  };
}

export interface BoardResult {
  success: boolean;
  board?: CommandBoard;
  error?: string;
}

export interface CommandBoardWithCards extends CommandBoard {
  cards: CommandBoardCard[];
}

export async function getCommandBoard(
  boardId: string
): Promise<CommandBoardWithCards | null> {
  const tenantId = await requireTenantId();

  const board = await database.commandBoard.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: boardId,
      },
    },
    include: {
      cards: true,
    },
  });

  if (!board) {
    return null;
  }

  return {
    ...dbBoardToBoard(board),
    cards: board.cards.map(
      (card): CommandBoardCard => ({
        id: card.id,
        tenantId: card.tenantId,
        boardId: card.boardId,
        title: card.title,
        content: card.content,
        cardType: card.cardType as CardType,
        status: card.status as CardStatus,
        position: {
          x: card.positionX,
          y: card.positionY,
          width: card.width,
          height: card.height,
          zIndex: card.zIndex,
        },
        color: card.color,
        metadata: (card.metadata as Record<string, unknown>) || {},
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        deletedAt: card.deletedAt,
      })
    ),
  };
}

export async function listCommandBoards(): Promise<CommandBoard[]> {
  const tenantId = await requireTenantId();

  const boards = await database.commandBoard.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return boards.map(dbBoardToBoard);
}

export async function createCommandBoard(
  input: CreateBoardInput
): Promise<BoardResult> {
  try {
    const tenantId = await requireTenantId();

    const board = await database.commandBoard.create({
      data: {
        tenantId,
        id: crypto.randomUUID(),
        name: input.name,
        description: input.description || null,
        eventId: input.eventId || null,
        isTemplate: input.isTemplate,
        tags: input.tags || [],
      },
    });

    return {
      success: true,
      board: dbBoardToBoard(board),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create board",
    };
  }
}

export async function updateCommandBoard(
  input: UpdateBoardInput
): Promise<BoardResult> {
  try {
    const tenantId = await requireTenantId();

    const board = await database.commandBoard.update({
      where: {
        tenantId_id: {
          tenantId,
          id: input.id,
        },
      },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.eventId !== undefined && { eventId: input.eventId }),
        ...(input.isTemplate !== undefined && { isTemplate: input.isTemplate }),
        ...(input.tags !== undefined && { tags: input.tags }),
      },
    });

    return {
      success: true,
      board: dbBoardToBoard(board),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update board",
    };
  }
}

export async function deleteCommandBoard(
  boardId: string
): Promise<BoardResult> {
  try {
    const tenantId = await requireTenantId();

    await database.commandBoard.update({
      where: {
        tenantId_id: {
          tenantId,
          id: boardId,
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
      error: error instanceof Error ? error.message : "Failed to delete board",
    };
  }
}

// ---------------------------------------------------------------------------
// Board Fork/Clone Functions (Phase 5.1 - Simulation Engine)
// ---------------------------------------------------------------------------

/**
 * Forks a board for simulation purposes.
 * Creates a deep copy of all projections, groups, and annotations for "what-if" scenarios.
 * The simulation is stored in the database with a simulation flag for later retrieval.
 */
export async function forkCommandBoard(
  sourceBoardId: string,
  simulationName: string
): Promise<ForkBoardResult> {
  try {
    const tenantId = await requireTenantId();

    // Verify source board exists
    const sourceBoard = await database.commandBoard.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: sourceBoardId,
        },
      },
      include: {
        projections: true,
        groups: true,
        annotations: true,
      },
    });

    if (!sourceBoard) {
      return {
        success: false,
        error: "Source board not found",
      };
    }

    // Create simulation ID
    const simulationId = crypto.randomUUID();

    // Store simulation context in the database by creating a new board with simulation metadata
    const simulationBoard = await database.commandBoard.create({
      data: {
        id: simulationId,
        tenantId,
        name: `[Simulation] ${simulationName}`,
        description: `Forked from board ${sourceBoardId}`,
        status: "draft",
        isTemplate: false,
        tags: ["simulation", `source:${sourceBoardId}`],
      },
    });

    // Deep copy projections with new IDs mapped to simulation board
    const projectionIdMap = new Map<string, string>();
    const projectionCopies = sourceBoard.projections.map((proj) => {
      const newId = crypto.randomUUID();
      projectionIdMap.set(proj.id, newId);
      return {
        id: newId,
        tenantId,
        boardId: simulationId,
        entityType: proj.entityType,
        entityId: proj.entityId,
        positionX: proj.positionX,
        positionY: proj.positionY,
        width: proj.width,
        height: proj.height,
        zIndex: proj.zIndex,
        colorOverride: proj.colorOverride,
        collapsed: proj.collapsed,
        groupId: proj.groupId, // Will update after groups are copied
        pinned: proj.pinned,
      };
    });

    // Deep copy groups with new IDs
    const groupIdMap = new Map<string, string>();
    const groupCopies = sourceBoard.groups.map((group) => {
      const newId = crypto.randomUUID();
      groupIdMap.set(group.id, newId);
      return {
        id: newId,
        tenantId,
        boardId: simulationId,
        name: group.name,
        color: group.color,
        collapsed: group.collapsed,
        positionX: group.positionX,
        positionY: group.positionY,
        width: group.width,
        height: group.height,
        zIndex: group.zIndex,
      };
    });

    // Update projections with new group IDs
    for (const proj of projectionCopies) {
      if (proj.groupId && groupIdMap.has(proj.groupId)) {
        proj.groupId = groupIdMap.get(proj.groupId)!;
      }
    }

    // Deep copy annotations with updated projection references
    const annotationCopies = sourceBoard.annotations.map((ann) => {
      const newFromId = ann.fromProjectionId
        ? (projectionIdMap.get(ann.fromProjectionId) ?? null)
        : null;
      const newToId = ann.toProjectionId
        ? (projectionIdMap.get(ann.toProjectionId) ?? null)
        : null;
      return {
        id: crypto.randomUUID(),
        tenantId,
        boardId: simulationId,
        annotationType: ann.annotationType,
        fromProjectionId: newFromId,
        toProjectionId: newToId,
        label: ann.label,
        color: ann.color,
        style: ann.style,
      };
    });

    // Batch insert projections
    if (projectionCopies.length > 0) {
      await database.boardProjection.createMany({
        data: projectionCopies,
      });
    }

    // Batch insert groups
    if (groupCopies.length > 0) {
      await database.commandBoardGroup.createMany({
        data: groupCopies,
      });
    }

    // Batch insert annotations
    if (annotationCopies.length > 0) {
      await database.boardAnnotation.createMany({
        data: annotationCopies,
      });
    }

    const simulationContext: SimulationContext = {
      id: simulationId,
      tenantId,
      sourceBoardId,
      simulationName,
      createdAt: simulationBoard.createdAt,
      status: "active",
      projections: projectionCopies as BoardProjection[],
      groups: groupCopies as BoardGroup[],
      annotations: annotationCopies as BoardAnnotation[],
      simulationPlans: [],
    };

    return {
      success: true,
      simulation: simulationContext,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fork board",
    };
  }
}

/**
 * Retrieves an active simulation context by ID.
 */
export async function getSimulationContext(
  simulationId: string
): Promise<SimulationContext | null> {
  const tenantId = await requireTenantId();

  const board = await database.commandBoard.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: simulationId,
      },
    },
    include: {
      projections: true,
      groups: true,
      annotations: true,
    },
  });

  if (!board || !board.tags.includes("simulation")) {
    return null;
  }

  // Extract source board ID from tags
  const sourceTag = board.tags.find((t) => t.startsWith("source:"));
  const sourceBoardId = sourceTag ? sourceTag.replace("source:", "") : "";

  return {
    id: board.id,
    tenantId: board.tenantId,
    sourceBoardId,
    simulationName: board.name.replace("[Simulation] ", ""),
    createdAt: board.createdAt,
    status: board.status === "archived" ? "discarded" : "active",
    projections: board.projections.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      boardId: p.boardId,
      entityType: p.entityType as BoardProjection["entityType"],
      entityId: p.entityId,
      positionX: p.positionX,
      positionY: p.positionY,
      width: p.width,
      height: p.height,
      zIndex: p.zIndex,
      colorOverride: p.colorOverride,
      collapsed: p.collapsed,
      groupId: p.groupId,
      pinned: p.pinned,
    })),
    groups: board.groups.map((g) => ({
      id: g.id,
      tenantId: g.tenantId,
      boardId: g.boardId,
      name: g.name,
      color: g.color,
      collapsed: g.collapsed,
      positionX: g.positionX,
      positionY: g.positionY,
      width: g.width,
      height: g.height,
      zIndex: g.zIndex,
    })),
    annotations: board.annotations.map((a) => ({
      id: a.id,
      boardId: a.boardId,
      annotationType: a.annotationType as BoardAnnotation["annotationType"],
      fromProjectionId: a.fromProjectionId,
      toProjectionId: a.toProjectionId,
      label: a.label,
      color: a.color,
      style: a.style,
    })),
    simulationPlans: [],
  };
}

/**
 * Discards a simulation, marking it as discarded.
 */
export async function discardSimulation(
  simulationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await requireTenantId();

    await database.commandBoard.update({
      where: {
        tenantId_id: {
          tenantId,
          id: simulationId,
        },
      },
      data: {
        status: "archived",
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to discard simulation",
    };
  }
}

/**
 * Computes the delta between original and simulated board states.
 * Used to display a diff overlay showing what would change.
 */
export function computeBoardDelta(input: ComputeDeltaInput): BoardDelta {
  const addedProjections: BoardProjection[] = [];
  const removedProjectionIds: string[] = [];
  const modifiedProjections: BoardDelta["modifiedProjections"] = [];

  const addedGroups: BoardGroup[] = [];
  const removedGroupIds: string[] = [];

  const addedAnnotations: BoardAnnotation[] = [];
  const removedAnnotationIds: string[] = [];

  // Build maps for quick lookup
  const originalProjMap = new Map(
    input.originalProjections.map((p) => [p.entityId, p])
  );
  const simulatedProjMap = new Map(
    input.simulatedProjections.map((p) => [p.entityId, p])
  );

  const originalGroupMap = new Map(input.originalGroups.map((g) => [g.id, g]));
  const simulatedGroupMap = new Map(input.simulatedGroups.map((g) => [g.id, g]));

  const originalAnnMap = new Map(input.originalAnnotations.map((a) => [a.id, a]));
  const simulatedAnnMap = new Map(input.simulatedAnnotations.map((a) => [a.id, a]));

  // Find added and modified projections
  for (const simProj of input.simulatedProjections) {
    const origProj = originalProjMap.get(simProj.entityId);
    if (!origProj) {
      addedProjections.push(simProj);
    } else {
      // Check for modifications
      const fieldsToCheck: Array<keyof BoardProjection> = [
        "positionX",
        "positionY",
        "width",
        "height",
        "zIndex",
        "colorOverride",
        "collapsed",
        "groupId",
        "pinned",
      ];
      for (const field of fieldsToCheck) {
        if (origProj[field] !== simProj[field]) {
          modifiedProjections.push({
            id: simProj.id,
            field,
            original: origProj[field],
            simulated: simProj[field],
          });
        }
      }
    }
  }

  // Find removed projections
  for (const origProj of input.originalProjections) {
    if (!simulatedProjMap.has(origProj.entityId)) {
      removedProjectionIds.push(origProj.id);
    }
  }

  // Find added groups
  for (const simGroup of input.simulatedGroups) {
    if (!originalGroupMap.has(simGroup.id)) {
      addedGroups.push(simGroup);
    }
  }

  // Find removed groups
  for (const origGroup of input.originalGroups) {
    if (!simulatedGroupMap.has(origGroup.id)) {
      removedGroupIds.push(origGroup.id);
    }
  }

  // Find added annotations
  for (const simAnn of input.simulatedAnnotations) {
    if (!originalAnnMap.has(simAnn.id)) {
      addedAnnotations.push(simAnn);
    }
  }

  // Find removed annotations
  for (const origAnn of input.originalAnnotations) {
    if (!simulatedAnnMap.has(origAnn.id)) {
      removedAnnotationIds.push(origAnn.id);
    }
  }

  const additions =
    addedProjections.length + addedGroups.length + addedAnnotations.length;
  const removals =
    removedProjectionIds.length +
    removedGroupIds.length +
    removedAnnotationIds.length;
  const modifications = modifiedProjections.length;

  return {
    addedProjections,
    removedProjectionIds,
    modifiedProjections,
    addedGroups,
    removedGroupIds,
    addedAnnotations,
    removedAnnotationIds,
    summary: {
      additions,
      removals,
      modifications,
      totalChanges: additions + removals + modifications,
    },
  };
}

/**
 * Lists all active simulations for a source board.
 */
export async function listSimulationsForBoard(
  sourceBoardId: string
): Promise<SimulationContext[]> {
  const tenantId = await requireTenantId();

  const boards = await database.commandBoard.findMany({
    where: {
      tenantId,
      tags: {
        has: `source:${sourceBoardId}`,
      },
      status: "draft",
    },
    include: {
      projections: true,
      groups: true,
      annotations: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return boards.map((board) => ({
    id: board.id,
    tenantId: board.tenantId,
    sourceBoardId,
    simulationName: board.name.replace("[Simulation] ", ""),
    createdAt: board.createdAt,
    status: "active" as const,
    projections: board.projections.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      boardId: p.boardId,
      entityType: p.entityType as BoardProjection["entityType"],
      entityId: p.entityId,
      positionX: p.positionX,
      positionY: p.positionY,
      width: p.width,
      height: p.height,
      zIndex: p.zIndex,
      colorOverride: p.colorOverride,
      collapsed: p.collapsed,
      groupId: p.groupId,
      pinned: p.pinned,
    })),
    groups: board.groups.map((g) => ({
      id: g.id,
      tenantId: g.tenantId,
      boardId: g.boardId,
      name: g.name,
      color: g.color,
      collapsed: g.collapsed,
      positionX: g.positionX,
      positionY: g.positionY,
      width: g.width,
      height: g.height,
      zIndex: g.zIndex,
    })),
    annotations: board.annotations.map((a) => ({
      id: a.id,
      boardId: a.boardId,
      annotationType: a.annotationType as BoardAnnotation["annotationType"],
      fromProjectionId: a.fromProjectionId,
      toProjectionId: a.toProjectionId,
      label: a.label,
      color: a.color,
      style: a.style,
    })),
    simulationPlans: [],
  }));
}
