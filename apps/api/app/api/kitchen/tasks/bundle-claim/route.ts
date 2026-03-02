/**
 * Bundle Claim API Endpoint
 *
 * POST /api/kitchen/tasks/bundle-claim
 *
 * Atomically claims multiple tasks in a single transaction.
 * All tasks must be available for the claim to succeed.
 * If any task is already claimed or fails, the entire operation rolls back.
 */

import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import { claimPrepTask } from "@repo/manifest-adapters";
import { hasBlockingConstraints } from "@repo/manifest-adapters/api-response";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

import {
  type ApiSuccessResponse,
  createErrorResponse,
  createManifestRuntime,
  createOutboxEvent,
  loadTaskIntoManifest,
  mapManifestStatusToPrisma,
} from "../shared-task-helpers";

export const runtime = "nodejs";

interface BundleClaimRequest {
  taskIds: string[];
}

interface ClaimedTask {
  taskId: string;
  claimId: string;
  status: string;
}

interface FailedTask {
  taskId: string;
  reason: string;
}

export async function POST(request: Request) {
  // Step 1: Authenticate and extract context
  const { orgId, userId: clerkId } = await auth();
  if (!(orgId && clerkId)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Get current user by Clerk ID
  const currentUser = await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: clerkId }],
    },
  });

  if (!currentUser) {
    return NextResponse.json(
      { success: false, message: "User not found in database" },
      { status: 400 }
    );
  }

  const userId = currentUser.id;

  // Step 2: Parse and validate request body
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

  // Step 3: Pre-check all tasks for existing claims (fail fast)
  const existingClaims = await database.kitchenTaskClaim.findMany({
    where: {
      AND: [{ tenantId }, { taskId: { in: taskIds } }, { releasedAt: null }],
    },
    select: {
      taskId: true,
    },
  });

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

  // Step 4: Fetch all tasks
  const tasks = await database.prepTask.findMany({
    where: {
      AND: [{ tenantId }, { id: { in: taskIds } }, { deletedAt: null }],
    },
  });

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

  // Step 5: Create Manifest runtime (shared for all tasks)
  const runtimeResult = await createManifestRuntime({
    tenantId,
    userId,
    userRole: currentUser.role,
  });

  if (!(runtimeResult.success && runtimeResult.runtime)) {
    return createErrorResponse(
      runtimeResult.error?.message ?? "Failed to create runtime",
      runtimeResult.error?.status ?? 500
    );
  }

  const runtime = runtimeResult.runtime;
  const claimedTasks: ClaimedTask[] = [];
  const failedTasks: FailedTask[] = [];

  // Step 6: Process each task atomically using database transaction
  // We use a transaction to ensure all-or-nothing semantics
  try {
    await database.$transaction(async (tx) => {
      for (const task of tasks) {
        // Load task into Manifest
        await loadTaskIntoManifest(
          runtime,
          task as Prisma.PrepTaskGetPayload<Record<string, never>>
        );

        // Execute claim command
        const result = await claimPrepTask(runtime, task.id, userId, "");

        // Check for blocking constraints
        if (hasBlockingConstraints(result)) {
          failedTasks.push({
            taskId: task.id,
            reason: "Constraint violation",
          });
          // Roll back the entire transaction by throwing
          throw new Error(`Constraint violation for task ${task.id}`);
        }

        // Get instance for status
        const instance = await runtime.getInstance("PrepTask", task.id);
        if (!instance) {
          failedTasks.push({
            taskId: task.id,
            reason: "Failed to get instance",
          });
          throw new Error(`Failed to get instance for task ${task.id}`);
        }

        // Update task status via transaction
        await tx.prepTask.update({
          where: { tenantId_id: { tenantId, id: task.id } },
          data: {
            status: mapManifestStatusToPrisma(instance.status as string),
          },
        });

        // Create claim record via transaction
        const claim = await tx.kitchenTaskClaim.create({
          data: {
            tenantId,
            taskId: task.id,
            employeeId: userId,
          },
        });

        // Create progress entry if status changed
        if (task.status !== "in_progress") {
          const fullName =
            `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim();
          await tx.kitchenTaskProgress.create({
            data: {
              tenantId,
              taskId: task.id,
              employeeId: userId,
              progressType: "status_change",
              oldStatus: task.status,
              newStatus: "in_progress",
              notes: `Task claimed by ${fullName} (bundle)`,
            },
          });
        }

        claimedTasks.push({
          taskId: task.id,
          claimId: claim.id,
          status: "in_progress",
        });
      }
    });

    // Step 7: Create outbox events for real-time updates (after successful transaction)
    for (const claimed of claimedTasks) {
      await createOutboxEvent(
        tenantId,
        claimed.taskId,
        "kitchen.task.claimed",
        {
          taskId: claimed.taskId,
          claimId: claimed.claimId,
          employeeId: userId,
          status: "in_progress" as const,
          bundleClaim: true,
        } as Prisma.InputJsonValue
      );
    }

    // Step 8: Return success response
    const successResponse: ApiSuccessResponse<{
      claimed: ClaimedTask[];
      totalClaimed: number;
    }> = {
      success: true,
      data: {
        claimed: claimedTasks,
        totalClaimed: claimedTasks.length,
      },
    };

    return NextResponse.json(successResponse, { status: 201 });
  } catch (error) {
    // Transaction failed - all changes rolled back
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check if it was a constraint violation
    if (errorMessage.includes("Constraint violation")) {
      return NextResponse.json(
        {
          success: false,
          message: "Bundle claim failed due to constraint violation",
          errorCode: "CONSTRAINT_VIOLATION",
          failedTasks,
        },
        { status: 400 }
      );
    }

    // Check if it was an instance error
    if (errorMessage.includes("Failed to get instance")) {
      return NextResponse.json(
        {
          success: false,
          message: "Bundle claim failed - could not process some tasks",
          errorCode: "PROCESSING_ERROR",
          failedTasks,
        },
        { status: 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        message: "Bundle claim failed",
        errorCode: "BUNDLE_CLAIM_FAILED",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
