"use server";

import {
  type KitchenTask,
  type KitchenTaskClaim,
  type KitchenTaskProgress,
  type KitchenTaskStatus,
  tenantDatabase,
} from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/app/lib/tenant";

// ============================================================================
// Helper Functions
// ============================================================================

const getString = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getOptionalString = (
  formData: FormData,
  key: string
): string | null | undefined => {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getDateTime = (formData: FormData, key: string): Date | undefined => {
  const value = getString(formData, key);

  if (!value) {
    return;
  }

  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? undefined : dateValue;
};

// enqueueOutboxEvent removed — outbox writes are now inlined inside $transaction blocks

// ============================================================================
// Query Operations
// ============================================================================

/**
 * List all kitchen tasks with optional filters
 */
export const getKitchenTasks = async (filters?: {
  status?: string;
  priority?: number;
}): Promise<KitchenTask[]> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  return client.kitchenTask.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Get a single kitchen task by ID
 */
export const getKitchenTaskById = async (
  taskId: string
): Promise<KitchenTask | null> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  return client.kitchenTask.findFirst({
    where: { id: taskId },
  });
};

/**
 * Get tasks filtered by status
 */
export const getKitchenTasksByStatus = async (
  status: string
): Promise<KitchenTask[]> => getKitchenTasks({ status });

/**
 * Get urgent priority tasks that are open or in progress
 */
export const getUrgentTasks = async (): Promise<KitchenTask[]> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  return client.kitchenTask.findMany({
    where: {
      priority: {
        lte: 2, // Urgent and Critical (1-2)
      },
      status: {
        in: ["open", "in_progress"],
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });
};

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new kitchen task
 */
export const createKitchenTask = async (
  formData: FormData
): Promise<KitchenTask> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  const title = getString(formData, "title");
  if (!title) {
    throw new Error("Task title is required.");
  }

  const summary = getOptionalString(formData, "summary") || "";
  const priorityStr = getString(formData, "priority");
  const priority = priorityStr ? Number.parseInt(priorityStr, 10) : undefined;
  const dueDate = getDateTime(formData, "dueDate");

  const task = await client.$transaction(async (tx) => {
    const created = await tx.kitchenTask.create({
      data: {
        tenantId,
        title,
        summary,
        priority: priority || 5, // default to medium (5)
        dueDate,
      },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "kitchen.task",
        aggregateId: created.id,
        eventType: "kitchen.task.created",
        payload: {
          taskId: created.id,
          title: created.title,
          priority: created.priority,
          status: created.status,
        },
        status: "pending" as const,
      },
    });

    return created;
  });

  revalidatePath("/kitchen/tasks");

  return task;
};

/**
 * Update kitchen task fields
 */
export const updateKitchenTask = async (
  formData: FormData
): Promise<KitchenTask> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  const taskId = getString(formData, "taskId");
  if (!taskId) {
    throw new Error("Task id is required.");
  }

  const title = getString(formData, "title");
  const summary = getOptionalString(formData, "summary");
  const priorityStr = getString(formData, "priority");
  const priority = priorityStr ? Number.parseInt(priorityStr, 10) : undefined;
  const dueDate = getDateTime(formData, "dueDate");

  const task = await client.$transaction(async (tx) => {
    const updated = await tx.kitchenTask.update({
      where: { tenantId_id: { tenantId, id: taskId } },
      data: {
        ...(title && { title }),
        ...(summary !== undefined && { summary: summary || "" }),
        ...(priority && { priority }),
        ...(dueDate && { dueDate }),
      },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "kitchen.task",
        aggregateId: updated.id,
        eventType: "kitchen.task.updated",
        payload: {
          taskId: updated.id,
          title: updated.title,
          priority: updated.priority,
          status: updated.status,
        },
        status: "pending" as const,
      },
    });

    return updated;
  });

  revalidatePath("/kitchen/tasks");

  return task;
};

/**
 * Update only the status of a task
 */
export const updateKitchenTaskStatus = async (
  taskId: string,
  status: KitchenTaskStatus
): Promise<KitchenTask> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  // Fetch the current task to capture the previous status
  const currentTask = await client.kitchenTask.findFirst({
    where: { id: taskId },
  });

  if (!currentTask) {
    throw new Error("Task not found.");
  }

  const previousStatus = currentTask.status;

  const task = await client.$transaction(async (tx) => {
    const updated = await tx.kitchenTask.update({
      where: { tenantId_id: { tenantId, id: taskId } },
      data: { status },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "kitchen.task",
        aggregateId: updated.id,
        eventType: "kitchen.task.status_changed",
        payload: {
          taskId: updated.id,
          status: updated.status,
          previousStatus,
        },
        status: "pending" as const,
      },
    });

    return updated;
  });

  revalidatePath("/kitchen/tasks");

  return task;
};

/**
 * Delete a kitchen task
 */
