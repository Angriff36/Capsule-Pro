/**
 * Shared helper functions for kitchen task route handlers.
 *
 * This module extracts common logic used across task routes to reduce
 * cognitive complexity and improve maintainability.
 */

import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import {
  createPrepTaskRuntime,
  type KitchenOpsContext,
  type PrepTaskCommandResult,
} from "@repo/manifest-adapters";
import { NextResponse } from "next/server";

// Re-export commonly used types
export type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "@repo/manifest-adapters/api-response";

// ============ Types ============

export interface TaskContext {
  tenantId: string;
  userId: string;
  userRole?: string;
}

export interface TaskAuthResult {
  success: boolean;
  tenantId?: string;
  userId?: string;
  userRole?: string;
  error?: { message: string; status: number };
}

export interface TaskFetchResult {
  success: boolean;
  task?: Prisma.PrepTaskGetPayload<Record<string, never>>;
  error?: { message: string; status: number };
}

export interface ClaimCheckResult {
  success: boolean;
  hasExistingClaim: boolean;
  claim?: Prisma.KitchenTaskClaimGetPayload<Record<string, never>>;
  error?: { message: string; status: number };
}

export interface ManifestRuntimeResult {
  success: boolean;
  runtime?: Awaited<ReturnType<typeof createPrepTaskRuntime>>;
  context?: KitchenOpsContext;
  error?: { message: string; status: number };
}

export interface StatusUpdateResult {
  success: boolean;
  updatedTask?: Prisma.PrepTaskGetPayload<Record<string, never>>;
  progressEntry?: Prisma.KitchenTaskProgressGetPayload<Record<string, never>>;
  claim?: Prisma.KitchenTaskClaimGetPayload<Record<string, never>>;
  outboxEvent?: Prisma.OutboxEventGetPayload<Record<string, never>>;
  error?: { message: string; status: number };
}

// ============ Authentication Helpers ============

/**
 * Authenticate and extract tenant/user context from request.
 */
export async function authenticateRequest(
  orgId: string | null,
  clerkId: string | null
): Promise<TaskAuthResult> {
  if (!(orgId && clerkId)) {
    return {
      success: false,
      error: { message: "Unauthorized", status: 401 },
    };
  }

  const { getTenantIdForOrg } = await import("@/app/lib/tenant");
  const tenantId = await getTenantIdForOrg(orgId);

  // Get current user by Clerk ID
  const currentUser = await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: clerkId }],
    },
  });

  if (!currentUser) {
    return {
      success: false,
      error: { message: "User not found in database", status: 400 },
    };
  }

  return {
    success: true,
    tenantId,
    userId: currentUser.id,
    userRole: currentUser.role,
  };
}

// ============ Task Fetching Helpers ============

/**
 * Fetch a task by ID with tenant isolation.
 */
export async function fetchTask(
  tenantId: string,
  taskId: string
): Promise<TaskFetchResult> {
  const task = await database.prepTask.findFirst({
    where: {
      AND: [{ tenantId }, { id: taskId }, { deletedAt: null }],
    },
  });

  if (!task) {
    return {
      success: false,
      error: { message: "Task not found", status: 404 },
    };
  }

  return {
    success: true,
    task: task as Prisma.PrepTaskGetPayload<Record<string, never>>,
  };
}

/**
 * Check if a task has an active claim.
 */
export async function checkExistingClaim(
  tenantId: string,
  taskId: string
): Promise<ClaimCheckResult> {
  const existingClaim = await database.kitchenTaskClaim.findFirst({
    where: {
      AND: [{ tenantId }, { taskId }, { releasedAt: null }],
    },
  });

  if (existingClaim) {
    return {
      success: true,
      hasExistingClaim: true,
      claim: existingClaim,
      error: {
        message: "Task already claimed. Please release it first.",
        status: 409,
      },
    };
  }

  return {
    success: true,
    hasExistingClaim: false,
  };
}

// ============ Manifest Runtime Helpers ============

/**
 * Create Manifest runtime context and instance.
 */
