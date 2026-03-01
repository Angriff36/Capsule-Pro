/**
 * Command Board Layout API Endpoints
 *
 * GET    /api/command-board/layouts/[layoutId]      - Get a specific layout
 * PUT    /api/command-board/layouts/[layoutId]      - Update a layout
 * DELETE /api/command-board/layouts/[layoutId]      - Delete a layout (soft delete)
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import { validateLayoutId } from "../validation";

interface RouteContext {
  params: Promise<{ layoutId: string }>;
}

/**
 * GET /api/command-board/layouts/[layoutId]
 * Get a specific layout by ID
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { layoutId } = await context.params;

    validateLayoutId(layoutId);

    const layout = await database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        board_id: string;
        user_id: string;
        name: string;
        viewport: Record<string, unknown>;
        visible_cards: string[];
        grid_size: number;
        show_grid: boolean;
        snap_to_grid: boolean;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
      }>
    >(
      Prisma.sql`
        SELECT
          id,
          tenant_id,
          board_id,
          user_id,
          name,
          viewport,
          visible_cards,
          grid_size,
          show_grid,
          snap_to_grid,
          created_at,
          updated_at,
          deleted_at
        FROM tenant_events.command_board_layouts
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND id = ${layoutId}
          AND deleted_at IS NULL
      `
    );

    if (layout.length === 0) {
      return NextResponse.json(
        { message: "Layout not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: layout[0] });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error getting layout:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/command-board/layouts/[layoutId]
 * Update a command board layout via manifest runtime
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { layoutId } = await context.params;
  return executeManifestCommand(request, {
    entityName: "CommandBoardLayout",
    commandName: "update",
    params: { id: layoutId },
    transformBody: (body, ctx) => ({
      ...body,
      id: layoutId,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    }),
  });
}

/**
 * DELETE /api/command-board/layouts/[layoutId]
 * Remove a command board layout via manifest runtime
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { layoutId } = await context.params;
  return executeManifestCommand(request, {
    entityName: "CommandBoardLayout",
    commandName: "remove",
    params: { id: layoutId },
    transformBody: (_body, ctx) => ({
      id: layoutId,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    }),
  });
}
