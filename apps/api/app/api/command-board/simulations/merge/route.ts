/**
 * Simulation Merge API Endpoint
 *
 * POST /api/command-board/simulations/merge - Merge a simulation back to its source board
 * GET /api/command-board/simulations/merge - Check for merge conflicts
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
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
  type: "projection_modified" | "projection_removed" | "group_modified" | "annotation_conflict";
  entityId: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Result of conflict detection */
export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: MergeConflict[];
}

/** Result of merge operation */
export interface MergeResult {
  success: boolean;
  mergedChanges?: {
    projectionsAdded: number;
    projectionsRemoved: number;
    projectionsModified: number;
    groupsAdded: number;
    groupsRemoved: number;
    annotationsAdded: number;
    annotationsRemoved: number;
  };
  error?: string;
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
      projections: { where: { deletedAt: null } },
      groups: { where: { deletedAt: null } },
      annotations: { where: { deletedAt: null } },
    },
  });

  if (!simulationBoard || !simulationBoard.tags.includes("simulation")) {
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
      projections: { where: { deletedAt: null } },
      groups: { where: { deletedAt: null } },
      annotations: { where: { deletedAt: null } },
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
  const simulationProjEntityIds = new Set(
    simulationBoard.projections.map((p) => p.entityId)
  );
  const sourceProjEntityIds = new Set(
    sourceBoard.projections.map((p) => p.entityId)
  );

  // Check for projections removed from source that still exist in simulation
  for (const simProj of simulationBoard.projections) {
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
  for (const sourceProj of sourceBoard.projections) {
    const simProj = simulationBoard.projections.find(
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
        projections: { where: { deletedAt: null } },
        groups: { where: { deletedAt: null } },
        annotations: { where: { deletedAt: null } },
      },
    });

    if (!simulationBoard || !simulationBoard.tags.includes("simulation")) {
      return { success: false, error: "Simulation not found" };
    }

    // Check if already applied
    if (simulationBoard.tags.includes("applied")) {
      return { success: false, error: "Simulation already applied" };
    }

    // Extract source board ID
    const sourceTag = simulationBoard.tags.find((t) => t.startsWith("source:"));
    if (!sourceTag) {
      return { success: false, error: "Invalid simulation: no source board reference" };
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
        projections: { where: { deletedAt: null } },
        groups: { where: { deletedAt: null } },
        annotations: { where: { deletedAt: null } },
      },
    });

    if (!sourceBoard) {
      return { success: false, error: "Source board not found" };
    }

    // Build maps for comparison
    const sourceProjMap = new Map(sourceBoard.projections.map((p) => [p.entityId, p]));
    const simProjMap = new Map(simulationBoard.projections.map((p) => [p.entityId, p]));
    const sourceGroupMap = new Map(sourceBoard.groups.map((g) => [g.id, g]));
    const simGroupMap = new Map(simulationBoard.groups.map((g) => [g.id, g]));

    // Track changes
    let projectionsAdded = 0;
    let projectionsRemoved = 0;
    let projectionsModified = 0;
    let groupsAdded = 0;
    let groupsRemoved = 0;
    let annotationsAdded = 0;
    let annotationsRemoved = 0;

    // Apply changes in a transaction
    await database.$transaction(async (tx) => {
      // 1. Handle removed projections (if applyRemovals is true)
      if (options?.applyRemovals) {
        for (const sourceProj of sourceBoard.projections) {
          if (!simProjMap.has(sourceProj.entityId)) {
            await tx.boardProjection.update({
              where: { tenantId_id: { tenantId, id: sourceProj.id } },
              data: { deletedAt: new Date() },
            });
            projectionsRemoved++;
          }
        }
      }

      // 2. Handle added projections
      for (const simProj of simulationBoard.projections) {
        if (!sourceProjMap.has(simProj.entityId)) {
          await tx.boardProjection.create({
            data: {
              id: crypto.randomUUID(),
              tenantId,
              boardId: sourceBoardId,
              entityType: simProj.entityType,
              entityId: simProj.entityId,
              positionX: simProj.positionX,
              positionY: simProj.positionY,
              width: simProj.width,
              height: simProj.height,
              zIndex: simProj.zIndex,
              colorOverride: simProj.colorOverride,
              collapsed: simProj.collapsed,
              groupId: simProj.groupId,
              pinned: simProj.pinned,
            },
          });
          projectionsAdded++;
        }
      }

      // 3. Handle modified projections
      for (const simProj of simulationBoard.projections) {
        const sourceProj = sourceProjMap.get(simProj.entityId);
        if (sourceProj) {
          const fieldsToCheck = [
            "positionX",
            "positionY",
            "width",
            "height",
            "zIndex",
            "colorOverride",
            "collapsed",
            "groupId",
            "pinned",
          ] as const;
          
          let hasChanges = false;
          for (const field of fieldsToCheck) {
            if (sourceProj[field] !== simProj[field]) {
              hasChanges = true;
              break;
            }
          }
          
          if (hasChanges) {
            await tx.boardProjection.update({
              where: { tenantId_id: { tenantId, id: sourceProj.id } },
              data: {
                positionX: simProj.positionX,
                positionY: simProj.positionY,
                width: simProj.width,
                height: simProj.height,
                zIndex: simProj.zIndex,
                colorOverride: simProj.colorOverride,
                collapsed: simProj.collapsed,
                groupId: simProj.groupId,
                pinned: simProj.pinned,
              },
            });
            projectionsModified++;
          }
        }
      }

      // 4. Handle added groups
      for (const simGroup of simulationBoard.groups) {
        if (!sourceGroupMap.has(simGroup.id)) {
          await tx.commandBoardGroup.create({
            data: {
              id: crypto.randomUUID(),
              tenantId,
              boardId: sourceBoardId,
              name: simGroup.name,
              color: simGroup.color,
              collapsed: simGroup.collapsed,
              positionX: simGroup.positionX,
              positionY: simGroup.positionY,
              width: simGroup.width,
              height: simGroup.height,
              zIndex: simGroup.zIndex,
            },
          });
          groupsAdded++;
        }
      }

      // 5. Handle removed groups
      if (options?.applyRemovals) {
        for (const sourceGroup of sourceBoard.groups) {
          if (!simGroupMap.has(sourceGroup.id)) {
            await tx.commandBoardGroup.update({
              where: { tenantId_id: { tenantId, id: sourceGroup.id } },
              data: { deletedAt: new Date() },
            });
            groupsRemoved++;
          }
        }
      }

      // 6. Handle annotations
      const sourceAnnMap = new Map(sourceBoard.annotations.map((a) => [a.id, a]));
      const simAnnMap = new Map(simulationBoard.annotations.map((a) => [a.id, a]));

      // Add new annotations
      for (const simAnn of simulationBoard.annotations) {
        if (!sourceAnnMap.has(simAnn.id)) {
          await tx.boardAnnotation.create({
            data: {
              id: crypto.randomUUID(),
              tenantId,
              boardId: sourceBoardId,
              annotationType: simAnn.annotationType,
              fromProjectionId: simAnn.fromProjectionId,
              toProjectionId: simAnn.toProjectionId,
              label: simAnn.label,
              color: simAnn.color,
              style: simAnn.style,
            },
          });
          annotationsAdded++;
        }
      }

      // Remove deleted annotations
      if (options?.applyRemovals) {
        for (const sourceAnn of sourceBoard.annotations) {
          if (!simAnnMap.has(sourceAnn.id)) {
            await tx.boardAnnotation.update({
              where: { tenantId_id: { tenantId, id: sourceAnn.id } },
              data: { deletedAt: new Date() },
            });
            annotationsRemoved++;
          }
        }
      }

      // 7. Mark simulation as applied
      await tx.commandBoard.update({
        where: {
          tenantId_id: {
            tenantId,
            id: simulationId,
          },
        },
        data: {
          tags: [...simulationBoard.tags.filter((t) => t !== "applied"), "applied"],
          status: "archived",
        },
      });

      // 8. Update source board's updatedAt
      await tx.commandBoard.update({
        where: {
          tenantId_id: {
            tenantId,
            id: sourceBoardId,
          },
        },
        data: { updatedAt: new Date() },
      });
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
      error: error instanceof Error ? error.message : "Failed to merge simulation",
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
    const result = await mergeSimulationToSource(simulationId, tenantId, options);

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
    console.error(
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
    console.error(
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
