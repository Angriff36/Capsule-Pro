/**
 * Individual Simulation API Endpoints
 *
 * GET    /api/command-board/simulations/[id]  - Get a single simulation with full context
 * DELETE /api/command-board/simulations/[id]  - Delete a simulation
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  SimulationContext,
  SimulationStatus,
  BoardProjection,
  BoardGroup,
  BoardAnnotation,
} from "../../types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/command-board/simulations/[id] - Get a single simulation with full context
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

    const board = await database.commandBoard.findUnique({
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

    if (!board || !board.tags.includes("simulation")) {
      return NextResponse.json(
        { message: "Simulation not found" },
        { status: 404 }
      );
    }

    // Extract source board ID from tags
    const sourceTag = board.tags.find((t) => t.startsWith("source:"));
    const sourceBoardId = sourceTag ? sourceTag.replace("source:", "") : "";

    // Determine simulation status
    let status: SimulationStatus = "active";
    if (board.status === "archived") {
      status = "discarded";
    } else if (board.tags.includes("applied")) {
      status = "applied";
    }

    // Map projections
    const projections: BoardProjection[] = board.projections.map((p) => ({
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

    // Map groups
    const groups: BoardGroup[] = board.groups.map((g) => ({
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

    // Map annotations
    const annotations: BoardAnnotation[] = board.annotations.map((a) => ({
      id: a.id,
      board_id: a.boardId,
      annotation_type: a.annotationType,
      from_projection_id: a.fromProjectionId,
      to_projection_id: a.toProjectionId,
      label: a.label,
      color: a.color,
      style: a.style,
    }));

    const simulationContext: SimulationContext = {
      id: board.id,
      tenant_id: board.tenantId,
      source_board_id: sourceBoardId,
      simulation_name: board.name.replace("[Simulation] ", ""),
      created_at: board.createdAt,
      status,
      projections,
      groups,
      annotations,
    };

    return NextResponse.json(simulationContext);
  } catch (error) {
    console.error(
      "Failed to get simulation:",
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/command-board/simulations/[id] - Delete a simulation
 */
export async function DELETE(_request: Request, context: RouteContext) {
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

    // Verify it's a simulation board
    const board = await database.commandBoard.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
    });

    if (!board || !board.tags.includes("simulation")) {
      return NextResponse.json(
        { message: "Simulation not found" },
        { status: 404 }
      );
    }

    // Soft delete the simulation board
    await database.commandBoard.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete simulation:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
