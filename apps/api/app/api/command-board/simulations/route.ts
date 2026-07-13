/**
 * Command Board Simulations API Endpoints
 *
 * GET    /api/command-board/simulations      - List simulations with pagination
 * POST   /api/command-board/simulations      - Create a new simulation (fork a board)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Uses createManifestRuntime — requires Node.js runtime (not Edge)
export const runtime = "nodejs";

import type {
  CreateSimulationRequest,
  SimulationListItem,
  SimulationStatus,
} from "../types";

interface PaginationParams {
  limit: number;
  page: number;
}

function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
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

    // Fetch count + page in parallel (independent reads, same where) —
    // collapses 2 serial round-trips into 1 batch (#23).
    const [total, boards] = await Promise.all([
      database.commandBoard.count({ where }),
      database.commandBoard.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              boardProjections: true,
              commandBoardGroups: true,
              boardAnnotations: true,
            },
          },
        },
      }),
    ]);

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
        projections_count: board._count.boardProjections,
        groups_count: board._count.commandBoardGroups,
        annotations_count: board._count.boardAnnotations,
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
    captureException(error);
    log.error("Failed to list simulations:", error);
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

    if (!(source_board_id && simulation_name)) {
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
        boardProjections: true,
        commandBoardGroups: true,
        boardAnnotations: true,
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

    // Create simulation board with metadata via governed Manifest command
    const user = await resolveCurrentUser(request);
    const cbResult = await runManifestCommandCore(
      {
        createRuntime: ({ user: u, entityName }) =>
          createManifestRuntime({
            user: { id: u.id, tenantId: u.tenantId, role: u.role },
            entityName,
          }),
      },
      {
        entity: "CommandBoard",
        command: "create",
        body: {
          id: simulationId,
          tenantId,
          name: `[Simulation] ${simulation_name}`,
          description: `Forked from board ${source_board_id}`,
          status: "draft",
          isTemplate: false,
          tags: ["simulation", `source:${source_board_id}`],
        },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
      }
    );

    if (!cbResult.ok) {
      captureException(new Error(cbResult.message));
      return NextResponse.json(
        { message: cbResult.message },
        { status: cbResult.httpStatus }
      );
    }

    const simulationBoard = cbResult.result as {
      id: string;
      createdAt: Date;
      [key: string]: unknown;
    };

    // Deep copy projections with new IDs
    const projectionCopies = sourceBoard.boardProjections.map((proj) => ({
      id: crypto.randomUUID(),
      tenantId,
      boardId: simulationId,
      entityType: proj.entityType,
      entityId: proj.entityId,
      positionX: proj.positionX,
      positionY: proj.positionY,
      width: proj.width,
      height: proj.height,
    }));

    // Deep copy groups with new IDs
    const groupCopies = sourceBoard.commandBoardGroups.map((group) => ({
      id: crypto.randomUUID(),
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
    }));

    // Deep copy annotations
    const annotationCopies = sourceBoard.boardAnnotations.map((ann) => ({
      id: crypto.randomUUID(),
      tenantId,
      boardId: simulationId,
      label: ann.label,
      positionX: ann.positionX,
      positionY: ann.positionY,
      color: ann.color,
    }));

    // Batch insert projections
    if (projectionCopies.length > 0) {
      await database.boardProjection.createMany({
        data: projectionCopies,
      });
    }

    // Batch insert groups via governed Manifest commands
    if (groupCopies.length > 0) {
      await Promise.all(
        groupCopies.map((group) =>
          runManifestCommandCore(
            {
              createRuntime: ({ user: u, entityName }) =>
                createManifestRuntime({
                  user: { id: u.id, tenantId: u.tenantId, role: u.role },
                  entityName,
                }),
            },
            {
              entity: "CommandBoardGroup",
              command: "create",
              body: group,
              user: { id: user.id, tenantId: user.tenantId, role: user.role },
            }
          )
        )
      );
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
    captureException(error);
    log.error("Failed to create simulation:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
