import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type ClaimAction = {
  taskId: string;
  action: string;
  timestamp: string;
};

type SyncResult = {
  successful: Array<{ taskId: string; action: string }>;
  failed: Array<{ taskId: string; action: string; error: string }>;
};

type User = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

/**
 * POST /api/kitchen/tasks/sync-claims
 *
 * Syncs offline claim operations from the client.
 * Used when a user was offline and made claims that need to be synced.
 *
 * Expected body:
 * {
 *   claims: Array<{
 *     taskId: string;
 *     action: 'claim' | 'release';
 *     timestamp: string; // ISO timestamp of when action occurred offline
 *   }>
 * }
 */

async function processClaimAction(
  tenantId: string,
  taskId: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  // Check if task exists
  const task = await database.kitchenTask.findFirst({
    where: {
      AND: [{ tenantId }, { id: taskId }, { deletedAt: null }],
    },
  });

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  // Check if there's already an active claim for this task
  const existingClaim = await database.kitchenTaskClaim.findFirst({
    where: {
      AND: [{ tenantId }, { taskId }, { releasedAt: null }],
    },
  });

  if (existingClaim) {
    // Check if it's already claimed by this user
    if (existingClaim.employeeId === currentUser.id) {
      return { success: true };
    }
    // Someone else claimed it
    return { success: false, error: "Task already claimed by another user" };
  }

  // Create claim
  await database.kitchenTaskClaim.create({
    data: {
      tenantId,
      taskId,
      employeeId: currentUser.id,
    },
  });

  // Update task status if needed
  if (task.status === "pending") {
    await database.kitchenTask.update({
      where: { tenantId_id: { tenantId, id: taskId } },
      data: { status: "in_progress" },
    });

    await database.kitchenTaskProgress.create({
      data: {
        tenantId,
        taskId,
        employeeId: currentUser.id,
        progressType: "status_change",
        oldStatus: "pending",
        newStatus: "in_progress",
        notes: `Task claimed by ${currentUser.firstName || ""} ${currentUser.lastName || ""} (offline sync)`,
      },
    });
  }

  // Create outbox event
  await database.outboxEvent.create({
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
      status: "pending" as const,
    },
  });

  return { success: true };
}

async function processReleaseAction(
  tenantId: string,
  taskId: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  // Find active claim for this task by this user
  const existingClaim = await database.kitchenTaskClaim.findFirst({
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

  // Release the claim
  await database.kitchenTaskClaim.update({
    where: { tenantId_id: { tenantId, id: existingClaim.id } },
    data: {
      releasedAt: new Date(),
      releaseReason: "Released via offline sync",
    },
  });

  // Check if there are other active claims
  const otherClaims = await database.kitchenTaskClaim.findMany({
    where: {
      AND: [
        { tenantId },
        { taskId },
        { id: { not: existingClaim.id } },
        { releasedAt: null },
      ],
    },
  });

  // If no other claims, set task back to pending
  if (otherClaims.length === 0) {
    const task = await database.kitchenTask.findFirst({
      where: {
        AND: [{ tenantId }, { id: taskId }],
      },
      select: { status: true },
    });

    if (task && task.status === "in_progress") {
      await database.kitchenTask.update({
        where: { tenantId_id: { tenantId, id: taskId } },
        data: { status: "pending" },
      });

      await database.kitchenTaskProgress.create({
        data: {
          tenantId,
          taskId,
          employeeId: currentUser.id,
          progressType: "status_change",
          oldStatus: "in_progress",
          newStatus: "pending",
          notes: `Task released by ${currentUser.firstName || ""} ${currentUser.lastName || ""} (offline sync)`,
        },
      });
    }
  }

  // Create outbox event
  await database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: "KitchenTask",
      aggregateId: taskId,
      eventType: "kitchen.task.released",
      payload: {
        taskId,
        employeeId: currentUser.id,
      },
      status: "pending" as const,
    },
  });

  return { success: true };
}

async function processSingleAction(
  tenantId: string,
  claimAction: ClaimAction,
  currentUser: User
): Promise<{ taskId: string; action: string; error?: string } | null> {
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
    error: `Unknown action: ${action}`,
  };
}

export async function POST(request: Request) {
  const { orgId, userId: clerkId } = await auth();
  if (!(orgId && clerkId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = await request.json();

  // Validate request body
  if (!(body.claims && Array.isArray(body.claims))) {
    return NextResponse.json(
      { message: "Invalid request: 'claims' array required" },
      { status: 400 }
    );
  }

  // Get current user by Clerk ID
  const currentUser = await database.user.findFirst({
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
    return NextResponse.json(
      { message: "User not found in database" },
      { status: 400 }
    );
  }

  const results: SyncResult = {
    successful: [],
    failed: [],
  };

  // Process each claim action
  for (const claimAction of body.claims) {
    try {
      const result = await processSingleAction(
        tenantId,
        claimAction,
        currentUser
      );

      if (result?.error) {
        results.failed.push({
          taskId: result.taskId,
          action: result.action,
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

  return NextResponse.json({
    results,
    summary: {
      total: body.claims.length,
      successful: results.successful.length,
      failed: results.failed.length,
    },
  });
}
