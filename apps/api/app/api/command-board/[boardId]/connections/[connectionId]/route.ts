/**
 * Command Board Connection API Endpoints
 *
 * GET    /api/command-board/[boardId]/connections/[connectionId]  - Get a single connection
 * PUT    /api/command-board/[boardId]/connections/[connectionId]  - Update a connection
 * DELETE /api/command-board/[boardId]/connections/[connectionId]  - Delete a connection
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { UpdateConnectionRequest } from "../../../types";
import { validateUpdateConnectionRequest } from "../validation";

interface RouteContext {
  params: Promise<{ boardId: string; connectionId: string }>;
}

const CONNECTION_SELECT = {
  id: true,
  tenantId: true,
  boardId: true,
  fromCardId: true,
  toCardId: true,
  relationshipType: true,
  label: true,
  visible: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Validate board ID and connection ID parameters
 */
function validateIds(boardId: string, connectionId: string): void {
  if (!boardId || typeof boardId !== "string") {
    throw new InvariantError("Invalid board ID");
  }
  if (!connectionId || typeof connectionId !== "string") {
    throw new InvariantError("Invalid connection ID");
  }
}

/**
 * GET /api/command-board/[boardId]/connections/[connectionId]
 * Get a single connection by ID
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, connectionId } = await context.params;

    validateIds(boardId, connectionId);

    const connection = await database.commandBoardConnection.findFirst({
      where: {
        AND: [
          { tenantId },
          { boardId },
          { id: connectionId },
          { deletedAt: null },
        ],
      },
      select: CONNECTION_SELECT,
    });

    if (!connection) {
      return NextResponse.json(
        { message: "Connection not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: connection });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error getting connection:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/command-board/[boardId]/connections/[connectionId]
 * Update a command board connection
 *
 * Supports partial updates of:
 * - relationshipType: Type of relationship (generic, dependency, blocks, related_to, part_of)
 * - label: Optional label for the connection
 * - visible: Whether the connection is visible
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, connectionId } = await context.params;
    const body = await request.json();

    validateIds(boardId, connectionId);
    validateUpdateConnectionRequest(body);

    const data = body as UpdateConnectionRequest;

    // Check if the connection exists and belongs to the specified board
    const existingConnection = await database.commandBoardConnection.findFirst({
      where: {
        AND: [
          { tenantId },
          { boardId },
          { id: connectionId },
          { deletedAt: null },
        ],
      },
      select: {
        id: true,
        relationshipType: true,
        label: true,
        visible: true,
      },
    });

    if (!existingConnection) {
      return NextResponse.json(
        { message: "Connection not found" },
        { status: 404 }
      );
    }

    // Execute update and publish event in transaction
    const connection = await database.$transaction(async (tx) => {
      const updatedConnection = await tx.commandBoardConnection.update({
        where: {
          tenantId_id: {
            tenantId,
            id: connectionId,
          },
        },
        data: {
          relationshipType: data.relationshipType,
          label:
            data.label !== undefined ? data.label?.trim() || null : undefined,
          visible: data.visible,
        },
        select: CONNECTION_SELECT,
      });

      // Publish outbox event for real-time sync
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "CommandBoardConnection",
        aggregateId: connectionId,
        eventType: "command.board.connection.updated",
        payload: {
          boardId,
          connectionId,
          changes: data,
          updatedBy: userId,
          updatedAt: updatedConnection.updatedAt.toISOString(),
        },
      });

      return updatedConnection;
    });

    return NextResponse.json({ data: connection });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }

    // Handle unique constraint violation for duplicate connections
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          message:
            "A connection between these cards with this type already exists",
        },
        { status: 409 }
      );
    }

    console.error("Error updating connection:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/command-board/[boardId]/connections/[connectionId]
 * Soft delete a command board connection
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, connectionId } = await context.params;

    validateIds(boardId, connectionId);

    // Check if the connection exists and belongs to the specified board
    const existingConnection = await database.commandBoardConnection.findFirst({
      where: {
        AND: [
          { tenantId },
          { boardId },
          { id: connectionId },
          { deletedAt: null },
        ],
      },
      select: {
        id: true,
        fromCardId: true,
        toCardId: true,
      },
    });

    if (!existingConnection) {
      return NextResponse.json(
        { message: "Connection not found" },
        { status: 404 }
      );
    }

    // Soft delete the connection and publish event in transaction
    await database.$transaction(async (tx) => {
      await tx.commandBoardConnection.update({
        where: {
          tenantId_id: {
            tenantId,
            id: connectionId,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });

      // Publish outbox event for real-time sync
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "CommandBoardConnection",
        aggregateId: connectionId,
        eventType: "command.board.connection.deleted",
        payload: {
          boardId,
          connectionId,
          fromCardId: existingConnection.fromCardId,
          toCardId: existingConnection.toCardId,
          deletedBy: userId,
          deletedAt: new Date().toISOString(),
        },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error deleting connection:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
