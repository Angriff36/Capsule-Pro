import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

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

  // Parse the body to determine the command
  const user = await resolveCurrentUser(request);
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch (error) {
    log.error("[PrepListItem/PATCH] Failed to parse request body", { error });
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 }
    );
  }

  const userCtx = { id: user.id, tenantId: user.tenantId, role: user.role };

  // Route to the appropriate manifest command based on the field being updated

  // 1. Completion status changes
  if (body.isCompleted !== undefined) {
    if (body.isCompleted) {
      log.debug("[PrepListItem/PATCH] Delegating to markCompleted command", {
        itemId: id,
      });
      return runManifestCommand({
        entity: "PrepListItem",
        command: "markCompleted",
        body: { id, userId: user.id },
        user: userCtx,
      });
    }

    log.debug("[PrepListItem/PATCH] Delegating to markUncompleted command", {
      itemId: id,
    });
    return runManifestCommand({
      entity: "PrepListItem",
      command: "markUncompleted",
      body: { id, userId: user.id },
      user: userCtx,
    });
  }

  // 2. Quantity updates
  if (body.scaledQuantity !== undefined) {
    log.debug("[PrepListItem/PATCH] Delegating to updateQuantity command", {
      itemId: id,
      scaledQuantity: body.scaledQuantity,
    });
    return runManifestCommand({
      entity: "PrepListItem",
      command: "updateQuantity",
      body: { id, scaledQuantity: body.scaledQuantity, userId: user.id },
      user: userCtx,
    });
  }

  // 3. Preparation notes updates
  if (body.preparationNotes !== undefined) {
    log.debug("[PrepListItem/PATCH] Delegating to updatePrepNotes command", {
      itemId: id,
    });
    return runManifestCommand({
      entity: "PrepListItem",
      command: "updatePrepNotes",
      body: { id, preparationNotes: body.preparationNotes, userId: user.id },
      user: userCtx,
    });
  }

  // 4. Station updates
  if (body.stationId !== undefined || body.stationName !== undefined) {
    log.debug("[PrepListItem/PATCH] Delegating to updateStation command", {
      itemId: id,
      stationId: body.stationId,
    });
    return runManifestCommand({
      entity: "PrepListItem",
      command: "updateStation",
      body: { id, stationId: body.stationId, stationName: body.stationName, userId: user.id },
      user: userCtx,
    });
  }

  // No recognized field to update
  log.error(
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

  log.debug(
    "[PrepListItem/DELETE] Delegating to manifest markUncompleted command",
    { itemId: id }
  );

  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;

  return runManifestCommand({
    entity: "PrepListItem",
    command: "markUncompleted",
    body: { ...rawBody, id, userId: user.id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
