import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { triggerTaskCompletedSms } from "@repo/notifications";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
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
  pending: "release",
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
    log.error("[KitchenTask/PATCH] Failed to parse request body", { error });
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
      log.error(
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

    log.debug(
      `[KitchenTask/PATCH] Mapping status="${newStatus}" to command="${commandName}"`,
      { taskId: id }
    );

    // Fire-and-forget SMS trigger for task completion
    if (commandName === "complete") {
      (async () => {
        try {
          const { orgId, userId: clerkId } = await auth();
          if (orgId && clerkId) {
            const tenantId = await getTenantIdForOrg(orgId);
            const currentUser = await database.user.findFirst({
              where: { AND: [{ tenantId }, { authUserId: clerkId }] },
            });
            if (tenantId && currentUser) {
              const task = await database.prepTask.findFirst({
                where: { AND: [{ tenantId }, { id }, { deletedAt: null }] },
              });
              if (task) {
                triggerTaskCompletedSms({
                  tenantId,
                  taskId: id,
                  taskName: task.name,
                  completedByEmployeeId: currentUser.id,
                  completedByName:
                    `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
                }).catch(() => {});
              }
            }
          }
        } catch {
          // SMS trigger failure must never affect the route response
        }
      })();
    }

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
        // release command requires reason
        ...(commandName === "release" && {
          reason: reqBody.reason || "Released via task update",
        }),
      }),
    });
  }

  // Non-status field updates — map to specific manifest commands where possible
  if (body.priority !== undefined) {
    log.debug("[KitchenTask/PATCH] Delegating to updatePriority command", {
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
    log.debug("[KitchenTask/PATCH] Delegating to updateComplexity command", {
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

  if (body.title !== undefined) {
    log.debug("[KitchenTask/PATCH] Delegating to updateTitle command", {
      taskId: id,
      title: body.title,
    });
    return executeManifestCommand(request, {
      entityName: "KitchenTask",
      commandName: "updateTitle",
      params: { id },
      transformBody: (reqBody, ctx) => ({
        id,
        title: reqBody.title,
        userId: ctx.userId,
      }),
    });
  }

  if (body.summary !== undefined) {
    log.debug("[KitchenTask/PATCH] Delegating to updateSummary command", {
      taskId: id,
      summary: body.summary,
    });
    return executeManifestCommand(request, {
      entityName: "KitchenTask",
      commandName: "updateSummary",
      params: { id },
      transformBody: (reqBody, ctx) => ({
        id,
        summary: reqBody.summary,
        userId: ctx.userId,
      }),
    });
  }

  if (body.dueDate !== undefined) {
    log.debug("[KitchenTask/PATCH] Delegating to updateDueDate command", {
      taskId: id,
      dueDate: body.dueDate,
    });
    return executeManifestCommand(request, {
      entityName: "KitchenTask",
      commandName: "updateDueDate",
      params: { id },
      transformBody: (reqBody, ctx) => ({
        id,
        dueDate: reqBody.dueDate,
        userId: ctx.userId,
      }),
    });
  }

  if (body.tags !== undefined) {
    log.debug("[KitchenTask/PATCH] Delegating to updateTags command", {
      taskId: id,
      tags: body.tags,
    });
    return executeManifestCommand(request, {
      entityName: "KitchenTask",
      commandName: "updateTags",
      params: { id },
      transformBody: (reqBody, ctx) => ({
        id,
        tags: reqBody.tags,
        userId: ctx.userId,
      }),
    });
  }
}

/**
 * Soft-delete (cancel) a kitchen task via manifest cancel command.
 *
 * DELETE /api/kitchen/tasks/:id
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  log.debug("[KitchenTask/DELETE] Delegating to cancel command", {
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
