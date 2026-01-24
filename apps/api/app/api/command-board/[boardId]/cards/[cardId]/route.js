Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const realtime_1 = require("@repo/realtime");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const VALID_CARD_TYPES = ["task", "note", "alert", "info"];
const VALID_CARD_STATUSES = ["pending", "in_progress", "completed", "blocked"];
/**
 * Validate card_type field
 */
function validateCardType(cardType) {
  if (!VALID_CARD_TYPES.includes(cardType)) {
    return server_2.NextResponse.json(
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
function validateCardStatus(status) {
  if (!VALID_CARD_STATUSES.includes(status)) {
    return server_2.NextResponse.json(
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
function validatePosition(value, fieldName) {
  if (typeof value !== "number" || value < 0) {
    return server_2.NextResponse.json(
      { error: `${fieldName} must be a non-negative number` },
      { status: 400 }
    );
  }
  return null;
}
/**
 * Validate dimension field
 */
function validateDimension(value, fieldName) {
  if (typeof value !== "number" || value <= 0) {
    return server_2.NextResponse.json(
      { error: `${fieldName} must be a positive number` },
      { status: 400 }
    );
  }
  return null;
}
/**
 * Build update fields from request body
 */
function buildUpdateFields(body) {
  const updateFields = { fields: [], values: [] };
  // Field configuration map
  const fieldConfigs = [
    { key: "title", field: "title" },
    { key: "content", field: "content" },
    { key: "card_type", field: "card_type", validator: validateCardType },
    { key: "status", field: "status", validator: validateCardStatus },
    {
      key: "position_x",
      field: "position_x",
      validator: (v) => validatePosition(v, "position_x"),
    },
    {
      key: "position_y",
      field: "position_y",
      validator: (v) => validatePosition(v, "position_y"),
    },
    {
      key: "width",
      field: "width",
      validator: (v) => validateDimension(v, "width"),
    },
    {
      key: "height",
      field: "height",
      validator: (v) => validateDimension(v, "height"),
    },
    {
      key: "z_index",
      field: "z_index",
      validator: (v) => validatePosition(v, "z_index"),
    },
    { key: "color", field: "color" },
  ];
  // Process fields with configuration
  for (const config of fieldConfigs) {
    const value = body[config.key];
    if (value === undefined) {
      continue;
    }
    if ("validator" in config && config.validator) {
      const error = config.validator(value);
      if (error) {
        return { result: updateFields, error };
      }
    }
    updateFields.fields.push(
      `${config.field} = $${updateFields.values.length + 1}`
    );
    // Cast value to acceptable type for Prisma query
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
async function GET(_request, context) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { boardId, cardId } = await context.params;
    const card = await database_1.database.$queryRaw(database_1.Prisma.sql`
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
      `);
    if (card.length === 0) {
      return server_2.NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }
    return server_2.NextResponse.json(card[0]);
  } catch (error) {
    console.error("Error getting card:", error);
    return server_2.NextResponse.json(
      { error: "Failed to get card" },
      { status: 500 }
    );
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
async function PUT(request, context) {
  try {
    const { orgId, userId } = await (0, server_1.auth)();
    if (!(orgId && userId)) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { boardId, cardId } = await context.params;
    const body = await request.json();
    // Get current card state to detect position changes
    const currentCard = await database_1.database.$queryRaw`
      SELECT id, board_id, position_x, position_y
      FROM tenant_events.command_board_cards
      WHERE tenant_id = ${tenantId}
        AND board_id = ${boardId}
        AND id = ${cardId}
        AND deleted_at IS NULL
    `;
    if (currentCard.length === 0) {
      return server_2.NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }
    // Track if position changed
    const previousPosition = {
      x: currentCard[0].position_x,
      y: currentCard[0].position_y,
    };
    // Build update fields with validation
    const { result: updateFields, error: validationError } =
      buildUpdateFields(body);
    if (validationError) {
      return validationError;
    }
    // Check if there are fields to update
    if (updateFields.fields.length === 0) {
      return server_2.NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }
    // Execute update and publish event in transaction
    const result = await database_1.database.$transaction(async (tx) => {
      updateFields.fields.push("updated_at = NOW()");
      updateFields.values.push(cardId, tenantId, boardId);
      const updatedCards = await tx.$queryRaw(
        database_1.Prisma.raw(`UPDATE tenant_events.command_board_cards
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
             deleted_at`),
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
      // Publish appropriate event
      if (positionChanged) {
        await (0, realtime_1.createOutboxEvent)(tx, {
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
          },
        });
      } else {
        // For non-position changes, track the actual changes
        const changes = {};
        for (const [key, value] of Object.entries(body)) {
          changes[key] = value;
        }
        await (0, realtime_1.createOutboxEvent)(tx, {
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
          },
        });
      }
      return updatedCard;
    });
    return server_2.NextResponse.json(result);
  } catch (error) {
    console.error("Error updating card:", error);
    return server_2.NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/command-board/[boardId]/cards/[cardId]
 * Soft delete a command board card
 */
async function DELETE(_request, context) {
  try {
    const { orgId, userId } = await (0, server_1.auth)();
    if (!(orgId && userId)) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { boardId, cardId } = await context.params;
    // Check if the card exists and belongs to the specified board
    const existingCard = await database_1.database.$queryRaw`
      SELECT id, board_id
      FROM tenant_events.command_board_cards
      WHERE tenant_id = ${tenantId}
        AND board_id = ${boardId}
        AND id = ${cardId}
        AND deleted_at IS NULL
    `;
    if (existingCard.length === 0) {
      return server_2.NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }
    // Soft delete the card and publish event in transaction
    await database_1.database.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE tenant_events.command_board_cards
        SET deleted_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND board_id = ${boardId}
          AND id = ${cardId}
          AND deleted_at IS NULL
      `;
      // Publish outbox event for real-time sync
      await (0, realtime_1.createOutboxEvent)(tx, {
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
    return new server_2.NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting card:", error);
    return server_2.NextResponse.json(
      { error: "Failed to delete card" },
      { status: 500 }
    );
  }
}
