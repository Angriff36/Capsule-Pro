/**
 * Command Board Layout API Endpoints
 *
 * GET    /api/command-board/layouts/[layoutId]      - Get a specific layout
 * PUT    /api/command-board/layouts/[layoutId]      - Update a layout
 * DELETE /api/command-board/layouts/[layoutId]      - Delete a layout (soft delete)
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { UpdateLayoutRequest } from "../../types";
import { validateLayoutId, validateUpdateLayoutRequest } from "../validation";

interface RouteContext {
  params: Promise<{ layoutId: string }>;
}

const LAYOUT_SELECT = {
  id: true,
  tenantId: true,
  boardId: true,
  userId: true,
  name: true,
  viewport: true,
  visibleCards: true,
  gridSize: true,
  showGrid: true,
  snapToGrid: true,
  createdAt: true,
  updatedAt: true,
} as const;

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
 * Update a command board layout
 *
 * Supports partial updates of:
 * - name: Layout name
 * - viewport: Viewport state (zoom, panX, panY)
 * - visibleCards: Array of visible card IDs
 * - gridSize: Grid size in pixels
 * - showGrid: Whether to show grid
 * - snapToGrid: Whether to snap to grid
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { layoutId } = await context.params;
    const body = (await request.json()) as UpdateLayoutRequest;

    validateLayoutId(layoutId);
    validateUpdateLayoutRequest(body);

    // Get current layout state
    const currentLayout = await database.$queryRaw<
      Array<{
        id: string;
        board_id: string;
        name: string;
      }>
    >`
      SELECT id, board_id, name
      FROM tenant_events.command_board_layouts
      WHERE tenant_id = ${tenantId}
        AND user_id = ${userId}
        AND id = ${layoutId}
        AND deleted_at IS NULL
    `;

    if (currentLayout.length === 0) {
      return NextResponse.json(
        { message: "Layout not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const sqlUpdates: string[] = [];
    const sqlValues: unknown[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      const trimmedName = body.name.trim();
      updateData.name = trimmedName;
      sqlUpdates.push(`name = $${paramIndex++}`);
      sqlValues.push(trimmedName);
    }

    if (body.viewport !== undefined) {
      updateData.viewport = body.viewport;
      sqlUpdates.push(`viewport = $${paramIndex++}`);
      sqlValues.push(JSON.stringify(body.viewport));
    }

    if (body.visibleCards !== undefined) {
      updateData.visibleCards = body.visibleCards;
      sqlUpdates.push(`visible_cards = $${paramIndex++}`);
      sqlValues.push(body.visibleCards);
    }

    if (body.gridSize !== undefined) {
      updateData.gridSize = body.gridSize;
      sqlUpdates.push(`grid_size = $${paramIndex++}`);
      sqlValues.push(body.gridSize);
    }

    if (body.showGrid !== undefined) {
      updateData.showGrid = body.showGrid;
      sqlUpdates.push(`show_grid = $${paramIndex++}`);
      sqlValues.push(body.showGrid);
    }

    if (body.snapToGrid !== undefined) {
      updateData.snapToGrid = body.snapToGrid;
      sqlUpdates.push(`snap_to_grid = $${paramIndex++}`);
      sqlValues.push(body.snapToGrid);
    }

    if (sqlUpdates.length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 }
      );
    }

    // Execute update and publish event in transaction
    const result = await database.$transaction(async (tx) => {
      sqlUpdates.push("updated_at = NOW()");
      sqlValues.push(layoutId, tenantId, userId);

      const updatedLayouts = await tx.$queryRaw<
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
        Prisma.raw(
          `UPDATE tenant_events.command_board_layouts
           SET ${sqlUpdates.join(", ")}
           WHERE id = $${sqlValues.length - 2}
             AND tenant_id = $${sqlValues.length - 1}
             AND user_id = $${sqlValues.length}
             AND deleted_at IS NULL
           RETURNING
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
             deleted_at`
        ),
        sqlValues
      );

      if (updatedLayouts.length === 0) {
        throw new Error("Layout not found after update");
      }

      const updatedLayout = updatedLayouts[0];

      // Publish outbox event
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "CommandBoardLayout",
        aggregateId: layoutId,
        eventType: "command.board.layout.updated",
        payload: {
          boardId: currentLayout[0].board_id,
          layoutId,
          changes: updateData,
          userId,
          updatedAt: updatedLayout.updated_at.toISOString(),
        },
      });

      return updatedLayout;
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    if (error instanceof InvariantError) {
      const message = (error as InvariantError).message;
      return NextResponse.json({ message }, { status: 400 });
    }
    console.error("Error updating layout:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/command-board/layouts/[layoutId]
 * Soft delete a command board layout
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { layoutId } = await context.params;

    validateLayoutId(layoutId);

    // Check if the layout exists and belongs to the user
    const existingLayout = await database.$queryRaw<
      Array<{ id: string; board_id: string }>
    >`
      SELECT id, board_id
      FROM tenant_events.command_board_layouts
      WHERE tenant_id = ${tenantId}
        AND user_id = ${userId}
        AND id = ${layoutId}
        AND deleted_at IS NULL
    `;

    if (existingLayout.length === 0) {
      return NextResponse.json(
        { message: "Layout not found" },
        { status: 404 }
      );
    }

    // Soft delete the layout and publish event in transaction
    await database.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE tenant_events.command_board_layouts
        SET deleted_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
          AND id = ${layoutId}
          AND deleted_at IS NULL
      `;

      // Publish outbox event for real-time sync
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "CommandBoardLayout",
        aggregateId: layoutId,
        eventType: "command.board.layout.deleted",
        payload: {
          boardId: existingLayout[0].board_id,
          layoutId,
          userId,
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
    console.error("Error deleting layout:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
