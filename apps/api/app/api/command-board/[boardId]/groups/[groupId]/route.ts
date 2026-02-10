/**
 * Command Board Group Details API Endpoints
 *
 * GET    /api/command-board/[boardId]/groups/[groupId]  - Get a single group
 * PUT    /api/command-board/[boardId]/groups/[groupId]  - Update a group
 * DELETE /api/command-board/[boardId]/groups/[groupId]  - Delete a group (soft delete)
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { UpdateGroupRequest } from "../../../types";
import { validateUpdateGroupRequest } from "../validation";

interface RouteContext {
  params: Promise<{ boardId: string; groupId: string }>;
}

type ValidationError = NextResponse | null;

interface UpdateFields {
  fields: string[];
  values: (string | number | boolean | Date | null)[];
}

type Validator = (value: unknown) => ValidationError;

/**
 * Validate boolean field
 */
function validateBooleanField(
  value: unknown,
  fieldName: string
): ValidationError {
  if (typeof value !== "boolean") {
    return NextResponse.json(
      { error: `${fieldName} must be a boolean` },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Validate position field
 */
function validatePosition(value: number, fieldName: string): ValidationError {
  if (typeof value !== "number" || value < 0) {
    return NextResponse.json(
      { error: `${fieldName} must be a non-negative number` },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Validate dimension field
 */
function validateDimension(value: number, fieldName: string): ValidationError {
  if (typeof value !== "number" || value <= 0) {
    return NextResponse.json(
      { error: `${fieldName} must be a positive number` },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Build update fields from request body
 */
function buildUpdateFields(body: UpdateGroupRequest): {
  result: UpdateFields;
  error: ValidationError;
} {
  const updateFields: UpdateFields = { fields: [], values: [] };

  // Field configuration map
  const fieldConfigs: Array<{
    key: string;
    field: string;
    validator?: Validator;
  }> = [
    { key: "name", field: "name" },
    {
      key: "color",
      field: "color",
    },
    {
      key: "collapsed",
      field: "collapsed",
      validator: (v: unknown) =>
        typeof v === "boolean"
          ? null
          : NextResponse.json(
              { error: "collapsed must be a boolean" },
              { status: 400 }
            ),
    },
    {
      key: "position_x",
      field: "position_x",
      validator: (v: unknown) =>
        typeof v === "number"
          ? validatePosition(v, "position_x")
          : NextResponse.json(
              { error: "position_x must be a number" },
              { status: 400 }
            ),
    },
    {
      key: "position_y",
      field: "position_y",
      validator: (v: unknown) =>
        typeof v === "number"
          ? validatePosition(v, "position_y")
          : NextResponse.json(
              { error: "position_y must be a number" },
              { status: 400 }
            ),
    },
    {
      key: "width",
      field: "width",
      validator: (v: unknown) =>
        typeof v === "number"
          ? validateDimension(v, "width")
          : NextResponse.json(
              { error: "width must be a number" },
              { status: 400 }
            ),
    },
    {
      key: "height",
      field: "height",
      validator: (v: unknown) =>
        typeof v === "number"
          ? validateDimension(v, "height")
          : NextResponse.json(
              { error: "height must be a number" },
              { status: 400 }
            ),
    },
    {
      key: "z_index",
      field: "z_index",
      validator: (v: unknown) =>
        typeof v === "number"
          ? validatePosition(v, "z_index")
          : NextResponse.json(
              { error: "z_index must be a number" },
              { status: 400 }
            ),
    },
  ];

  // Process fields with configuration
  for (const config of fieldConfigs) {
    const value = (body as Record<string, unknown>)[config.key];
    if (value === undefined) {
      continue;
    }

    if (config.validator) {
      const error = config.validator(value);
      if (error) {
        return { result: updateFields, error };
      }
    }

    updateFields.fields.push(
      `${config.field} = $${updateFields.values.length + 1}`
    );
    // Cast value to acceptable type for Prisma query
    updateFields.values.push(value as string | number | boolean | Date | null);
  }

  return { result: updateFields, error: null };
}

/**
 * GET /api/command-board/[boardId]/groups/[groupId]
 * Get a single group by ID
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, groupId } = await context.params;

    const group = await database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        board_id: string;
        name: string;
        color: string | null;
        collapsed: boolean;
        position_x: number;
        position_y: number;
        width: number;
        height: number;
        z_index: number;
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
          name,
          color,
          collapsed,
          position_x,
          position_y,
          width,
          height,
          z_index,
          created_at,
          updated_at,
          deleted_at
        FROM tenant_events.command_board_groups
        WHERE tenant_id = ${tenantId}
          AND board_id = ${boardId}
          AND id = ${groupId}
          AND deleted_at IS NULL
      `
    );

    if (group.length === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(group[0]);
  } catch (error) {
    console.error("Error getting group:", error);
    return NextResponse.json({ error: "Failed to get group" }, { status: 500 });
  }
}

/**
 * PUT /api/command-board/[boardId]/groups/[groupId]
 * Update a command board group
 *
 * Supports partial updates of:
 * - name: Group name
 * - color: Group color (hex code)
 * - collapsed: Whether the group is collapsed
 * - position_x, position_y: Group position on board
 * - width, height: Group dimensions
 * - z_index: Stacking order
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, groupId } = await context.params;
    const body = (await request.json()) as UpdateGroupRequest;

    // Validate request body
    validateUpdateGroupRequest(body);

    // Get current group state to detect position changes
    const currentGroup = await database.$queryRaw<
      Array<{
        id: string;
        board_id: string;
        position_x: number;
        position_y: number;
      }>
    >`
      SELECT id, board_id, position_x, position_y
      FROM tenant_events.command_board_groups
      WHERE tenant_id = ${tenantId}
        AND board_id = ${boardId}
        AND id = ${groupId}
        AND deleted_at IS NULL
    `;

    if (currentGroup.length === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Track if position changed
    const previousPosition = {
      x: currentGroup[0].position_x,
      y: currentGroup[0].position_y,
    };

    // Build update fields with validation
    const { result: updateFields, error: validationError } =
      buildUpdateFields(body);

    if (validationError) {
      return validationError;
    }

    // Check if there are fields to update
    if (updateFields.fields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Execute update and publish event in transaction
    const result = await database.$transaction(async (tx) => {
      updateFields.fields.push("updated_at = NOW()");
      updateFields.values.push(groupId, tenantId, boardId);

      const updatedGroups = await tx.$queryRaw<
        Array<{
          id: string;
          tenant_id: string;
          board_id: string;
          name: string;
          color: string | null;
          collapsed: boolean;
          position_x: number;
          position_y: number;
          width: number;
          height: number;
          z_index: number;
          created_at: Date;
          updated_at: Date;
          deleted_at: Date | null;
        }>
      >(
        Prisma.raw(
          `UPDATE tenant_events.command_board_groups
           SET ${updateFields.fields.join(", ")}
           WHERE id = $${updateFields.values.length - 2}
             AND tenant_id = $${updateFields.values.length - 1}
             AND board_id = $${updateFields.values.length}
             AND deleted_at IS NULL
           RETURNING
             id,
             tenant_id,
             board_id,
             name,
             color,
             collapsed,
             position_x,
             position_y,
             width,
             height,
             z_index,
             created_at,
             updated_at,
             deleted_at`
        ),
        updateFields.values
      );

      if (updatedGroups.length === 0) {
        throw new Error("Group not found after update");
      }

      const updatedGroup = updatedGroups[0];

      // Determine if this is a position change or general update
      const positionChanged =
        "position_x" in body ||
        "position_y" in body ||
        updatedGroup.position_x !== previousPosition.x ||
        updatedGroup.position_y !== previousPosition.y;

      // Publish appropriate event
      if (positionChanged) {
        await createOutboxEvent(tx, {
          tenantId,
          aggregateType: "CommandBoardGroup",
          aggregateId: groupId,
          eventType: "command.board.group.moved",
          payload: {
            boardId,
            groupId,
            previousPosition,
            newPosition: {
              x: updatedGroup.position_x,
              y: updatedGroup.position_y,
            },
            movedBy: userId,
            movedAt: updatedGroup.updated_at.toISOString(),
          },
        });
      } else {
        // For non-position changes, track the actual changes
        const changes: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(body)) {
          changes[key] = value;
        }

        await createOutboxEvent(tx, {
          tenantId,
          aggregateType: "CommandBoardGroup",
          aggregateId: groupId,
          eventType: "command.board.group.updated",
          payload: {
            boardId,
            groupId,
            changes,
            updatedBy: userId,
            updatedAt: updatedGroup.updated_at.toISOString(),
          },
        });
      }

      return updatedGroup;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("InvariantError")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error updating group:", error);
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/command-board/[boardId]/groups/[groupId]
 * Soft delete a command board group
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, groupId } = await context.params;

    // Check if the group exists and belongs to the specified board
    const existingGroup = await database.$queryRaw<
      Array<{ id: string; board_id: string }>
    >`
      SELECT id, board_id
      FROM tenant_events.command_board_groups
      WHERE tenant_id = ${tenantId}
        AND board_id = ${boardId}
        AND id = ${groupId}
        AND deleted_at IS NULL
    `;

    if (existingGroup.length === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Soft delete the group, ungroup its cards, and publish event in transaction
    await database.$transaction(async (tx) => {
      // Remove the group association from all cards in this group
      await tx.$executeRaw`
        UPDATE tenant_events.command_board_cards
        SET group_id = NULL
        WHERE tenant_id = ${tenantId}
          AND group_id = ${groupId}
          AND deleted_at IS NULL
      `;

      // Soft delete the group
      await tx.$executeRaw`
        UPDATE tenant_events.command_board_groups
        SET deleted_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND board_id = ${boardId}
          AND id = ${groupId}
          AND deleted_at IS NULL
      `;

      // Publish outbox event for real-time sync
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "CommandBoardGroup",
        aggregateId: groupId,
        eventType: "command.board.group.deleted",
        payload: {
          boardId,
          groupId,
          deletedBy: userId,
          deletedAt: new Date().toISOString(),
        },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 }
    );
  }
}