export async function createManifestRuntime(
  taskContext: TaskContext
): Promise<ManifestRuntimeResult> {
  const { createPrismaStoreProvider } = await import(
    "@repo/manifest-adapters/prisma-store"
  );

  const runtimeContext: KitchenOpsContext = {
    tenantId: taskContext.tenantId,
    userId: taskContext.userId,
    userRole: taskContext.userRole,
    storeProvider: createPrismaStoreProvider(database, taskContext.tenantId),
  };

  try {
    const runtime = await createPrepTaskRuntime(runtimeContext);
    return {
      success: true,
      runtime,
      context: runtimeContext,
    };
  } catch {
    return {
      success: false,
      error: {
        message: "Failed to create Manifest runtime",
        status: 500,
      },
    };
  }
}

/**
 * Load a task into the Manifest runtime.
 */
export async function loadTaskIntoManifest(
  runtime: Awaited<ReturnType<typeof createPrepTaskRuntime>>,
  task: Prisma.PrepTaskGetPayload<Record<string, never>>
): Promise<void> {
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
}

// ============ Status Update Helpers ============

/**
 * Update task status in database.
 */
export function updateTaskStatus(
  tenantId: string,
  taskId: string,
  newStatus: string
): Promise<Prisma.PrepTaskGetPayload<Record<string, never>>> {
  return database.prepTask.update({
    where: { tenantId_id: { tenantId, id: taskId } },
    data: {
      status: mapManifestStatusToPrisma(newStatus),
    },
  });
}

/**
 * Create a progress entry for status change.
 */
export function createProgressEntry(
  tenantId: string,
  taskId: string,
  employeeId: string,
  oldStatus: string,
  newStatus: string,
  notes?: string
): Promise<Prisma.KitchenTaskProgressGetPayload<Record<string, never>>> {
  return database.kitchenTaskProgress.create({
    data: {
      tenantId,
      taskId,
      employeeId,
      progressType: "status_change",
      oldStatus,
      newStatus,
      notes,
    },
  });
}

/**
 * Create a task claim record.
 */
export function createTaskClaim(
  tenantId: string,
  taskId: string,
  employeeId: string
): Promise<Prisma.KitchenTaskClaimGetPayload<Record<string, never>>> {
  return database.kitchenTaskClaim.create({
    data: {
      tenantId,
      taskId,
      employeeId,
    },
  });
}

/**
 * Create an outbox event for real-time updates.
 */
export function createOutboxEvent(
  tenantId: string,
  taskId: string,
  eventType: string,
  payload: Prisma.InputJsonValue
): Promise<Prisma.OutboxEventGetPayload<Record<string, never>>> {
  return database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: "KitchenTask",
      aggregateId: taskId,
      eventType,
      payload,
      status: "pending" as const,
    },
  });
}

// ============ Status Mapping Helpers ============

/**
 * Map Prisma status to Manifest status.
 */
export function mapPrismaStatusToManifest(status: string): string {
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
 * Map Manifest status to Prisma status.
 */
export function mapManifestStatusToPrisma(status: string): string {
  const statusMap: Record<string, string> = {
    open: "pending",
    in_progress: "in_progress",
    done: "done",
    canceled: "canceled",
  };
  return statusMap[status] ?? status;
}

// ============ Error Response Helpers ============

/**
 * Create a standardized error response.
 */
export function createErrorResponse(
  message: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  return NextResponse.json(
    {
      success: false,
      message,
      ...details,
    },
    { status }
  );
}

/**
 * Create a standardized success response.
 */
export function createSuccessResponse<T>(data: T, status = 200): Response {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

// ============ Validation Helpers ============

/**
 * Validate priority value.
 */
export function validatePriority(priority: unknown): {
  valid: boolean;
  error?: string;
} {
  if (
    priority !== undefined &&
    (typeof priority !== "number" || priority < 1 || priority > 10)
  ) {
    return {
      valid: false,
      error: "Priority must be an integer between 1 and 10",
    };
  }
  return { valid: true };
}

// ============ Status Update Operation Helpers ============

/**
 * Process a status change via Manifest command.
 * Handles complete, cancel, and release operations.
 */
export async function processStatusChange(
  tenantId: string,
  taskId: string,
  task: Prisma.PrepTaskGetPayload<Record<string, never>>,
  newStatus: string,
  employeeId: string | undefined,
  userRole?: string
): Promise<
  | { success: true; result: PrepTaskCommandResult; instance: unknown }
  | { success: false; error: { message: string; status: number } }
> {
  const { createPrismaStoreProvider } = await import(
    "@repo/manifest-adapters/prisma-store"
  );

  // Import Manifest commands
  const { completePrepTask, cancelPrepTask, releasePrepTask } = await import(
    "@repo/manifest-adapters"
  );

  // Create runtime context
  const runtimeContext: KitchenOpsContext = {
    tenantId,
    userId: employeeId || "",
    userRole,
    storeProvider: createPrismaStoreProvider(database, tenantId),
  };

  try {
    const runtime = await createPrepTaskRuntime(runtimeContext);

    // Load task into Manifest
    await loadTaskIntoManifest(runtime, task);

    let result: PrepTaskCommandResult | undefined;

    // Route status change to appropriate Manifest command
    if (newStatus === "done" || newStatus === "completed") {
      result = await completePrepTask(
        runtime,
        taskId,
        Number(task.quantityTotal),
        employeeId || ""
      );
    } else if (newStatus === "canceled") {
      result = await cancelPrepTask(
        runtime,
        taskId,
        "Canceled via API",
        employeeId || ""
      );
    } else if (newStatus === "pending" && task.status === "in_progress") {
      result = await releasePrepTask(
        runtime,
        taskId,
        employeeId || "",
        "Released via API"
      );
    }

    if (!result) {
      return {
        success: false,
        error: { message: "Invalid status transition", status: 400 },
      };
    }

    // Get instance for syncing
    const instance = await runtime.getInstance("PrepTask", taskId);

    return { success: true, result, instance };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Unknown error",
        status: 500,
      },
    };
  }
}

