import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import {
  claimPrepTask,
  createPrepTaskRuntime,
  type KitchenOpsContext,
} from "@repo/manifest-adapters";
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  createNextResponse,
  hasBlockingConstraints,
} from "@repo/manifest-adapters/api-response";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
  const { orgId, userId: clerkId } = await auth();
  if (!(orgId && clerkId)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;
  const body = await request.json();
  const stationId = body.stationId || "";

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

  // Check for existing active claim before invoking Manifest
  const existingClaim = await database.kitchenTaskClaim.findFirst({
    where: {
      AND: [{ tenantId }, { taskId: id }, { releasedAt: null }],
    },
  });

  if (existingClaim) {
    return NextResponse.json(
      {
        success: false,
        message: "Task already claimed. Please release it first.",
        errorCode: "TASK_ALREADY_CLAIMED",
      },
      { status: 409 }
    );
  }

  // Create the Manifest runtime context
  const { createPrismaStoreProvider } = await import(
    "@repo/manifest-adapters/prisma-store"
  );

  const runtimeContext: KitchenOpsContext = {
    tenantId,
    userId: currentUser.id,
    userRole: currentUser.role,
    storeProvider: createPrismaStoreProvider(database, tenantId),
  };

  try {
    // Create the runtime with Prisma backing
    const runtime = await createPrepTaskRuntime(runtimeContext);

    // Load the task into Manifest from Prisma
    const task = await database.prepTask.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, message: "Task not found" },
        { status: 404 }
      );
    }

    // Load the task entity into Manifest
    await runtime.createInstance("PrepTask", {
      id: task.id,
      tenantId: task.tenantId,
      eventId: task.eventId,
      name: task.name,
      taskType: task.taskType,
      status: mapPrismaStatusToManifest(task.status),
      priority: task.priority,
      quantityTotal: Number(task.quantityTotal),
      quantityUnitId: task.quantityUnitId ?? "",
      quantityCompleted: Number(task.quantityCompleted),
      servingsTotal: task.servingsTotal ?? 0,
      startByDate: task.startByDate ? task.startByDate.getTime() : 0,
      dueByDate: task.dueByDate ? task.dueByDate.getTime() : 0,
      locationId: task.locationId,
      dishId: task.dishId ?? "",
      recipeVersionId: task.recipeVersionId ?? "",
      methodId: task.methodId ?? "",
      containerId: task.containerId ?? "",
      estimatedMinutes: task.estimatedMinutes ?? 0,
      actualMinutes: task.actualMinutes ?? 0,
      notes: task.notes ?? "",
      stationId: "",
      claimedBy: "",
      claimedAt: 0,
      createdAt: task.createdAt.getTime(),
      updatedAt: task.updatedAt.getTime(),
    });

    // Execute the claim command via Manifest
    const result = await claimPrepTask(runtime, id, currentUser.id, stationId);

    // Check for blocking constraints using standardized helper
    if (hasBlockingConstraints(result)) {
      return createNextResponse(
        NextResponse,
        result,
        { taskId: id },
        { errorMessagePrefix: "Cannot claim task" }
      );
    }

    // Sync the updated state back to Prisma
    const instance = await runtime.getInstance("PrepTask", id);
    if (instance) {
      // Update task status
      await database.prepTask.update({
        where: { tenantId_id: { tenantId, id } },
        data: {
          status: mapManifestStatusToPrisma(instance.status as string),
        },
      });

      // Create claim record
      const claim = await database.kitchenTaskClaim.create({
        data: {
          tenantId,
          taskId: id,
          employeeId: currentUser.id,
        },
      });

      // Create progress entry for status change
      if (task.status !== "in_progress") {
        await database.kitchenTaskProgress.create({
          data: {
            tenantId,
            taskId: id,
            employeeId: currentUser.id,
            progressType: "status_change",
            oldStatus: task.status,
            newStatus: "in_progress",
            notes: `Task claimed by ${currentUser.firstName || ""} ${currentUser.lastName || ""}`,
          },
        });
      }

      // Create outbox event for downstream consumers
      await database.outboxEvent.create({
        data: {
          tenantId,
          aggregateType: "KitchenTask",
          aggregateId: id,
          eventType: "kitchen.task.claimed",
          payload: {
            taskId: id,
            claimId: claim.id,
            employeeId: currentUser.id,
            status: "in_progress" as const,
            constraintOutcomes: result.constraintOutcomes,
          } as Prisma.InputJsonValue,
          status: "pending" as const,
        },
      });

      // Return standardized success response
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

    return NextResponse.json(
      { success: false, message: "Failed to claim task" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error claiming task via Manifest:", error);

    const errorResponse: ApiErrorResponse = {
      success: false,
      message: "Failed to claim task",
      error: error instanceof Error ? error.message : String(error),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Map Prisma status to Manifest status
 */
function mapPrismaStatusToManifest(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "open",
    in_progress: "in_progress",
    done: "done",
    completed: "done",
    canceled: "canceled",
  };
  return statusMap[status] ?? status;
}

/**
 * Map Manifest status to Prisma status
 */
function mapManifestStatusToPrisma(status: string): string {
  const statusMap: Record<string, string> = {
    open: "pending",
    in_progress: "in_progress",
    done: "done",
    canceled: "canceled",
  };
  return statusMap[status] ?? status;
}
