/**
 * Command Board Simulations API Endpoints
 *
 * GET    /api/command-board/simulations      - List simulations with pagination
 * POST   /api/command-board/simulations      - Create a new simulation (fork a board)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  CreateSimulationRequest,
  SimulationListItem,
  SimulationStatus,
} from "../types";

interface PaginationParams {
  page: number;
  limit: number;
}

function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );
  return { page, limit };
}

/**
 * GET /api/command-board/simulations - List simulations with pagination
 */
export async function GET(request: Request) {
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
    const { page, limit } = parsePaginationParams(searchParams);
    const sourceBoardId = searchParams.get("source_board_id");
    const status = searchParams.get("status") as SimulationStatus | null;

    // Build where clause - only simulation boards
    const where = {
      tenantId,
      deletedAt: null,
      tags: { has: "simulation" },
      ...(sourceBoardId && { tags: { has: `source:${sourceBoardId}` } }),
      ...(status === "active" && { status: "draft" }),
      ...(status === "applied" && { status: "active" }),
      ...(status === "discarded" && { status: "archived" }),
    };

    const total = await database.commandBoard.count({ where });

    const boards = await database.commandBoard.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            projections: true,
            groups: true,
            annotations: true,
          },
        },
      },
    });

    // Map to simulation list items
    const simulations: SimulationListItem[] = boards.map((board) => {
      const sourceTag = board.tags.find((t) => t.startsWith("source:"));
      const sourceBoardId = sourceTag ? sourceTag.replace("source:", "") : "";

      let simStatus: SimulationStatus = "active";
      if (board.status === "archived") {
        simStatus = "discarded";
      } else if (board.tags.includes("applied")) {
        simStatus = "applied";
      }

      return {
        id: board.id,
        tenant_id: board.tenantId,
        source_board_id: sourceBoardId,
        simulation_name: board.name.replace("[Simulation] ", ""),
        created_at: board.createdAt,
        status: simStatus,
        projections_count: board._count.projections,
        groups_count: board._count.groups,
        annotations_count: board._count.annotations,
      };
    });

    return NextResponse.json({
      data: simulations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to list simulations:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/command-board/simulations - Create a new simulation (fork a board)
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

    const body: CreateSimulationRequest = await request.json();
    const { source_board_id, simulation_name } = body;

    if (!source_board_id || !simulation_name) {
      return NextResponse.json(
        { message: "source_board_id and simulation_name are required" },
        { status: 400 }
      );
    }

    // Verify source board exists
    const sourceBoard = await database.commandBoard.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: source_board_id,
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

    // Create simulation ID
    const simulationId = crypto.randomUUID();

    // Create simulation board with metadata
    const simulationBoard = await database.commandBoard.create({
      data: {
        id: simulationId,
        tenantId,
        name: `[Simulation] ${simulation_name}`,
        description: `Forked from board ${source_board_id}`,
        status: "draft",
        isTemplate: false,
        tags: ["simulation", `source:${source_board_id}`],
      },
    });

    // Deep copy projections with new IDs
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
        groupId: proj.groupId,
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

    return NextResponse.json({
      success: true,
      simulation: {
        id: simulationId,
        tenant_id: tenantId,
        source_board_id,
        simulation_name,
        created_at: simulationBoard.createdAt,
        status: "active" as SimulationStatus,
        projections_count: projectionCopies.length,
        groups_count: groupCopies.length,
        annotations_count: annotationCopies.length,
      },
    });
  } catch (error) {
    console.error("Failed to create simulation:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