/**
 * Sync status update results to database.
 * Updates task status, creates progress entry, and emits outbox event.
 */
export async function syncStatusUpdateResults(
  tenantId: string,
  taskId: string,
  task: Prisma.PrepTaskGetPayload<Record<string, never>>,
  newStatus: string,
  employeeId: string | undefined,
  result: PrepTaskCommandResult,
  notes?: string
): Promise<{
  updatedTask: Prisma.PrepTaskGetPayload<Record<string, never>>;
  progressEntry?: Prisma.KitchenTaskProgressGetPayload<Record<string, never>>;
  outboxEvent: Prisma.OutboxEventGetPayload<Record<string, never>>;
}> {
  // Atomically: update task status + create progress entry + outbox event
  return database.$transaction(async (tx) => {
    const updatedTask = await tx.prepTask.update({
      where: { tenantId_id: { tenantId, id: taskId } },
      data: {
        status:
          newStatus === "done" ? "done" : mapManifestStatusToPrisma(newStatus),
      },
    });

    let progressEntry:
      | Prisma.KitchenTaskProgressGetPayload<Record<string, never>>
      | undefined;
    if (employeeId && newStatus !== task.status) {
      progressEntry = await tx.kitchenTaskProgress.create({
        data: {
          tenantId,
          taskId,
          employeeId,
          progressType: "status_change",
          oldStatus: task.status,
          newStatus,
          notes,
        },
      });
    }

    const outboxEvent = await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "KitchenTask",
        aggregateId: taskId,
        eventType: `kitchen.task.${newStatus === "done" ? "completed" : newStatus}`,
        payload: {
          taskId,
          status: newStatus as string,
          constraintOutcomes: result.constraintOutcomes,
        } as Prisma.InputJsonValue,
        status: "pending" as const,
      },
    });

    return { updatedTask, progressEntry, outboxEvent };
  });
}

/**
 * Handle non-status field updates (priority, notes, etc.)
 */
export function updateTaskFields(
  tenantId: string,
  taskId: string,
  updates: {
    priority?: number;
    notes?: string | null;
    estimatedMinutes?: number | null;
    actualMinutes?: number | null;
  }
): Promise<Prisma.PrepTaskGetPayload<Record<string, never>>> {
  const updateData: Prisma.PrepTaskUpdateInput = {};

  if (updates.priority !== undefined) {
    updateData.priority = updates.priority;
  }
  if (updates.notes !== undefined) {
    updateData.notes = updates.notes;
  }
  if (updates.estimatedMinutes !== undefined) {
    updateData.estimatedMinutes = updates.estimatedMinutes;
  }
  if (updates.actualMinutes !== undefined) {
    updateData.actualMinutes = updates.actualMinutes;
  }

  return database.prepTask.update({
    where: { tenantId_id: { tenantId, id: taskId } },
    data: updateData,
  });
}
