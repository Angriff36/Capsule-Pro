"use server";

import {
  Prisma,
  database,
  tenantDatabase,
  type KitchenTaskStatus,
  type KitchenTaskPriority,
  type KitchenTask,
  type KitchenTaskClaim,
  type KitchenTaskProgress,
} from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireTenantId } from "../../lib/tenant";

// ============================================================================
// Helper Functions
// ============================================================================

const getString = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getOptionalString = (
  formData: FormData,
  key: string,
): string | null | undefined => {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getDateTime = (formData: FormData, key: string): Date | undefined => {
  const value = getString(formData, key);

  if (!value) {
    return undefined;
  }

  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? undefined : dateValue;
};

const enqueueOutboxEvent = async (
  tenantId: string,
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: Prisma.InputJsonValue,
): Promise<void> => {
  const client = tenantDatabase(tenantId);
  await client.outboxEvent.create({
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
  status?: KitchenTaskStatus;
  priority?: KitchenTaskPriority;
  assignedToId?: string;
}): Promise<
  (KitchenTask & {
    assignedTo: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
    createdBy: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  })[]
> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  return client.kitchenTask.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.assignedToId && { assignedToId: filters.assignedToId }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      assignedTo: true,
      createdBy: true,
    },
  });
};

/**
 * Get a single kitchen task by ID
 */
export const getKitchenTaskById = async (
  taskId: string,
): Promise<
  | (KitchenTask & {
      assignedTo: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
      createdBy: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
      claims: KitchenTaskClaim[];
      progressLog: KitchenTaskProgress[];
    })
  | null
> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  return client.kitchenTask.findFirst({
    where: { id: taskId },
    include: {
      assignedTo: true,
      createdBy: true,
      claims: true,
      progressLog: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
};

/**
 * Get tasks filtered by status
 */
export const getKitchenTasksByStatus = async (
  status: KitchenTaskStatus,
): Promise<
  (KitchenTask & {
    assignedTo: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
    createdBy: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  })[]
> => {
  return getKitchenTasks({ status });
};

/**
 * Get urgent priority tasks that are open or in progress
 */
export const getUrgentTasks = async (): Promise<
  (KitchenTask & {
    assignedTo: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
    createdBy: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  })[]
> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  return client.kitchenTask.findMany({
    where: {
      priority: "urgent",
      status: {
        in: ["open", "in_progress"],
      },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    include: {
      assignedTo: true,
      createdBy: true,
    },
  });
};

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new kitchen task
 */
export const createKitchenTask = async (formData: FormData): Promise<KitchenTask> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  const title = getString(formData, "title");
  if (!title) {
    throw new Error("Task title is required.");
  }

  const description = getOptionalString(formData, "description");
  const priority = getString(formData, "priority") as KitchenTaskPriority | undefined;
  const dueAt = getDateTime(formData, "dueAt");
  const assignedToId = getOptionalString(formData, "assignedToId");
  const createdById = getOptionalString(formData, "createdById");

  const task = await client.kitchenTask.create({
    data: {
      title,
      description,
      priority: priority || "medium",
      dueAt,
      assignedToId: assignedToId ?? undefined,
      createdById: createdById ?? undefined,
    },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(tenantId, "kitchen.task", task.id, "kitchen.task.created", {
    taskId: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
  });

  return task;
};

/**
 * Update kitchen task fields
 */
export const updateKitchenTask = async (formData: FormData): Promise<KitchenTask> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  const taskId = getString(formData, "taskId");
  if (!taskId) {
    throw new Error("Task id is required.");
  }

  const title = getString(formData, "title");
  const description = getOptionalString(formData, "description");
  const priority = getString(formData, "priority") as KitchenTaskPriority | undefined;
  const dueAt = getDateTime(formData, "dueAt");
  const assignedToId = getOptionalString(formData, "assignedToId");

  const task = await client.kitchenTask.update({
    where: { id: taskId },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(priority && { priority }),
      ...(dueAt && { dueAt }),
      ...(assignedToId !== undefined && { assignedToId: assignedToId ?? undefined }),
    },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(tenantId, "kitchen.task", task.id, "kitchen.task.updated", {
    taskId: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
  });

  return task;
};

/**
 * Update only the status of a task
 */
export const updateKitchenTaskStatus = async (
  taskId: string,
  status: KitchenTaskStatus,
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

  const task = await client.kitchenTask.update({
    where: { id: taskId },
    data: { status },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(tenantId, "kitchen.task", task.id, "kitchen.task.status_changed", {
    taskId: task.id,
    status: task.status,
    previousStatus,
  });

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

  await client.kitchenTask.delete({
    where: { id: taskId },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(tenantId, "kitchen.task", taskId, "kitchen.task.deleted", {
    taskId,
  });
};

// ============================================================================
// Claim Operations
// ============================================================================

/**
 * Claim a task for a user and set status to in_progress
 */
export const claimTask = async (taskId: string, userId: string): Promise<KitchenTaskClaim> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!taskId || !userId) {
    throw new Error("Task id and user id are required.");
  }

  // Update task status to in_progress
  await client.kitchenTask.update({
    where: { id: taskId },
    data: { status: "in_progress" },
  });

  // Create claim record
  const claim = await client.kitchenTaskClaim.create({
    data: {
      taskId,
      userId,
    },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(tenantId, "kitchen.task", taskId, "kitchen.task.claimed", {
    taskId,
    userId,
    claimedAt: claim.claimedAt.toISOString(),
  });

  return claim;
};

/**
 * Release a task claim
 */
export const releaseTask = async (
  taskId: string,
  reason?: string | null,
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

  // Release the claim
  const updatedClaim = await client.kitchenTaskClaim.update({
    where: { id: activeClaim.id },
    data: {
      releasedAt: new Date(),
      releaseReason: reason ?? undefined,
    },
  });

  // Update task status back to open
  await client.kitchenTask.update({
    where: { id: taskId },
    data: { status: "open" },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(tenantId, "kitchen.task", taskId, "kitchen.task.released", {
    taskId,
    userId: activeClaim.userId,
    reason: reason ?? null,
  });

  return updatedClaim;
};

/**
 * Get all claims for a task
 */
export const getTaskClaims = async (taskId: string): Promise<KitchenTaskClaim[]> => {
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
export const getMyActiveClaims = async (userId: string): Promise<
  (KitchenTaskClaim & {
    task: KitchenTask & {
      assignedTo: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
      createdBy: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
    };
  })[]
> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!userId) {
    throw new Error("User id is required.");
  }

  return client.kitchenTaskClaim.findMany({
    where: {
      userId,
      releasedAt: null,
    },
    include: {
      task: {
        include: {
          assignedTo: true,
          createdBy: true,
        },
      },
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
  status: KitchenTaskStatus,
  note?: string | null,
): Promise<KitchenTaskProgress> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  const progress = await client.kitchenTaskProgress.create({
    data: {
      taskId,
      status,
      note: note ?? undefined,
    },
  });

  revalidatePath("/kitchen/tasks");

  // Enqueue outbox event for real-time sync
  await enqueueOutboxEvent(tenantId, "kitchen.task.progress", taskId, "kitchen.task.progress", {
    taskId,
    status,
    note: note ?? null,
  });

  return progress;
};

/**
 * Get progress history for a task
 */
export const getTaskProgressLog = async (taskId: string): Promise<KitchenTaskProgress[]> => {
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
