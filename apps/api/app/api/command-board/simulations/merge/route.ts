/**
 * Simulation Merge API Endpoint
 *
 * POST /api/command-board/simulations/merge - Merge a simulation back to its source board
 * GET /api/command-board/simulations/merge - Check for merge conflicts
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

/** Options for merge operation */
export interface MergeOptions {
  applyRemovals?: boolean;
  forceConflicts?: boolean;
}

/** Conflict detected during merge check */
export interface MergeConflict {
  details?: Record<string, unknown>;
  entityId: string;
  message: string;
  type:
    | "projection_modified"
    | "projection_removed"
    | "group_modified"
    | "annotation_conflict";
}

/** Result of conflict detection */
export interface ConflictCheckResult {
  conflicts: MergeConflict[];
  hasConflicts: boolean;
}

/** Result of merge operation */
export interface MergeResult {
  error?: string;
  mergedChanges?: {
    projectionsAdded: number;
    projectionsRemoved: number;
    projectionsModified: number;
    groupsAdded: number;
    groupsRemoved: number;
    annotationsAdded: number;
    annotationsRemoved: number;
  };
  success: boolean;
}

/**
 * Detect merge conflicts between simulation and source board
 */
async function detectMergeConflicts(
  simulationId: string,
  tenantId: string
): Promise<ConflictCheckResult> {
  const conflicts: MergeConflict[] = [];

  // Get the simulation board
  const simulationBoard = await database.commandBoard.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: simulationId,
      },
    },
    include: {
      boardProjections: { where: { deletedAt: null } },
      commandBoardGroups: { where: { deletedAt: null } },
      boardAnnotations: { where: { deletedAt: null } },
    },
  });

  if (!simulationBoard?.tags.includes("simulation")) {
    return {
      hasConflicts: true,
      conflicts: [
        {
          type: "projection_modified",
          entityId: simulationId,
          message: "Simulation not found",
        },
      ],
    };
  }

  // Extract source board ID
  const sourceTag = simulationBoard.tags.find((t) => t.startsWith("source:"));
  if (!sourceTag) {
    return {
      hasConflicts: true,
      conflicts: [
        {
          type: "projection_modified",
          entityId: simulationId,
          message: "Invalid simulation: no source board reference",
        },
      ],
    };
  }
  const sourceBoardId = sourceTag.replace("source:", "");

  // Get the source board
  const sourceBoard = await database.commandBoard.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: sourceBoardId,
      },
    },
    include: {
      boardProjections: { where: { deletedAt: null } },
      commandBoardGroups: { where: { deletedAt: null } },
      boardAnnotations: { where: { deletedAt: null } },
    },
  });

  if (!sourceBoard) {
    return {
      hasConflicts: true,
      conflicts: [
        {
          type: "projection_modified",
          entityId: sourceBoardId,
          message: "Source board not found",
        },
      ],
    };
  }

  // Check for projections that were modified in source since simulation was created
  const sourceProjEntityIds = new Set(
    sourceBoard.boardProjections.map((p) => p.entityId)
  );

  // Check for projections removed from source that still exist in simulation
  for (const simProj of simulationBoard.boardProjections) {
    if (!sourceProjEntityIds.has(simProj.entityId)) {
      conflicts.push({
        type: "projection_removed",
        entityId: simProj.entityId,
        message: `Projection for entity ${simProj.entityId} was removed from source board`,
        details: { projectionId: simProj.id },
      });
    }
  }

  // Check for projections modified in source after simulation was created
  for (const sourceProj of sourceBoard.boardProjections) {
    const simProj = simulationBoard.boardProjections.find(
      (p) => p.entityId === sourceProj.entityId
    );
    if (simProj && sourceProj.updatedAt > simulationBoard.createdAt) {
      conflicts.push({
        type: "projection_modified",
        entityId: sourceProj.entityId,
        message: `Projection for entity ${sourceProj.entityId} was modified in source board after simulation was created`,
        details: {
          sourceProjectionId: sourceProj.id,
          simulationProjectionId: simProj.id,
          sourceUpdatedAt: sourceProj.updatedAt,
          simulationCreatedAt: simulationBoard.createdAt,
        },
      });
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Merge simulation changes back to source board
 */
async function mergeSimulationToSource(
  simulationId: string,
  tenantId: string,
  options?: MergeOptions
): Promise<MergeResult> {
  try {
    // Get the simulation board
    const simulationBoard = await database.commandBoard.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: simulationId,
        },
      },
      include: {
        boardProjections: { where: { deletedAt: null } },
        commandBoardGroups: { where: { deletedAt: null } },
        boardAnnotations: { where: { deletedAt: null } },
      },
    });

    if (!simulationBoard?.tags.includes("simulation")) {
      return { success: false, error: "Simulation not found" };
    }

    // Check if already applied
    if (simulationBoard.tags.includes("applied")) {
      return { success: false, error: "Simulation already applied" };
    }

    // Extract source board ID
    const sourceTag = simulationBoard.tags.find((t) => t.startsWith("source:"));
    if (!sourceTag) {
      return {
        success: false,
        error: "Invalid simulation: no source board reference",
      };
    }
    const sourceBoardId = sourceTag.replace("source:", "");

    // Get the source board
    const sourceBoard = await database.commandBoard.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: sourceBoardId,
        },
      },
      include: {
        boardProjections: { where: { deletedAt: null } },
        commandBoardGroups: { where: { deletedAt: null } },
        boardAnnotations: { where: { deletedAt: null } },
      },
    });

    if (!sourceBoard) {
      return { success: false, error: "Source board not found" };
    }

    // Build maps for comparison
    const sourceProjMap = new Map(
      sourceBoard.boardProjections.map((p) => [p.entityId, p])
    );
    const simProjMap = new Map(
      simulationBoard.boardProjections.map((p) => [p.entityId, p])
    );
    const sourceGroupMap = new Map(
      sourceBoard.commandBoardGroups.map((g) => [g.id, g])
    );
    const simGroupMap = new Map(
      simulationBoard.commandBoardGroups.map((g) => [g.id, g])
    );

    // Track changes — computed from the pre-loaded boards, then applied below.
    const sourceAnnMap = new Map(
      sourceBoard.boardAnnotations.map((a) => [a.id, a])
    );
    const simAnnMap = new Map(
      simulationBoard.boardAnnotations.map((a) => [a.id, a])
    );

    const removedProjections = options?.applyRemovals
      ? sourceBoard.boardProjections.filter((p) => !simProjMap.has(p.entityId))
      : [];
    const addedProjections = simulationBoard.boardProjections.filter(
      (p) => !sourceProjMap.has(p.entityId)
    );
    const PROJECTION_FIELDS = [
      "positionX",
      "positionY",
      "width",
      "height",
    ] as const;
    // Pair each modified sim projection with its source row.
    const modifiedProjections = simulationBoard.boardProjections.flatMap(
      (p) => {
        const source = sourceProjMap.get(p.entityId);
        if (!source) {
          return [];
        }
        return PROJECTION_FIELDS.some((f) => source[f] !== p[f])
          ? [{ sim: p, source }]
          : [];
      }
    );
    const addedGroups = simulationBoard.commandBoardGroups.filter(
      (g) => !sourceGroupMap.has(g.id)
    );
    const removedGroups = options?.applyRemovals
      ? sourceBoard.commandBoardGroups.filter((g) => !simGroupMap.has(g.id))
      : [];
    const addedAnnotations = simulationBoard.boardAnnotations.filter(
      (a) => !sourceAnnMap.has(a.id)
    );
    const removedAnnotations = options?.applyRemovals
      ? sourceBoard.boardAnnotations.filter((a) => !simAnnMap.has(a.id))
      : [];

    const projectionsRemoved = removedProjections.length;
    const projectionsAdded = addedProjections.length;
    const projectionsModified = modifiedProjections.length;
    const groupsAdded = addedGroups.length;
    const groupsRemoved = removedGroups.length;
    const annotationsAdded = addedAnnotations.length;
    const annotationsRemoved = removedAnnotations.length;

    // Apply changes as ONE concurrent write wave. Every op below targets a
    // distinct composite-PK row (or a disjoint table) and sets fixed field
    // values taken only from the in-memory boards above — no cross-row deps,
    // no FK ordering — so nothing in the wave depends on another op's result.
    // Bulk add/remove groups use createMany/updateMany (one query each); the
    // per-row modifications use one update per distinct source row. Same
    // tx + Promise.all pattern as simulations/[id]/apply and
    // inventory/purchase-orders/[id]/complete.
    await database.$transaction(async (tx) => {
      const now = new Date();
      await Promise.all([
        removedProjections.length
          ? tx.boardProjection.updateMany({
              where: {
                id: { in: removedProjections.map((p) => p.id) },
                tenantId,
                boardId: sourceBoardId,
              },
              data: { deletedAt: now },
            })
          : null,
        addedProjections.length
          ? tx.boardProjection.createMany({
              data: addedProjections.map((p) => ({
                id: crypto.randomUUID(),
                tenantId,
                boardId: sourceBoardId,
                entityType: p.entityType,
                entityId: p.entityId,
                positionX: p.positionX,
                positionY: p.positionY,
                width: p.width,
                height: p.height,
              })),
            })
          : null,
        ...modifiedProjections.map(({ sim, source }) =>
          tx.boardProjection.update({
            where: { tenantId_id: { tenantId, id: source.id } },
            data: {
              positionX: sim.positionX,
              positionY: sim.positionY,
              width: sim.width,
              height: sim.height,
            },
          })
        ),
        addedGroups.length
          ? tx.commandBoardGroup.createMany({
              data: addedGroups.map((g) => ({
                id: crypto.randomUUID(),
                tenantId,
                boardId: sourceBoardId,
                name: g.name,
                color: g.color,
                collapsed: g.collapsed,
                positionX: g.positionX,
                positionY: g.positionY,
                width: g.width,
                height: g.height,
                zIndex: g.zIndex,
              })),
            })
          : null,
        removedGroups.length
          ? tx.commandBoardGroup.updateMany({
              where: {
                id: {
                  in: removedGroups.map((g) => g.id),
                },
                tenantId,
                boardId: sourceBoardId,
              },
              data: { deletedAt: now },
            })
          : null,
        addedAnnotations.length
          ? tx.boardAnnotation.createMany({
              data: addedAnnotations.map((a) => ({
                id: crypto.randomUUID(),
                tenantId,
                boardId: sourceBoardId,
                label: a.label,
                color: a.color,
              })),
            })
          : null,
        removedAnnotations.length
          ? tx.boardAnnotation.updateMany({
              where: {
                id: {
                  in: removedAnnotations.map((a) => a.id),
                },
                tenantId,
                boardId: sourceBoardId,
              },
              data: { deletedAt: now },
            })
          : null,
        // Mark simulation applied + bump source board updatedAt (distinct rows).
        tx.commandBoard.update({
          where: { tenantId_id: { tenantId, id: simulationId } },
          data: {
            tags: [
              ...simulationBoard.tags.filter((t) => t !== "applied"),
              "applied",
            ],
            status: "archived",
          },
        }),
        tx.commandBoard.update({
          where: { tenantId_id: { tenantId, id: sourceBoardId } },
          data: { updatedAt: now },
        }),
      ]);
    });

    return {
      success: true,
      mergedChanges: {
        projectionsAdded,
        projectionsRemoved,
        projectionsModified,
        groupsAdded,
        groupsRemoved,
        annotationsAdded,
        annotationsRemoved,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to merge simulation",
    };
  }
}

