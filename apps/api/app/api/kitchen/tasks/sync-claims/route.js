Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
async function processClaimAction(tenantId, taskId, currentUser) {
  const task = await database_1.database.kitchenTask.findFirst({
    where: {
      AND: [{ tenantId }, { id: taskId }, { deletedAt: null }],
    },
  });
  if (!task) {
    return { success: false, error: "Task not found" };
  }
  const existingClaim = await database_1.database.kitchenTaskClaim.findFirst({
    where: {
      AND: [{ tenantId }, { taskId }, { releasedAt: null }],
    },
  });
  if (existingClaim) {
    if (existingClaim.employeeId === currentUser.id) {
      return { success: true };
    }
    return { success: false, error: "Task already claimed by another user" };
  }
  await database_1.database.kitchenTaskClaim.create({
    data: {
      tenantId,
      taskId,
      employeeId: currentUser.id,
    },
  });
  if (task.status === "pending") {
    await database_1.database.kitchenTask.update({
      where: { tenantId_id: { tenantId, id: taskId } },
      data: { status: "in_progress" },
    });
    await database_1.database.kitchenTaskProgress.create({
      data: {
        tenantId,
        taskId,
        employeeId: currentUser.id,
        progressType: "status_change",
        oldStatus: "pending",
        newStatus: "in_progress",
        notes:
          "Task claimed by " +
          (currentUser.firstName || "") +
          " " +
          (currentUser.lastName || "") +
          " (offline sync)",
      },
    });
  }
  await database_1.database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: "KitchenTask",
      aggregateId: taskId,
      eventType: "kitchen.task.claimed",
      payload: {
        taskId,
        employeeId: currentUser.id,
        status: task.status === "pending" ? "in_progress" : task.status,
      },
      status: "pending",
    },
  });
  return { success: true };
}
async function processReleaseAction(tenantId, taskId, currentUser) {
  const existingClaim = await database_1.database.kitchenTaskClaim.findFirst({
    where: {
      AND: [
        { tenantId },
        { taskId },
        { employeeId: currentUser.id },
        { releasedAt: null },
      ],
    },
  });
  if (!existingClaim) {
    return { success: false, error: "No active claim found for this task" };
  }
  await database_1.database.kitchenTaskClaim.update({
    where: { tenantId_id: { tenantId, id: existingClaim.id } },
    data: {
      releasedAt: new Date(),
      releaseReason: "Released via offline sync",
    },
  });
  const otherClaims = await database_1.database.kitchenTaskClaim.findMany({
    where: {
      AND: [
        { tenantId },
        { taskId },
        { id: { not: existingClaim.id } },
        { releasedAt: null },
      ],
    },
  });
  if (otherClaims.length === 0) {
    const task = await database_1.database.kitchenTask.findFirst({
      where: {
        AND: [{ tenantId }, { id: taskId }],
      },
      select: { status: true },
    });
    if (task && task.status === "in_progress") {
      await database_1.database.kitchenTask.update({
        where: { tenantId_id: { tenantId, id: taskId } },
        data: { status: "pending" },
      });
      await database_1.database.kitchenTaskProgress.create({
        data: {
          tenantId,
          taskId,
          employeeId: currentUser.id,
          progressType: "status_change",
          oldStatus: "in_progress",
          newStatus: "pending",
          notes:
            "Task released by " +
            (currentUser.firstName || "") +
            " " +
            (currentUser.lastName || "") +
            " (offline sync)",
        },
      });
    }
  }
  await database_1.database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: "KitchenTask",
      aggregateId: taskId,
      eventType: "kitchen.task.released",
      payload: {
        taskId,
        employeeId: currentUser.id,
      },
      status: "pending",
    },
  });
  return { success: true };
}
async function processSingleAction(tenantId, claimAction, currentUser) {
  const { taskId, action } = claimAction;
  if (!(taskId && action)) {
    return {
      taskId: taskId || "unknown",
      action: action || "unknown",
      error: "Missing taskId or action",
    };
  }
  if (action === "claim") {
    const result = await processClaimAction(tenantId, taskId, currentUser);
    if (!result.success) {
      return { taskId, action, error: result.error };
    }
    return { taskId, action };
  }
  if (action === "release") {
    const result = await processReleaseAction(tenantId, taskId, currentUser);
    if (!result.success) {
      return { taskId, action, error: result.error };
    }
    return { taskId, action };
  }
  return {
    taskId,
    action,
    error: "Unknown action: " + action,
  };
}
async function POST(request) {
  const { orgId, userId: clerkId } = await (0, server_1.auth)();
  if (!(orgId && clerkId)) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const body = await request.json();
  if (!(body.claims && Array.isArray(body.claims))) {
    return server_2.NextResponse.json(
      { message: "Invalid request: 'claims' array required" },
      { status: 400 }
    );
  }
  const currentUser = await database_1.database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: clerkId }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });
  if (!currentUser) {
    return server_2.NextResponse.json(
      { message: "User not found in database" },
      { status: 400 }
    );
  }
  const results = {
    successful: [],
    failed: [],
  };
  for (const claimAction of body.claims) {
    try {
      const result = await processSingleAction(
        tenantId,
        claimAction,
        currentUser
      );
      if (result && result.error) {
        results.failed.push({
          taskId: claimAction.taskId || "unknown",
          action: claimAction.action || "unknown",
          error: result.error,
        });
      } else if (result) {
        results.successful.push(result);
      }
    } catch (_error) {
      results.failed.push({
        taskId: claimAction.taskId || "unknown",
        action: claimAction.action || "unknown",
        error: "Unknown error",
      });
    }
  }
  return server_2.NextResponse.json({
    results,
    summary: {
      total: body.claims.length,
      successful: results.successful.length,
      failed: results.failed.length,
    },
  });
}
