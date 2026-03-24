/**
 * Apply Simulation API Endpoint
 *
 * POST /api/command-board/simulations/[id]/apply - Apply simulation changes to source board
 *
 * This merges the simulation changes back to the live source board:
 * - Added projections/groups/annotations are copied to source
 * - Removed items are soft-deleted from source
 * - Modified items are updated on source
 */

import { auth } from "@repo/auth/server";
import { database, EntityType } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  BoardDelta,
  BoardProjection,
  BoardGroup,
  BoardAnnotation,
  EntityType as ApiEntityType,
} from "../../../types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Compute the delta between original and simulated board states
 */
function computeBoardDelta(
  originalProjections: BoardProjection[],
  simulatedProjections: BoardProjection[],
  originalGroups: BoardGroup[],
  simulatedGroups: BoardGroup[],
  originalAnnotations: BoardAnnotation[],
  simulatedAnnotations: BoardAnnotation[]
): BoardDelta {
  const addedProjections: BoardProjection[] = [];
  const removedProjectionIds: string[] = [];
  const modifiedProjections: BoardDelta["modified_projections"] = [];

  const addedGroups: BoardGroup[] = [];
  const removedGroupIds: string[] = [];

  const addedAnnotations: BoardAnnotation[] = [];
  const removedAnnotationIds: string[] = [];

  // Build maps for quick lookup by entity_id
  const originalProjMap = new Map(originalProjections.map((p) => [p.entity_id, p]));
  const simulatedProjMap = new Map(simulatedProjections.map((p) => [p.entity_id, p]));

  const originalGroupMap = new Map(originalGroups.map((g) => [g.id, g]));
  const simulatedGroupMap = new Map(simulatedGroups.map((g) => [g.id, g]));

  const originalAnnMap = new Map(originalAnnotations.map((a) => [a.id, a]));
  const simulatedAnnMap = new Map(simulatedAnnotations.map((a) => [a.id, a]));

  // Find added and modified projections
  for (const simProj of simulatedProjections) {
    const origProj = originalProjMap.get(simProj.entity_id);
    if (origProj) {
      // Check for modifications
      const fieldsToCheck: Array<keyof BoardProjection> = [
        "position_x",
        "position_y",
        "width",
        "height",
        "z_index",
        "color_override",
        "collapsed",
        "group_id",
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
    } else {
      addedProjections.push(simProj);
    }
  }

  // Find removed projections
  for (const origProj of originalProjections) {
    if (!simulatedProjMap.has(origProj.entity_id)) {
      removedProjectionIds.push(origProj.id);
    }
  }

  // Find added groups
  for (const simGroup of simulatedGroups) {
    if (!originalGroupMap.has(simGroup.id)) {
      addedGroups.push(simGroup);
    }
  }

  // Find removed groups
  for (const origGroup of originalGroups) {
    if (!simulatedGroupMap.has(origGroup.id)) {
      removedGroupIds.push(origGroup.id);
    }
  }

  // Find added annotations
  for (const simAnn of simulatedAnnotations) {
    if (!originalAnnMap.has(simAnn.id)) {
      addedAnnotations.push(simAnn);
    }
  }

  // Find removed annotations
  for (const origAnn of originalAnnotations) {
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
    added_projections: addedProjections,
    removed_projection_ids: removedProjectionIds,
    modified_projections: modifiedProjections,
    added_groups: addedGroups,
    removed_group_ids: removedGroupIds,
    added_annotations: addedAnnotations,
    removed_annotation_ids: removedAnnotationIds,
    summary: {
      additions,
      removals,
      modifications,
      total_changes: additions + removals + modifications,
    },
  };
}

/**
 * POST /api/command-board/simulations/[id]/apply - Apply simulation changes to source board
 */
export async function POST(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { message: "Simulation ID is required" },
        { status: 400 }
      );
    }

    // Get the simulation board
    const simulationBoard = await database.commandBoard.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      include: {
        projections: true,
        groups: true,
        annotations: true,
      },
    });

    if (!simulationBoard || !simulationBoard.tags.includes("simulation")) {
      return NextResponse.json(
        { message: "Simulation not found" },
        { status: 404 }
      );
    }

    // Check if already applied
    if (simulationBoard.tags.includes("applied")) {
      return NextResponse.json(
        { message: "Simulation already applied" },
        { status: 400 }
      );
    }

    // Extract source board ID
    const sourceTag = simulationBoard.tags.find((t) => t.startsWith("source:"));
    if (!sourceTag) {
      return NextResponse.json(
        { message: "Invalid simulation: no source board reference" },
        { status: 400 }
      );
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
        projections: true,
        groups: true,
        annotations: true,
      },
    });

    if (!sourceBoard) {
      return NextResponse.json(
        { message: "Source board not found" },
        { status: 404 }
      );
    }

    // Map to API types
    const originalProjections: BoardProjection[] = sourceBoard.projections.map((p) => ({
      id: p.id,
      tenant_id: p.tenantId,
      board_id: p.boardId,
      entity_type: p.entityType as ApiEntityType,
      entity_id: p.entityId,
      position_x: p.positionX,
      position_y: p.positionY,
      width: p.width,
      height: p.height,
      z_index: p.zIndex,
      color_override: p.colorOverride,
      collapsed: p.collapsed,
      group_id: p.groupId,
      pinned: p.pinned,
    }));

    const simulatedProjections: BoardProjection[] = simulationBoard.projections.map((p) => ({
      id: p.id,
      tenant_id: p.tenantId,
      board_id: p.boardId,
      entity_type: p.entityType as ApiEntityType,
      entity_id: p.entityId,
      position_x: p.positionX,
      position_y: p.positionY,
      width: p.width,
      height: p.height,
      z_index: p.zIndex,
      color_override: p.colorOverride,
      collapsed: p.collapsed,
      group_id: p.groupId,
      pinned: p.pinned,
    }));

    const originalGroups: BoardGroup[] = sourceBoard.groups.map((g) => ({
      id: g.id,
      tenant_id: g.tenantId,
      board_id: g.boardId,
      name: g.name,
      color: g.color,
      collapsed: g.collapsed,
      position_x: g.positionX,
      position_y: g.positionY,
      width: g.width,
      height: g.height,
      z_index: g.zIndex,
    }));

    const simulatedGroups: BoardGroup[] = simulationBoard.groups.map((g) => ({
      id: g.id,
      tenant_id: g.tenantId,
      board_id: g.boardId,
      name: g.name,
      color: g.color,
      collapsed: g.collapsed,
      position_x: g.positionX,
      position_y: g.positionY,
      width: g.width,
      height: g.height,
      z_index: g.zIndex,
    }));

    const originalAnnotations: BoardAnnotation[] = sourceBoard.annotations.map((a) => ({
      id: a.id,
      board_id: a.boardId,
      annotation_type: a.annotationType,
      from_projection_id: a.fromProjectionId,
      to_projection_id: a.toProjectionId,
      label: a.label,
      color: a.color,
      style: a.style,
    }));

    const simulatedAnnotations: BoardAnnotation[] = simulationBoard.annotations.map((a) => ({
      id: a.id,
      board_id: a.boardId,
      annotation_type: a.annotationType,
      from_projection_id: a.fromProjectionId,
      to_projection_id: a.toProjectionId,
      label: a.label,
      color: a.color,
      style: a.style,
    }));

    // Compute delta
    const delta = computeBoardDelta(
      originalProjections,
      simulatedProjections,
      originalGroups,
      simulatedGroups,
      originalAnnotations,
      simulatedAnnotations
    );

    // Optional: Check for force flag in body
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    // Apply changes in a transaction
    await database.$transaction(async (tx) => {
      // 1. Remove deleted projections
      if (delta.removed_projection_ids.length > 0) {
        await tx.boardProjection.updateMany({
          where: {
            id: { in: delta.removed_projection_ids },
            boardId: sourceBoardId,
          },
          data: { deletedAt: new Date() },
        });
      }

      // 2. Remove deleted groups
      if (delta.removed_group_ids.length > 0) {
        await tx.commandBoardGroup.updateMany({
          where: {
            id: { in: delta.removed_group_ids },
            boardId: sourceBoardId,
          },
          data: { deletedAt: new Date() },
        });
      }

      // 3. Remove deleted annotations
      if (delta.removed_annotation_ids.length > 0) {
        await tx.boardAnnotation.updateMany({
          where: {
            id: { in: delta.removed_annotation_ids },
            boardId: sourceBoardId,
          },
          data: { deletedAt: new Date() },
        });
      }

      // 4. Add new groups (must be before projections that reference them)
      if (delta.added_groups.length > 0) {
        await tx.commandBoardGroup.createMany({
          data: delta.added_groups.map((g: BoardGroup) => ({
            id: crypto.randomUUID(),
            tenantId,
            boardId: sourceBoardId,
            name: g.name,
            color: g.color,
            collapsed: g.collapsed,
            positionX: g.position_x,
            positionY: g.position_y,
            width: g.width,
            height: g.height,
            zIndex: g.z_index,
          })),
        });
      }

      // 5. Add new projections
      if (delta.added_projections.length > 0) {
        await tx.boardProjection.createMany({
          data: delta.added_projections.map((p: BoardProjection) => ({
            id: crypto.randomUUID(),
            tenantId,
            boardId: sourceBoardId,
            entityType: p.entity_type as EntityType,
            entityId: p.entity_id,
            positionX: p.position_x,
            positionY: p.position_y,
            width: p.width,
            height: p.height,
            zIndex: p.z_index,
            colorOverride: p.color_override,
            collapsed: p.collapsed,
            groupId: p.group_id,
            pinned: p.pinned,
          })),
        });
      }

      // 6. Add new annotations
      if (delta.added_annotations.length > 0) {
        await tx.boardAnnotation.createMany({
          data: delta.added_annotations.map((a: BoardAnnotation) => ({
            id: crypto.randomUUID(),
            tenantId,
            boardId: sourceBoardId,
            annotationType: a.annotation_type,
            fromProjectionId: a.from_projection_id,
            toProjectionId: a.to_projection_id,
            label: a.label,
            color: a.color,
            style: a.style,
          })),
        });
      }

      // 7. Apply modifications to projections
      for (const mod of delta.modified_projections) {
        // Find the source projection by entity_id
        const simProj = simulatedProjections.find((p) => p.id === mod.id);
        if (!simProj) continue;

        const sourceProj = originalProjections.find((p) => p.entity_id === simProj.entity_id);
        if (!sourceProj) continue;

        // Map field names
        const fieldMapping: Record<string, string> = {
          position_x: "positionX",
          position_y: "positionY",
          z_index: "zIndex",
          color_override: "colorOverride",
          group_id: "groupId",
        };

        const dbField = fieldMapping[mod.field] || mod.field;
        await tx.boardProjection.update({
          where: {
            tenantId_id: {
              tenantId,
              id: sourceProj.id,
            },
          },
          data: { [dbField]: mod.simulated },
        });
      }

      // 8. Mark simulation as applied
      await tx.commandBoard.update({
        where: {
          tenantId_id: {
            tenantId,
            id,
          },
        },
        data: {
          tags: [...simulationBoard.tags.filter((t) => t !== "applied"), "applied"],
          status: "archived",
        },
      });

      // 9. Update source board's updatedAt
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

    return NextResponse.json({
      success: true,
      message: "Simulation applied successfully",
      delta: delta.summary,
    });
  } catch (error) {
    console.error("Failed to apply simulation:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
