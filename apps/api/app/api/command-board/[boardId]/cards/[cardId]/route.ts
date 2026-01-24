import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { UpdateCommandBoardCardRequest } from "../../../types";

type RouteContext = {
  params: Promise<{ boardId: string; cardId: string }>;
};

type ValidationError = NextResponse | null;

type UpdateFields = {
  fields: string[];
  values: (string | number | boolean | Date | null)[];
};

const VALID_CARD_TYPES = ["task", "note", "alert", "info"] as const;
const VALID_CARD_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "blocked",
] as const;

/**
 * Validate card_type field
 */
function validateCardType(cardType: string): ValidationError {
  if (!VALID_CARD_TYPES.includes(cardType)) {
    return NextResponse.json(
      {
        error: `Invalid card_type. Must be one of: ${VALID_CARD_TYPES.join(", ")}`,
      },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Validate status field
 */
function validateCardStatus(status: string): ValidationError {
  if (!VALID_CARD_STATUSES.includes(status)) {
    return NextResponse.json(
      {
        error: `Invalid status. Must be one of: ${VALID_CARD_STATUSES.join(", ")}`,
      },
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
function buildUpdateFields(body: UpdateCommandBoardCardRequest): {
  result: UpdateFields;
  error: ValidationError;
} {
  const updateFields: UpdateFields = { fields: [], values: [] };

  // Field configuration map
  const fieldConfigs = [
    { key: "title", field: "title" },
    { key: "content", field: "content" },
    { key: "card_type", field: "card_type", validator: validateCardType },
    { key: "status", field: "status", validator: validateCardStatus },
    {
      key: "position_x",
      field: "position_x",
      validator: (v: number) => validatePosition(v, "position_x"),
    },
    {
      key: "position_y",
      field: "position_y",
      validator: (v: number) => validatePosition(v, "position_y"),
    },
    {
      key: "width",
      field: "width",
      validator: (v: number) => validateDimension(v, "width"),
    },
    {
      key: "height",
      field: "height",
      validator: (v: number) => validateDimension(v, "height"),
    },
    {
      key: "z_index",
      field: "z_index",
      validator: (v: number) => validatePosition(v, "z_index"),
    },
    { key: "color", field: "color" },
  ] as const;

  // Process fields with configuration
  for (const config of fieldConfigs) {
    const value = (body as Record<string, unknown>)[config.key];
    if (value === undefined) {
      continue;
    }

    if (config.validator) {
      const error = config.validator(value as never);
      if (error) {
        return { result: updateFields, error };
      }
    }

    updateFields.fields.push(
      `${config.field} = $${updateFields.values.length + 1}`
    );
    updateFields.values.push(value);
  }

  // Handle metadata separately (requires JSON stringify)
  if (body.metadata !== undefined) {
    updateFields.fields.push(`metadata = $${updateFields.values.length + 1}`);
    updateFields.values.push(JSON.stringify(body.metadata));
  }

  return { result: updateFields, error: null };
}

/**
 * GET /api/command-board/[boardId]/cards/[cardId]
 * Get a single card by ID
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, cardId } = await context.params;

    const card = await database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        board_id: string;
        title: string;
        content: string | null;
        card_type: string;
        status: string;
        position_x: number;
        position_y: number;
        width: number;
        height: number;
        z_index: number;
        color: string | null;
        metadata: Record<string, unknown>;
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
          title,
          content,
          card_type,
          status,
          position_x,
          position_y,
          width,
          height,
          z_index,
          color,
          metadata,
          created_at,
          updated_at,
          deleted_at
        FROM tenant_events.command_board_cards
        WHERE tenant_id = ${tenantId}
          AND board_id = ${boardId}
          AND id = ${cardId}
          AND deleted_at IS NULL
      `
    );

    if (card.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json(card[0]);
  } catch (error) {
    console.error("Error getting card:", error);
    return NextResponse.json({ error: "Failed to get card" }, { status: 500 });
  }
}

/**
 * PUT /api/command-board/[boardId]/cards/[cardId]
 * Update a command board card
 *
 * Supports partial updates of:
 * - title: Card title
 * - content: Card content/description
 * - card_type: Type of card (task, note, alert, info)
 * - status: Card status (pending, in_progress, completed, blocked)
 * - position_x, position_y: Card position on board
 * - width, height: Card dimensions
 * - z_index: Stacking order
 * - color: Card color (hex code)
 * - metadata: Additional JSON metadata
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, cardId } = await context.params;
    const body = (await request.json()) as UpdateCommandBoardCardRequest;

    // Check if the card exists and belongs to the specified board
    const existingCard = await database.$queryRaw<
      Array<{ id: string; board_id: string }>
    >`
      SELECT id, board_id
      FROM tenant_events.command_board_cards
      WHERE tenant_id = ${tenantId}
        AND board_id = ${boardId}
        AND id = ${cardId}
        AND deleted_at IS NULL
    `;

    if (existingCard.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

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

    updateFields.fields.push("updated_at = NOW()");
    updateFields.values.push(cardId, tenantId, boardId);

    const result = await database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        board_id: string;
        title: string;
        content: string | null;
        card_type: string;
        status: string;
        position_x: number;
        position_y: number;
        width: number;
        height: number;
        z_index: number;
        color: string | null;
        metadata: Record<string, unknown>;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
      }>
    >(
      Prisma.raw(
        `UPDATE tenant_events.command_board_cards
         SET ${updateFields.fields.join(", ")}
         WHERE id = $${updateFields.values.length - 2}
           AND tenant_id = $${updateFields.values.length - 1}
           AND board_id = $${updateFields.values.length}
           AND deleted_at IS NULL
         RETURNING
           id,
           tenant_id,
           board_id,
           title,
           content,
           card_type,
           status,
           position_x,
           position_y,
           width,
           height,
           z_index,
           color,
           metadata,
           created_at,
           updated_at,
           deleted_at`
      ),
      updateFields.values
    );

    if (result.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating card:", error);
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/command-board/[boardId]/cards/[cardId]
 * Soft delete a command board card
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, cardId } = await context.params;

    // Check if the card exists and belongs to the specified board
    const existingCard = await database.$queryRaw<
      Array<{ id: string; board_id: string }>
    >`
      SELECT id, board_id
      FROM tenant_events.command_board_cards
      WHERE tenant_id = ${tenantId}
        AND board_id = ${boardId}
        AND id = ${cardId}
        AND deleted_at IS NULL
    `;

    if (existingCard.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Soft delete the card
    await database.$executeRaw`
      UPDATE tenant_events.command_board_cards
      SET deleted_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND board_id = ${boardId}
        AND id = ${cardId}
        AND deleted_at IS NULL
    `;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting card:", error);
    return NextResponse.json(
      { error: "Failed to delete card" },
      { status: 500 }
    );
  }
}
