import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { createOutboxEvent } from "@repo/realtime";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { UpdateCommandBoardCardRequest } from "../../../types";

interface RouteContext {
  params: Promise<{ boardId: string; cardId: string }>;
}

type ValidationError = NextResponse | null;

interface UpdateFields {
  fields: string[];
  values: (string | number | boolean | Date | null)[];
}

type Validator = (value: unknown) => ValidationError;

const VALID_CARD_TYPES = [
  "generic",
  "event",
  "client",
  "task",
  "employee",
  "inventory",
  "recipe",
  "note",
  "alert",
  "info",
] as const;
const VALID_CARD_STATUSES = [
  "active",
  "completed",
  "archived",
  "pending",
  "in_progress",
  "blocked",
] as const;

/**
 * Validate card_type field
 */
function validateCardType(cardType: string): ValidationError {
  if (!(VALID_CARD_TYPES as readonly string[]).includes(cardType)) {
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
  if (!(VALID_CARD_STATUSES as readonly string[]).includes(status)) {
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

  // Field configuration map - use Validator type to unify different validator signatures
  const fieldConfigs: Array<{
    key: string;
    field: string;
    validator?: Validator;
  }> = [
    { key: "title", field: "title" },
    { key: "content", field: "content" },
    {
      key: "card_type",
      field: "card_type",
      validator: (v: unknown) =>
        typeof v === "string"
          ? validateCardType(v)
          : NextResponse.json(
              { error: "card_type must be a string" },
              { status: 400 }
            ),
    },
    {
      key: "status",
      field: "status",
      validator: (v: unknown) =>
        typeof v === "string"
          ? validateCardStatus(v)
          : NextResponse.json(
              { error: "status must be a string" },
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
    { key: "color", field: "color" },
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
        vector_clock: Record<string, number> | null;
        version: number;
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
          vector_clock,
          version,
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
 * - card_type: Type of card (generic, event, client, task, employee, inventory, recipe, note, alert, info)
 * - status: Card status (active, completed, archived, pending, in_progress, blocked)
 * - position_x, position_y: Card position on board
 * - width, height: Card dimensions
 * - z_index: Stacking order
 * - color: Card color (hex code)
 * - metadata: Additional JSON metadata
 * - version: Required for optimistic locking - must match current version on server
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { boardId, cardId } = await context.params;
    const body = (await request.json()) as UpdateCommandBoardCardRequest;

    // Validate that version is provided
    if (body.version === undefined) {
      return NextResponse.json(
        {
          error: "Version required",
          message:
            "The version field is required for updates to enable conflict detection",
        },
        { status: 400 }
      );
    }

    // Get current card state including version and vector clock
    const currentCard = await database.$queryRaw<
      Array<{
        id: string;
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
        vector_clock: Record<string, number> | null;
        version: number;
      }>
    >`
      SELECT
        id,
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
        vector_clock,
        version
      FROM tenant_events.command_board_cards
      WHERE tenant_id = ${tenantId}
        AND board_id = ${boardId}
        AND id = ${cardId}
        AND deleted_at IS NULL
    `;

    if (currentCard.length === 0) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const currentCardData = currentCard[0];

    // Version conflict detection
    if (currentCardData.version !== body.version) {
      return NextResponse.json(
        {
          error: "Version conflict",
          message:
            "The card has been modified by another user. Please refresh and try again.",
          currentVersion: currentCardData.version,
          localVersion: body.version,
          currentCard: {
            id: currentCardData.id,
            title: currentCardData.title,
            content: currentCardData.content,
            card_type: currentCardData.card_type,
            status: currentCardData.status,
            position_x: currentCardData.position_x,
            position_y: currentCardData.position_y,
            width: currentCardData.width,
            height: currentCardData.height,
            z_index: currentCardData.z_index,
            color: currentCardData.color,
            metadata: currentCardData.metadata,
            version: currentCardData.version,
          },
        },
        { status: 409 }
      );
    }

    // Track previous position for event publishing
    const previousPosition = {
      x: currentCardData.position_x,
      y: currentCardData.position_y,
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

    // Merge vector clocks: increment counter for current user and merge with existing
    const existingVectorClock =
      (currentCardData.vector_clock as Record<string, number>) || {};
    const newVectorClock: Record<string, number> = {
      ...existingVectorClock,
      [userId]: (existingVectorClock[userId] || 0) + 1,
    };

    // Execute update and publish event in transaction
    const result = await database.$transaction(async (tx) => {
      updateFields.fields.push("updated_at = NOW()");
      updateFields.fields.push(
        `vector_clock = $${updateFields.values.length + 1}`
      );
      updateFields.values.push(JSON.stringify(newVectorClock));
      updateFields.fields.push(`version = $${updateFields.values.length + 1}`);
      updateFields.values.push(currentCardData.version + 1);
      updateFields.values.push(cardId, tenantId, boardId);

      const updatedCards = await tx.$queryRaw<
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
          vector_clock: Record<string, number>;
          version: number;
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
             vector_clock,
             version,
             created_at,
             updated_at,
             deleted_at`
        ),
        updateFields.values
      );

      if (updatedCards.length === 0) {
        throw new Error("Card not found after update");
      }

      const updatedCard = updatedCards[0];

      // Determine if this is a position change or general update
      const positionChanged =
        "position_x" in body ||
        "position_y" in body ||
        updatedCard.position_x !== previousPosition.x ||
        updatedCard.position_y !== previousPosition.y;

      // Publish appropriate event with version information
      if (positionChanged) {
        await createOutboxEvent(tx, {
          tenantId,
          aggregateType: "CommandBoardCard",
          aggregateId: cardId,
          eventType: "command.board.card.moved",
          payload: {
            boardId,
            cardId,
            previousPosition,
            newPosition: {
              x: updatedCard.position_x,
              y: updatedCard.position_y,
            },
            movedBy: userId,
            movedAt: updatedCard.updated_at.toISOString(),
            version: updatedCard.version,
            vectorClock: updatedCard.vector_clock,
          },
        });
      } else {
        // For non-position changes, track the actual changes
        const changes: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(body)) {
          if (key !== "version") {
            changes[key] = value;
          }
        }

        await createOutboxEvent(tx, {
          tenantId,
          aggregateType: "CommandBoardCard",
          aggregateId: cardId,
          eventType: "command.board.card.updated",
          payload: {
            boardId,
            cardId,
            changes,
            updatedBy: userId,
            updatedAt: updatedCard.updated_at.toISOString(),
            version: updatedCard.version,
            vectorClock: updatedCard.vector_clock,
          },
        });
      }

      return updatedCard;
    });

    return NextResponse.json(result);
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
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
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

    // Soft delete the card and publish event in transaction
    await database.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE tenant_events.command_board_cards
        SET deleted_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND board_id = ${boardId}
          AND id = ${cardId}
          AND deleted_at IS NULL
      `;

      // Publish outbox event for real-time sync
      await createOutboxEvent(tx, {
        tenantId,
        aggregateType: "CommandBoardCard",
        aggregateId: cardId,
        eventType: "command.board.card.deleted",
        payload: {
          boardId,
          cardId,
          deletedBy: userId,
          deletedAt: new Date().toISOString(),
        },
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting card:", error);
    return NextResponse.json(
      { error: "Failed to delete card" },
      { status: 500 }
    );
  }
}