/**
 * POST /api/command-board/simulations/merge - Merge a simulation back to source
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { simulationId, options } = body as {
      simulationId: string;
      options?: MergeOptions;
    };

    if (!simulationId) {
      return NextResponse.json(
        { message: "Simulation ID is required" },
        { status: 400 }
      );
    }

    // First check for conflicts
    const conflictCheck = await detectMergeConflicts(simulationId, tenantId);

    // If there are conflicts and we're not forcing, return them
    if (conflictCheck.hasConflicts && options?.forceConflicts !== true) {
      return NextResponse.json({
        success: false,
        hasConflicts: true,
        conflicts: conflictCheck.conflicts,
        message:
          "Merge conflicts detected. Please resolve them before merging or use forceConflicts option.",
      });
    }

    // Perform the merge
    const result = await mergeSimulationToSource(
      simulationId,
      tenantId,
      options
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        mergedChanges: result.mergedChanges,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: result.error,
      },
      { status: 400 }
    );
  } catch (error) {
    captureException(error);
    log.error(
      "Failed to merge simulation:",
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/command-board/simulations/merge?simulationId=xxx - Check for merge conflicts
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const simulationId = searchParams.get("simulationId");

    if (!simulationId) {
      return NextResponse.json(
        { message: "Simulation ID is required" },
        { status: 400 }
      );
    }

    const result = await detectMergeConflicts(simulationId, tenantId);

    return NextResponse.json(result);
  } catch (error) {
    captureException(error);
    log.error(
      "Failed to check merge conflicts:",
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        hasConflicts: false,
        conflicts: [],
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
