/**
 * Command Board Draft API Endpoints
 *
 * POST /api/command-board/[boardId]/draft  - Save draft state
 * GET  /api/command-board/[boardId]/draft  - Retrieve latest draft
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  DraftResponse,
  LoadDraftResponse,
  SaveDraftRequest,
} from "../../draft/types";
import type {
  CommandBoardCard,
  CommandBoardConnection,
  CommandBoardGroup,
  ViewportState,
} from "../../types";

interface RouteContext {
  params: Promise<{ boardId: string }>;
}

/**
 * Validate board exists and belongs to tenant
 */
async function validateBoard(boardId: string, tenantId: string) {
  const board = await database.commandBoard.findFirst({
    where: {
      id: boardId,
      tenantId,
      deletedAt: null,
    },
  });

  if (!board) {
    throw new InvariantError("Command board not found");
  }

  return board;
}

/**
 * POST /api/command-board/[boardId]/draft - Save draft state
 */
export async function POST(request: Request, context: RouteContext) {
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

    const { boardId } = await context.params;
    if (!boardId) {
      return NextResponse.json(
        { message: "Board ID is required" },
        { status: 400 }
      );
    }

    // Validate board exists
    await validateBoard(boardId, tenantId);

    const body: SaveDraftRequest = await request.json();

    // Validate required fields
    const isValidRequest =
      body.cards &&
      Array.isArray(body.cards) &&
      body.viewport &&
      body.connections &&
      Array.isArray(body.connections) &&
      body.groups &&
      Array.isArray(body.groups) &&
      body.timestamp;

    if (!isValidRequest) {
      return NextResponse.json(
        {
          message:
            "Invalid request body. Required: cards, viewport, connections, groups, timestamp",
        },
        { status: 400 }
      );
    }

    // Create a new draft entry
    const newDraft = {
      timestamp: body.timestamp,
      cards: body.cards,
      viewport: body.viewport,
      connections: body.connections,
      groups: body.groups,
    };

    // Store draft information in the tags field (as JSON)
    const draftTag = {
      type: "draft",
      version: "1.0",
      latestDraft: newDraft,
    };

    // Get existing tags and add draft information
    const existingBoard = await database.commandBoard.findFirst({
      where: {
        id: boardId,
        tenantId,
        deletedAt: null,
      },
    });

    const updatedTags = [...(existingBoard?.tags || [])];

    // Remove existing draft tag
    const filteredTags = updatedTags.filter((tag) => {
      try {
        const parsedTag = JSON.parse(tag) as { type: string } | null;
        return parsedTag?.type !== "draft";
      } catch {
        return true;
      }
    });

    // Add new draft tag
    filteredTags.push(JSON.stringify(draftTag));

    // Update board with draft information in tags
    await database.commandBoard.update({
      where: {
        tenantId_id: {
          tenantId,
          id: boardId,
        },
      },
      data: {
        tags: filteredTags,
      },
    });

    const response: DraftResponse = {
      id: boardId,
      updatedAt: body.timestamp,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json(
        { message: (error as InvariantError).message },
        { status: 400 }
      );
    }
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Failed to save command board draft:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/command-board/[boardId]/draft - Retrieve latest draft
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

    const { boardId } = await context.params;
    if (!boardId) {
      return NextResponse.json(
        { message: "Board ID is required" },
        { status: 400 }
      );
    }

    // Validate board exists
    const board = await validateBoard(boardId, tenantId);

    const response: LoadDraftResponse = {
      success: false,
      draft: null,
    };

    // Get draft from the board's tags
    let latestDraft: {
      timestamp: string;
      cards: unknown[];
      viewport: unknown;
      connections: unknown[];
      groups: unknown[];
    } | null = null;
    let latestTimestamp = "";

    for (const tag of board.tags || []) {
      try {
        const parsedTag = JSON.parse(tag);
        if (
          parsedTag.type === "draft" &&
          (!latestTimestamp ||
            parsedTag.latestDraft.timestamp > latestTimestamp)
        ) {
          latestTimestamp = parsedTag.latestDraft.timestamp;
          latestDraft = parsedTag.latestDraft;
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    if (latestDraft) {
      // Format the response to match the expected shape
      response.success = true;
      response.draft = {
        cards: (latestDraft.cards || []) as CommandBoardCard[],
        viewport: latestDraft.viewport as ViewportState,
        connections: (latestDraft.connections ||
          []) as CommandBoardConnection[],
        groups: (latestDraft.groups || []) as CommandBoardGroup[],
        updatedAt: latestDraft.timestamp,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json(
        { message: (error as InvariantError).message },
        { status: 400 }
      );
    }
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Failed to load command board draft:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