export const deleteKitchenTask = async (taskId: string): Promise<void> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  await client.$transaction(async (tx) => {
    await tx.kitchenTask.delete({
      where: { tenantId_id: { tenantId, id: taskId } },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "kitchen.task",
        aggregateId: taskId,
        eventType: "kitchen.task.deleted",
        payload: {
          taskId,
        },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/tasks");
};

// ============================================================================
// Claim Operations
// ============================================================================

/**
 * Claim a task for a user and set status to in_progress
 */
export const claimTask = async (
  taskId: string,
  employeeId: string
): Promise<KitchenTaskClaim> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!(taskId && employeeId)) {
    throw new Error("Task id and employee id are required.");
  }

  const claim = await client.$transaction(async (tx) => {
    // Update task status to in_progress
    await tx.kitchenTask.update({
      where: { tenantId_id: { tenantId, id: taskId } },
      data: { status: "in_progress" },
    });

    // Create claim record
    const created = await tx.kitchenTaskClaim.create({
      data: {
        tenantId,
        taskId,
        employeeId,
      },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "kitchen.task",
        aggregateId: taskId,
        eventType: "kitchen.task.claimed",
        payload: {
          taskId,
          employeeId,
          claimedAt: created.claimedAt.toISOString(),
        },
        status: "pending" as const,
      },
    });

    return created;
  });

  revalidatePath("/kitchen/tasks");

  return claim;
};

/**
 * Release a task claim
 */
export const releaseTask = async (
  taskId: string,
  reason?: string | null
): Promise<KitchenTaskClaim | null> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  // Find the active claim
  const activeClaim = await client.kitchenTaskClaim.findFirst({
    where: {
      taskId,
      releasedAt: null,
    },
  });

  if (!activeClaim) {
    return null;
  }

  const updatedClaim = await client.$transaction(async (tx) => {
    // Release the claim
    const released = await tx.kitchenTaskClaim.update({
      where: { tenantId_id: { tenantId, id: activeClaim.id } },
      data: {
        releasedAt: new Date(),
        releaseReason: reason ?? undefined,
      },
    });

    // Update task status back to open
    await tx.kitchenTask.update({
      where: { tenantId_id: { tenantId, id: taskId } },
      data: { status: "open" },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "kitchen.task",
        aggregateId: taskId,
        eventType: "kitchen.task.released",
        payload: {
          taskId,
          employeeId: activeClaim.employeeId,
          reason: reason ?? null,
        },
        status: "pending" as const,
      },
    });

    return released;
  });

  revalidatePath("/kitchen/tasks");

  return updatedClaim;
};

/**
 * Get all claims for a task
 */
export const getTaskClaims = async (
  taskId: string
): Promise<KitchenTaskClaim[]> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  return client.kitchenTaskClaim.findMany({
    where: { taskId },
    orderBy: { claimedAt: "desc" },
  });
};

/**
 * Get user's active (unreleased) claims
 */
export const getMyActiveClaims = async (
  employeeId: string
): Promise<KitchenTaskClaim[]> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!employeeId) {
    throw new Error("Employee id is required.");
  }

  return client.kitchenTaskClaim.findMany({
    where: {
      employeeId,
      releasedAt: null,
    },
    orderBy: { claimedAt: "desc" },
  });
};

// ============================================================================
// Progress Operations
// ============================================================================

/**
 * Add a progress entry for a task
 */
export const addTaskProgress = async (
  taskId: string,
  employeeId: string,
  progressType: string,
  options?: {
    oldStatus?: string;
    newStatus?: string;
    quantityCompleted?: number;
    notes?: string;
  }
): Promise<KitchenTaskProgress> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!(taskId && employeeId)) {
    throw new Error("Task id and employee id are required.");
  }

  const progress = await client.$transaction(async (tx) => {
    const created = await tx.kitchenTaskProgress.create({
      data: {
        tenantId,
        taskId,
        employeeId,
        progressType,
        ...(options?.oldStatus && { oldStatus: options.oldStatus }),
        ...(options?.newStatus && { newStatus: options.newStatus }),
        ...(options?.quantityCompleted && {
          quantityCompleted: options.quantityCompleted,
        }),
        ...(options?.notes && { notes: options.notes }),
      },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "kitchen.task.progress",
        aggregateId: taskId,
        eventType: "kitchen.task.progress",
        payload: {
          taskId,
          employeeId,
          progressType,
          ...(options?.newStatus && { newStatus: options.newStatus }),
          ...(options?.notes && { notes: options.notes }),
        },
        status: "pending" as const,
      },
    });

    return created;
  });

  revalidatePath("/kitchen/tasks");

  return progress;
};

/**
 * Get progress history for a task
 */
export const getTaskProgressLog = async (
  taskId: string
): Promise<KitchenTaskProgress[]> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  return client.kitchenTaskProgress.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
};
