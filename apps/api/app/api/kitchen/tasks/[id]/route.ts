import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { triggerTaskCompletedSms } from "@repo/notifications";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

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
  const user = await resolveCurrentUser(request);

  // Clone the request so we can read the body to determine the command,
  // then parsing it locally for command dispatch
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

    return runManifestCommand({
      entity: "KitchenTask",
      command: commandName,
      body: {
        ...body,
        id,
        userId: user.id,
        // cancel command requires reason and canceledBy
        ...(commandName === "cancel" && {
          reason: body.reason || "Cancelled via task update",
          canceledBy: user.id,
        }),
        // release command requires reason
        ...(commandName === "release" && {
          reason: body.reason || "Released via task update",
        }),
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  }

  // Non-status field updates — map to specific manifest commands where possible
  if (body.priority !== undefined) {
    log.debug("[KitchenTask/PATCH] Delegating to updatePriority command", {
      taskId: id,
      priority: body.priority,
    });
    return runManifestCommand({
      entity: "KitchenTask",
      command: "updatePriority",
      body: {
        id,
        priority: body.priority,
        userId: user.id,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  }

  if (body.complexity !== undefined) {
    log.debug("[KitchenTask/PATCH] Delegating to updateComplexity command", {
      taskId: id,
      complexity: body.complexity,
    });
    return runManifestCommand({
      entity: "KitchenTask",
      command: "updateComplexity",
      body: {
        id,
        complexity: body.complexity,
        userId: user.id,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  }

  if (body.title !== undefined) {
    log.debug("[KitchenTask/PATCH] Delegating to updateTitle command", {
      taskId: id,
      title: body.title,
    });
    return runManifestCommand({
      entity: "KitchenTask",
      command: "updateTitle",
      body: {
        id,
        title: body.title,
        userId: user.id,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  }

  if (body.summary !== undefined) {
    log.debug("[KitchenTask/PATCH] Delegating to updateSummary command", {
      taskId: id,
      summary: body.summary,
    });
    return runManifestCommand({
      entity: "KitchenTask",
      command: "updateSummary",
      body: {
        id,
        summary: body.summary,
        userId: user.id,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  }

  if (body.dueDate !== undefined) {
    log.debug("[KitchenTask/PATCH] Delegating to updateDueDate command", {
      taskId: id,
      dueDate: body.dueDate,
    });
    return runManifestCommand({
      entity: "KitchenTask",
      command: "updateDueDate",
      body: {
        id,
        dueDate: body.dueDate,
        userId: user.id,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  }

  if (body.tags !== undefined) {
    log.debug("[KitchenTask/PATCH] Delegating to updateTags command", {
      taskId: id,
      tags: body.tags,
    });
    return runManifestCommand({
      entity: "KitchenTask",
      command: "updateTags",
      body: {
        id,
        tags: body.tags,
        userId: user.id,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  }

  return NextResponse.json(
    { message: "No supported task fields provided for update" },
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
  const user = await resolveCurrentUser(request);

  log.debug("[KitchenTask/DELETE] Delegating to cancel command", {
    taskId: id,
  });

  return runManifestCommand({
    entity: "KitchenTask",
    command: "cancel",
    body: {
      id,
      reason: "Deleted via API",
      canceledBy: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
