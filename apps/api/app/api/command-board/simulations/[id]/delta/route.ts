/**
 * Simulation Delta API Endpoint
 *
 * GET /api/command-board/simulations/[id]/delta - Get the delta between simulation and source
 *
 * This computes and returns what would change if the simulation were applied.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { BoardDelta, BoardProjection, BoardGroup, BoardAnnotation } from "../../../types";

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
 * GET /api/command-board/simulations/[id]/delta - Get the delta between simulation and source
 */
export async function GET(_request: Request, context: RouteContext) {
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
        projections: { where: { deletedAt: null } },
        groups: { where: { deletedAt: null } },
        annotations: { where: { deletedAt: null } },
      },
    });

    if (!simulationBoard || !simulationBoard.tags.includes("simulation")) {
      return NextResponse.json(
        { message: "Simulation not found" },
        { status: 404 }
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
        projections: { where: { deletedAt: null } },
        groups: { where: { deletedAt: null } },
        annotations: { where: { deletedAt: null } },
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
      entity_type: p.entityType,
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
      entity_type: p.entityType,
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

    return NextResponse.json({
      simulation_id: id,
      source_board_id: sourceBoardId,
      delta,
    });
  } catch (error) {
    console.error("Failed to compute simulation delta:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
