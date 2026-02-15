import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

/**
 * PATCH /api/kitchen/prep-lists/items/[id]
 * Update a prep list item via manifest commands.
 *
 * Routes to the appropriate manifest command based on the field being updated:
 * - scaledQuantity → PrepListItem.updateQuantity
 * - isCompleted: true → PrepListItem.markCompleted
 * - isCompleted: false → PrepListItem.markUncompleted
 * - preparationNotes → PrepListItem.updatePrepNotes
 * - stationId/stationName → PrepListItem.updateStation
 *
 * Only one field-type update per request is supported. If multiple fields
 * are sent, they are prioritized in the order listed above.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Clone the request so we can read the body to determine the command,
  // while still passing the original request to executeManifestCommand
  const clonedRequest = request.clone();
  let body: Record<string, unknown> = {};
  try {
    body = await clonedRequest.json();
  } catch (error) {
    console.error("[PrepListItem/PATCH] Failed to parse request body:", error);
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 }
    );
  }

  // Route to the appropriate manifest command based on the field being updated

  // 1. Completion status changes
  if (body.isCompleted !== undefined) {
    if (body.isCompleted) {
      console.log("[PrepListItem/PATCH] Delegating to markCompleted command", {
        itemId: id,
      });
      return executeManifestCommand(request, {
        entityName: "PrepListItem",
        commandName: "markCompleted",
        params: { id },
        transformBody: (_body, ctx) => ({
          id,
          userId: ctx.userId,
        }),
      });
    }

    console.log("[PrepListItem/PATCH] Delegating to markUncompleted command", {
      itemId: id,
    });
    return executeManifestCommand(request, {
      entityName: "PrepListItem",
      commandName: "markUncompleted",
      params: { id },
      transformBody: (_body, ctx) => ({
        id,
        userId: ctx.userId,
      }),
    });
  }

  // 2. Quantity updates
  if (body.scaledQuantity !== undefined) {
    console.log("[PrepListItem/PATCH] Delegating to updateQuantity command", {
      itemId: id,
      scaledQuantity: body.scaledQuantity,
    });
    return executeManifestCommand(request, {
      entityName: "PrepListItem",
      commandName: "updateQuantity",
      params: { id },
      transformBody: (reqBody, ctx) => ({
        id,
        scaledQuantity: reqBody.scaledQuantity,
        userId: ctx.userId,
      }),
    });
  }

  // 3. Preparation notes updates
  if (body.preparationNotes !== undefined) {
    console.log("[PrepListItem/PATCH] Delegating to updatePrepNotes command", {
      itemId: id,
    });
    return executeManifestCommand(request, {
      entityName: "PrepListItem",
      commandName: "updatePrepNotes",
      params: { id },
      transformBody: (reqBody, ctx) => ({
        id,
        preparationNotes: reqBody.preparationNotes,
        userId: ctx.userId,
      }),
    });
  }

  // 4. Station updates
  if (body.stationId !== undefined || body.stationName !== undefined) {
    console.log("[PrepListItem/PATCH] Delegating to updateStation command", {
      itemId: id,
      stationId: body.stationId,
    });
    return executeManifestCommand(request, {
      entityName: "PrepListItem",
      commandName: "updateStation",
      params: { id },
      transformBody: (reqBody, ctx) => ({
        id,
        stationId: reqBody.stationId,
        stationName: reqBody.stationName,
        userId: ctx.userId,
      }),
    });
  }

  // No recognized field to update
  console.error(
    "[PrepListItem/PATCH] No manifest command available for the requested update",
    { itemId: id, bodyKeys: Object.keys(body) }
  );
  return NextResponse.json(
    {
      message:
        "Update not supported: no manifest command available for the requested fields",
      fields: Object.keys(body),
    },
    { status: 400 }
  );
}

/**
 * DELETE /api/kitchen/prep-lists/items/[id]
 * Mark a prep list item as uncompleted via manifest command.
 *
 * Delegates to PrepListItem.markUncompleted manifest command which enforces
 * guards, constraints, policies, and emits domain events.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  console.log(
    "[PrepListItem/DELETE] Delegating to manifest markUncompleted command",
    { itemId: id }
  );

  return executeManifestCommand(request, {
    entityName: "PrepListItem",
    commandName: "markUncompleted",
    params: { id },
    transformBody: (_body, ctx) => ({
      id,
      userId: ctx.userId,
    }),
  });
}
