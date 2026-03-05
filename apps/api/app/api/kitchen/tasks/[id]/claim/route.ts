import { auth } from "@repo/auth/server";
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
  fetchTask,
  loadTaskIntoManifest,
} from "../../shared-task-helpers";

export const runtime = "nodejs";

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

  // Step 8: Handle command failures (guards, policies, blocking constraints)
  if (!result.success || hasBlockingConstraints(result)) {
    return createNextResponse(
      NextResponse,
      result,
      { taskId: id },
      { errorMessagePrefix: "Cannot claim task" }
    );
  }

  // Step 9: Read persisted claim record written by PrismaStore during runCommand
  const claim = await database.kitchenTaskClaim.findFirst({
    where: {
      AND: [
        { tenantId },
        { taskId: id },
        { employeeId: userId },
        { releasedAt: null },
      ],
    },
    orderBy: { claimedAt: "desc" },
  });

  if (!claim) {
    return createErrorResponse("Failed to claim task", 500);
  }

  // Step 10: Return success response
  const successResponse: ApiSuccessResponse<{
    claim: typeof claim;
    taskId: string;
    status: string;
  }> = {
    success: true,
    data: {
      claim,
      taskId: id,
      status: result.status ?? "in_progress",
    },
    emittedEvents: result.emittedEvents,
  };

  return NextResponse.json(successResponse, { status: 201 });
}
