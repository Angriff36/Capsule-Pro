import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Status-to-manifest-command mapping.
 *
 * Maps the desired target status to the manifest command that performs
 * the transition. The manifest runtime enforces valid transitions via
 * guards, so we don't need to duplicate transition validation here.
 */
const STATUS_TO_COMMAND: Record<string, string> = {
  in_progress: "start",
  done: "complete",
  cancelled: "cancel",
};

/**
 * Update a kitchen task via manifest commands.
 *
 * For status transitions, maps the target status to the appropriate
 * manifest command (start, complete, cancel). The manifest runtime
 * enforces valid transitions via guards and emits events.
 *
 * PATCH /api/kitchen/tasks/:id
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Clone the request so we can read the body to determine the command,
  // while still passing the original request to executeManifestCommand
  const clonedRequest = request.clone();
  let body: Record<string, unknown> = {};
  try {
    body = await clonedRequest.json();
  } catch (error) {
    console.error("[KitchenTask/PATCH] Failed to parse request body:", error);
    return NextResponse.json(
      { message: "Invalid request body" },
      { status: 400 }
    );
  }

  const newStatus = body.status as string | undefined;

  // Determine which manifest command to use based on the status transition
  if (newStatus) {
    const commandName = STATUS_TO_COMMAND[newStatus];

    if (!commandName) {
      // TODO: "pending" status (reopen) doesn't have a dedicated manifest command yet.
      // For now, log and return an error. When a "reopen" command is added to the
      // manifest, map it here.
      console.error(
        `[KitchenTask/PATCH] No manifest command mapped for target status: "${newStatus}"`,
        { taskId: id, requestedStatus: newStatus }
      );
      return NextResponse.json(
        {
          message: `Status transition to "${newStatus}" is not yet supported via manifest commands`,
        },
        { status: 400 }
      );
    }

    console.log(
      `[KitchenTask/PATCH] Mapping status="${newStatus}" to command="${commandName}"`,
      { taskId: id }
    );

    return executeManifestCommand(request, {
      entityName: "KitchenTask",
      commandName,
      params: { id },
      transformBody: (reqBody, ctx) => ({
        ...reqBody,
        id,
        userId: ctx.userId,
        // cancel command requires reason and canceledBy
        ...(commandName === "cancel" && {
          reason: reqBody.reason || "Cancelled via task update",
          canceledBy: ctx.userId,
        }),
      }),
    });
  }

  // Non-status field updates — map to specific manifest commands where possible
  if (body.priority !== undefined) {
    console.log("[KitchenTask/PATCH] Delegating to updatePriority command", {
      taskId: id,
      priority: body.priority,
    });
    return executeManifestCommand(request, {
      entityName: "KitchenTask",
      commandName: "updatePriority",
      params: { id },
      transformBody: (reqBody, ctx) => ({
        id,
        priority: reqBody.priority,
        userId: ctx.userId,
      }),
    });
  }

  if (body.complexity !== undefined) {
    console.log("[KitchenTask/PATCH] Delegating to updateComplexity command", {
      taskId: id,
      complexity: body.complexity,
    });
    return executeManifestCommand(request, {
      entityName: "KitchenTask",
      commandName: "updateComplexity",
      params: { id },
      transformBody: (reqBody, ctx) => ({
        id,
        complexity: reqBody.complexity,
        userId: ctx.userId,
      }),
    });
  }

  // TODO: Handle other field updates (title, summary, dueDate, tags) when
  // corresponding manifest commands are available. For now, log and return error.
  console.error(
    "[KitchenTask/PATCH] No manifest command available for the requested update",
    { taskId: id, bodyKeys: Object.keys(body) }
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
 * Soft-delete (cancel) a kitchen task via manifest cancel command.
 *
 * DELETE /api/kitchen/tasks/:id
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  console.log("[KitchenTask/DELETE] Delegating to cancel command", {
    taskId: id,
  });

  return executeManifestCommand(request, {
    entityName: "KitchenTask",
    commandName: "cancel",
    params: { id },
    transformBody: (_body, ctx) => ({
      id,
      reason: "Deleted via API",
      canceledBy: ctx.userId,
    }),
  });
}
