/**
 * Bundle Claim API Endpoint
 *
 * POST /api/kitchen/tasks/bundle-claim
 *
 * Claims multiple tasks by delegating each to the Manifest runtime.
 * Each task is claimed independently via runManifestCommand.
 */

import { database } from "@repo/database";
import { triggerTaskAssignedSms } from "@repo/notifications";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

interface BundleClaimRequest {
  taskIds: string[];
}

interface ClaimedTask {
  status: string;
  taskId: string;
}

interface FailedTask {
  reason: string;
  taskId: string;
}

export async function POST(request: Request) {
  const user = await resolveCurrentUser(request);

  // Parse and validate request body
  let body: BundleClaimRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { taskIds } = body;

  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return NextResponse.json(
      { success: false, message: "taskIds must be a non-empty array" },
      { status: 400 }
    );
  }

  // Limit bundle size to prevent abuse
  if (taskIds.length > 20) {
    return NextResponse.json(
      { success: false, message: "Cannot claim more than 20 tasks at once" },
      { status: 400 }
    );
  }

  // Pre-check: verify tasks exist and are not already claimed
  const [tasks, existingClaims] = await Promise.all([
    database.kitchenTask.findMany({
      where: {
        AND: [
          { tenantId: user.tenantId },
          { id: { in: taskIds } },
          { deletedAt: null },
        ],
      },
      select: { id: true, title: true, dueDate: true },
    }),
    database.kitchenTaskClaim.findMany({
      where: {
        AND: [
          { tenantId: user.tenantId },
          { taskId: { in: taskIds } },
          { releasedAt: null },
        ],
      },
      select: { taskId: true },
    }),
  ]);

  // Check for already-claimed tasks
  if (existingClaims.length > 0) {
    const alreadyClaimedIds = existingClaims.map((c) => c.taskId);
    return NextResponse.json(
      {
        success: false,
        message: "Some tasks are already claimed",
        errorCode: "TASKS_ALREADY_CLAIMED",
        alreadyClaimedTaskIds: alreadyClaimedIds,
      },
      { status: 409 }
    );
  }

  // Check for missing tasks
  const foundTaskIds = new Set(tasks.map((t) => t.id));
  const missingTaskIds = taskIds.filter((id) => !foundTaskIds.has(id));

  if (missingTaskIds.length > 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Some tasks not found",
        errorCode: "TASKS_NOT_FOUND",
        notFoundTaskIds: missingTaskIds,
      },
      { status: 404 }
    );
  }

  // Claim each task via Manifest runtime
  const claimedTasks: ClaimedTask[] = [];
  const failedTasks: FailedTask[] = [];

  for (const taskId of taskIds) {
    const response = await runManifestCommand({
      entity: "KitchenTask",
      command: "claim",
      body: {
        id: taskId,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (response.ok) {
      claimedTasks.push({
        taskId,
        status: "in_progress",
      });
    } else {
      // Parse error message from response
      let reason = "Unknown error";
      try {
        const body = await response.json();
        reason = body.message || body.error || "Unknown error";
      } catch {
        // Use default reason
      }
      failedTasks.push({ taskId, reason });
    }
  }

  // Fire-and-forget SMS triggers for each claimed task
  if (claimedTasks.length > 0) {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    for (const claimed of claimedTasks) {
      const task = taskMap.get(claimed.taskId);
      triggerTaskAssignedSms({
        tenantId: user.tenantId,
        taskId: claimed.taskId,
        taskName: task?.title ?? "Unknown task",
        employeeId: user.id,
        employeeName: fullName,
        dueDate: task?.dueDate?.toISOString(),
      }).catch(() => {});
    }
  }

  // Return results
  if (failedTasks.length === 0) {
    return NextResponse.json(
      {
        success: true,
        data: {
          claimed: claimedTasks,
          totalClaimed: claimedTasks.length,
        },
      },
      { status: 201 }
    );
  }

  // Partial failure
  if (claimedTasks.length > 0) {
    return NextResponse.json(
      {
        success: true,
        data: {
          claimed: claimedTasks,
          totalClaimed: claimedTasks.length,
        },
        partialFailure: true,
        failedTasks,
      },
      { status: 207 }
    );
  }

  // Total failure
  return NextResponse.json(
    {
      success: false,
      message: "Bundle claim failed",
      errorCode: "BUNDLE_CLAIM_FAILED",
      failedTasks,
    },
    { status: 400 }
  );
}
