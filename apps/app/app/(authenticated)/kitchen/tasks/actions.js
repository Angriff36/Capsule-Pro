"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskProgressLog =
  exports.addTaskProgress =
  exports.getMyActiveClaims =
  exports.getTaskClaims =
  exports.releaseTask =
  exports.claimTask =
  exports.deleteKitchenTask =
  exports.updateKitchenTaskStatus =
  exports.updateKitchenTask =
  exports.createKitchenTask =
  exports.getUrgentTasks =
  exports.getKitchenTasksByStatus =
  exports.getKitchenTaskById =
  exports.getKitchenTasks =
    void 0;
const database_1 = require("@repo/database");
const cache_1 = require("next/cache");
const tenant_1 = require("@/app/lib/tenant");
// ============================================================================
// Helper Functions
// ============================================================================
const getString = (formData, key) => {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
const getOptionalString = (formData, key) => {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
const getDateTime = (formData, key) => {
  const value = getString(formData, key);
  if (!value) {
    return;
  }
  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? undefined : dateValue;
};
const enqueueOutboxEvent = async (
  tenantId,
  aggregateType,
  aggregateId,
  eventType,
  payload
) => {
  const client = (0, database_1.tenantDatabase)(tenantId);
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
const getKitchenTasks = async (filters) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
  return client.kitchenTask.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
    },
    orderBy: { createdAt: "desc" },
  });
};
exports.getKitchenTasks = getKitchenTasks;
/**
 * Get a single kitchen task by ID
 */
const getKitchenTaskById = async (taskId) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
  return client.kitchenTask.findFirst({
    where: { id: taskId },
  });
};
exports.getKitchenTaskById = getKitchenTaskById;
/**
 * Get tasks filtered by status
 */
const getKitchenTasksByStatus = async (status) =>
  (0, exports.getKitchenTasks)({ status });
exports.getKitchenTasksByStatus = getKitchenTasksByStatus;
/**
 * Get urgent priority tasks that are open or in progress
 */
const getUrgentTasks = async () => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
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
exports.getUrgentTasks = getUrgentTasks;
// ============================================================================
// CRUD Operations
// ============================================================================
/**
 * Create a new kitchen task
 */
const createKitchenTask = async (formData) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
  const title = getString(formData, "title");
  if (!title) {
    throw new Error("Task title is required.");
  }
  const summary = getOptionalString(formData, "summary") || "";
  const priorityStr = getString(formData, "priority");
  const priority = priorityStr ? Number.parseInt(priorityStr, 10) : undefined;
  const dueDate = getDateTime(formData, "dueDate");
  const task = await client.kitchenTask.create({
    data: {
      tenantId,
      title,
      summary,
      priority: priority || 5, // default to medium (5)
      dueDate,
    },
  });
  (0, cache_1.revalidatePath)("/kitchen/tasks");
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
exports.createKitchenTask = createKitchenTask;
/**
 * Update kitchen task fields
 */
const updateKitchenTask = async (formData) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
  const taskId = getString(formData, "taskId");
  if (!taskId) {
    throw new Error("Task id is required.");
  }
  const title = getString(formData, "title");
  const summary = getOptionalString(formData, "summary");
  const priorityStr = getString(formData, "priority");
  const priority = priorityStr ? Number.parseInt(priorityStr, 10) : undefined;
  const dueDate = getDateTime(formData, "dueDate");
  const task = await client.kitchenTask.update({
    where: { tenantId_id: { tenantId, id: taskId } },
    data: {
      ...(title && { title }),
      ...(summary !== undefined && { summary: summary || "" }),
      ...(priority && { priority }),
      ...(dueDate && { dueDate }),
    },
  });
  (0, cache_1.revalidatePath)("/kitchen/tasks");
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
exports.updateKitchenTask = updateKitchenTask;
/**
 * Update only the status of a task
 */
const updateKitchenTaskStatus = async (taskId, status) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
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
    where: { tenantId_id: { tenantId, id: taskId } },
    data: { status },
  });
  (0, cache_1.revalidatePath)("/kitchen/tasks");
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
exports.updateKitchenTaskStatus = updateKitchenTaskStatus;
/**
 * Delete a kitchen task
 */
const deleteKitchenTask = async (taskId) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
  if (!taskId) {
    throw new Error("Task id is required.");
  }
  await client.kitchenTask.delete({
    where: { tenantId_id: { tenantId, id: taskId } },
  });
  (0, cache_1.revalidatePath)("/kitchen/tasks");
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
exports.deleteKitchenTask = deleteKitchenTask;
// ============================================================================
// Claim Operations
// ============================================================================
/**
 * Claim a task for a user and set status to in_progress
 */
const claimTask = async (taskId, employeeId) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
  if (!(taskId && employeeId)) {
    throw new Error("Task id and employee id are required.");
  }
  // Update task status to in_progress
  await client.kitchenTask.update({
    where: { tenantId_id: { tenantId, id: taskId } },
    data: { status: "in_progress" },
  });
  // Create claim record
  const claim = await client.kitchenTaskClaim.create({
    data: {
      tenantId,
      taskId,
      employeeId,
    },
  });
  (0, cache_1.revalidatePath)("/kitchen/tasks");
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
exports.claimTask = claimTask;
/**
 * Release a task claim
 */
const releaseTask = async (taskId, reason) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
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
    where: { tenantId_id: { tenantId, id: activeClaim.id } },
    data: {
      releasedAt: new Date(),
      releaseReason: reason ?? undefined,
    },
  });
  // Update task status back to open
  await client.kitchenTask.update({
    where: { tenantId_id: { tenantId, id: taskId } },
    data: { status: "open" },
  });
  (0, cache_1.revalidatePath)("/kitchen/tasks");
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
exports.releaseTask = releaseTask;
/**
 * Get all claims for a task
 */
const getTaskClaims = async (taskId) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
  if (!taskId) {
    throw new Error("Task id is required.");
  }
  return client.kitchenTaskClaim.findMany({
    where: { taskId },
    orderBy: { claimedAt: "desc" },
  });
};
exports.getTaskClaims = getTaskClaims;
/**
 * Get user's active (unreleased) claims
 */
const getMyActiveClaims = async (employeeId) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
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
exports.getMyActiveClaims = getMyActiveClaims;
// ============================================================================
// Progress Operations
// ============================================================================
/**
 * Add a progress entry for a task
 */
const addTaskProgress = async (taskId, employeeId, progressType, options) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
  if (!(taskId && employeeId)) {
    throw new Error("Task id and employee id are required.");
  }
  const progress = await client.kitchenTaskProgress.create({
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
  (0, cache_1.revalidatePath)("/kitchen/tasks");
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
exports.addTaskProgress = addTaskProgress;
/**
 * Get progress history for a task
 */
const getTaskProgressLog = async (taskId) => {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const client = (0, database_1.tenantDatabase)(tenantId);
  if (!taskId) {
    throw new Error("Task id is required.");
  }
  return client.kitchenTaskProgress.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
};
exports.getTaskProgressLog = getTaskProgressLog;
