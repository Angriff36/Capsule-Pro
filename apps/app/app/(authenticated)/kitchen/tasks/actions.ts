"use server";

import {
  type KitchenTask,
  type KitchenTaskClaim,
  type KitchenTaskProgress,
  type KitchenTaskStatus,
  type Prisma,
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

const enqueueOutboxEvent = async (
  tenantId: string,
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: Prisma.InputJsonValue
): Promise<void> => {
  const client = tenantDatabase(tenantId);
  await client.outbox_events.create({
    data: {
      tenantId,
      aggregateType,
      aggregateId,
      eventType,
      payload,
    },
  });
};

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

  return client.kitchen_tasks.findMany({
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

  return client.kitchen_tasks.findFirst({
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

  return client.kitchen_tasks.findMany({
    where: {
      priority: {
        lte: 2, // Urgent and Critical (1-2)
      },
      status: {
        in: ["open", "in_progress"],
      },
    },
    orderBy: [{ dueDate: "asc" }, { created_at: "asc" }],
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

  const task = await client.kitchen_tasks.create({
    data: {
      tenantId,
      title,
      summary,
      priority: priority || 5, // default to medium (5)
      dueDate,
    },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(
    tenantId,
    "kitchen.task",
    task.id,
    "kitchen.task.created",
    {
      taskId: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
    }
  );

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

  const task = await client.kitchen_tasks.update({
    where: { tenant_id_id: { tenantId, id: taskId } },
    data: {
      ...(title && { title }),
      ...(summary !== undefined && { summary: summary || "" }),
      ...(priority && { priority }),
      ...(dueDate && { dueDate }),
    },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(
    tenantId,
    "kitchen.task",
    task.id,
    "kitchen.task.updated",
    {
      taskId: task.id,
      title: task.title,
      priority: task.priority,
      status: task.status,
    }
  );

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
  const currentTask = await client.kitchen_tasks.findFirst({
    where: { id: taskId },
  });

  if (!currentTask) {
    throw new Error("Task not found.");
  }

  const previousStatus = currentTask.status;

  const task = await client.kitchen_tasks.update({
    where: { tenant_id_id: { tenantId, id: taskId } },
    data: { status },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(
    tenantId,
    "kitchen.task",
    task.id,
    "kitchen.task.status_changed",
    {
      taskId: task.id,
      status: task.status,
      previousStatus,
    }
  );

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

  await client.kitchen_tasks.delete({
    where: { tenant_id_id: { tenantId, id: taskId } },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(
    tenantId,
    "kitchen.task",
    taskId,
    "kitchen.task.deleted",
    {
      taskId,
    }
  );
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

  // Update task status to in_progress
  await client.kitchen_tasks.update({
    where: { tenant_id_id: { tenantId, id: taskId } },
    data: { status: "in_progress" },
  });

  // Create claim record
  const claim = await client.task_claims.create({
    data: {
      tenantId,
      taskId,
      employeeId,
    },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(
    tenantId,
    "kitchen.task",
    taskId,
    "kitchen.task.claimed",
    {
      taskId,
      employeeId,
      claimedAt: claim.claimedAt.toISOString(),
    }
  );

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
  const activeClaim = await client.task_claims.findFirst({
    where: {
      taskId,
      releasedAt: null,
    },
  });

  if (!activeClaim) {
    return null;
  }

  // Release the claim
  const updatedClaim = await client.task_claims.update({
    where: { tenant_id_id: { tenantId, id: activeClaim.id } },
    data: {
      releasedAt: new Date(),
      releaseReason: reason ?? undefined,
    },
  });

  // Update task status back to open
  await client.kitchen_tasks.update({
    where: { tenant_id_id: { tenantId, id: taskId } },
    data: { status: "open" },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(
    tenantId,
    "kitchen.task",
    taskId,
    "kitchen.task.released",
    {
      taskId,
      employeeId: activeClaim.employeeId,
      reason: reason ?? null,
    }
  );

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

  return client.task_claims.findMany({
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

  return client.task_claims.findMany({
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

  const progress = await client.task_progress.create({
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

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(
    tenantId,
    "kitchen.task.progress",
    taskId,
    "kitchen.task.progress",
    {
      taskId,
      employeeId,
      progressType,
      ...(options?.newStatus && { newStatus: options.newStatus }),
      ...(options?.notes && { notes: options.notes }),
    }
  );

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

  return client.task_progress.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
};
