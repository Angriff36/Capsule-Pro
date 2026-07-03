/**
 * Individual Simulation API Endpoints
 *
 * GET    /api/command-board/simulations/[id]  - Get a single simulation with full context
 * DELETE /api/command-board/simulations/[id]  - Delete a simulation
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import type {
  BoardAnnotation,
  BoardGroup,
  BoardProjection,
  EntityType,
  SimulationContext,
  SimulationStatus,
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

    const board = await database.commandBoard.findFirst({
      where: {
        tenantId,
        id,
      },
      include: {
        boardProjections: true,
        commandBoardGroups: true,
        boardAnnotations: true,
      },
    });

    if (!(board?.tags.includes("simulation"))) {
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
    const projections: BoardProjection[] = board.boardProjections.map((p) => ({
      id: p.id,
      tenant_id: p.tenantId,
      board_id: p.boardId,
      entity_type: p.entityType as EntityType,
      entity_id: p.entityId,
      position_x: p.positionX,
      position_y: p.positionY,
      width: p.width,
      height: p.height,
      // Not stored in schema; defaults for API compatibility
      z_index: 0,
      color_override: null,
      collapsed: false,
      group_id: null,
      pinned: false,
    }));

    // Map groups
    const groups: BoardGroup[] = board.commandBoardGroups.map((g) => ({
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
    const annotations: BoardAnnotation[] = board.boardAnnotations.map((a) => ({
      id: a.id,
      board_id: a.boardId,
      // Not stored in schema; defaults for API compatibility
      annotation_type: "label",
      from_projection_id: null,
      to_projection_id: null,
      label: a.label,
      color: a.color,
      style: null,
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
    captureException(error);
    log.error(
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
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);

  // Pre-validate: verify it's a simulation board
  const board = await database.commandBoard.findFirst({
    where: {
      tenantId: user.tenantId,
      id,
    },
  });

  if (!(board?.tags?.includes("simulation"))) {
    return NextResponse.json(
      { message: "Simulation not found" },
      { status: 404 }
    );
  }

  return runManifestCommand({
    entity: "CommandBoard",
    command: "deactivate",
    body: {
      id,
      tenantId: user.tenantId,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
