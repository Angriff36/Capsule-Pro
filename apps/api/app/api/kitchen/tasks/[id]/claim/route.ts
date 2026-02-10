import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import { claimPrepTask } from "@repo/manifest-adapters";
import {
  createNextResponse,
  hasBlockingConstraints,
} from "@repo/manifest-adapters/api-response";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

import {
  type ApiSuccessResponse,
  checkExistingClaim,
  createErrorResponse,
  createManifestRuntime,
  createOutboxEvent,
  createProgressEntry,
  createTaskClaim,
  fetchTask,
  loadTaskIntoManifest,
  mapManifestStatusToPrisma,
  updateTaskStatus,
} from "../../shared-task-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Claim a prep task using Manifest runtime
 *
 * POST /api/kitchen/tasks/:id/claim
 *
 * This endpoint uses the Manifest runtime for:
 * - Constraint checking (task availability, status validation)
 * - Event emission (PrepTaskClaimed)
 * - Audit logging
 *
 * The runtime is backed by Prisma for persistence.
 *
 * Response format (standardized):
 * - Success: { success: true, data: { claim, ... }, emittedEvents: [...] }
 * - Error: { success: false, message: "...", constraintOutcomes: [...] }
 */
export async function POST(request: Request, context: RouteContext) {
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

  // Step 2: Extract request parameters
  const { id } = await context.params;
  const body = await request.json();
  const stationId = body.stationId || "";

  // Step 3: Check for existing active claim
  const claimCheck = await checkExistingClaim(tenantId, id);
  if (claimCheck.hasExistingClaim && claimCheck.error) {
    return NextResponse.json(
      {
        success: false,
        message: claimCheck.error.message,
        errorCode: "TASK_ALREADY_CLAIMED",
      },
      { status: claimCheck.error.status }
    );
  }

  // Step 4: Fetch task
  const taskFetch = await fetchTask(tenantId, id);
  if (!(taskFetch.success && taskFetch.task)) {
    return createErrorResponse(
      taskFetch.error?.message ?? "Unknown error",
      taskFetch.error?.status ?? 500
    );
  }

  const task = taskFetch.task;

  // Step 5: Create Manifest runtime
  const runtimeResult = await createManifestRuntime({
    tenantId,
    userId,
    userRole: currentUser.role,
  });
  if (!(runtimeResult.success && runtimeResult.runtime)) {
    return createErrorResponse(
      runtimeResult.error?.message ?? "Unknown error",
      runtimeResult.error?.status ?? 500
    );
  }

  const runtime = runtimeResult.runtime;

  // Step 6: Load task into Manifest
  await loadTaskIntoManifest(runtime, task);

  // Step 7: Execute claim command
  const result = await claimPrepTask(runtime, id, userId, stationId);

  // Step 8: Check for blocking constraints
  if (hasBlockingConstraints(result)) {
    return createNextResponse(
      NextResponse,
      result,
      { taskId: id },
      { errorMessagePrefix: "Cannot claim task" }
    );
  }

  // Step 9: Sync updated state back to Prisma
  const instance = await runtime.getInstance("PrepTask", id);
  if (!instance) {
    return createErrorResponse("Failed to claim task", 500);
  }

  // Step 10: Update task status
  await updateTaskStatus(
    tenantId,
    id,
    mapManifestStatusToPrisma(instance.status as string)
  );

  // Step 11: Create claim record
  const claim = await createTaskClaim(tenantId, id, userId);

  // Step 12: Create progress entry if status changed
  if (task.status !== "in_progress") {
    const fullName =
      `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim();
    await createProgressEntry(
      tenantId,
      id,
      userId,
      task.status,
      "in_progress",
      `Task claimed by ${fullName}`
    );
  }

  // Step 13: Create outbox event for real-time updates
  await createOutboxEvent(tenantId, id, "kitchen.task.claimed", {
    taskId: id,
    claimId: claim.id,
    employeeId: userId,
    status: "in_progress" as const,
    constraintOutcomes: result.constraintOutcomes,
  } as Prisma.InputJsonValue);

  // Step 14: Return success response
  const successResponse: ApiSuccessResponse<{
    claim: typeof claim;
    taskId: string;
    status: string;
  }> = {
    success: true,
    data: {
      claim,
      taskId: id,
      status: "in_progress",
    },
    emittedEvents: result.emittedEvents,
  };

  return NextResponse.json(successResponse, { status: 201 });
}
