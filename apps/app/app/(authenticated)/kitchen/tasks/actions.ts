"use server";

import {
  database,
  type KitchenTask,
  type KitchenTaskClaim,
  type KitchenTaskProgress,
  type KitchenTaskStatus,
} from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

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

// ============================================================================
// Query Operations (direct Prisma reads — constitution §10)
// ============================================================================

/**
 * List all kitchen tasks with optional filters
 */
export const getKitchenTasks = async (filters?: {
  status?: string;
  priority?: number;
}): Promise<KitchenTask[]> => {
  const tenantId = await requireTenantId();

  return database.kitchenTask.findMany({
    where: {
      tenantId,
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

  return database.kitchenTask.findFirst({
    where: { tenantId, id: taskId },
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

  return database.kitchenTask.findMany({
    where: {
      tenantId,
      priority: {
        lte: 2, // Urgent and Critical (1-2)
      },
      status: {
        in: ["pending", "open", "in_progress"],
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });
};

// ============================================================================
// Create Operation (governed via Manifest runtime)
// ============================================================================

/**
 * Create a new kitchen task.
 *
 * Uses KitchenTask.create. Status defaults to "pending" via property default
 * — not set explicitly. Complexity defaults to 5 (medium).
 */
export const createKitchenTask = async (
  formData: FormData
): Promise<KitchenTask> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  const title = getString(formData, "title");
  if (!title) {
    throw new Error("Task title is required.");
  }

  const summary = getOptionalString(formData, "summary") || "";
  const priorityStr = getString(formData, "priority");
  const priority = priorityStr ? Number.parseInt(priorityStr, 10) : 5;
  const dueDate = getDateTime(formData, "dueDate");

  const result = await runManifestCommand({
    entity: "KitchenTask",
    command: "create",
    body: {
      title,
      summary,
      priority,
      complexity: 5,
      tags: "",
      dueDate: dueDate ?? "",
    },
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create kitchen task");
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  invariant(createdId, "KitchenTask.create did not return an id");

  const task = await database.kitchenTask.findFirst({
    where: { tenantId, id: createdId },
  });
  invariant(task, "Created kitchen task could not be loaded");

  revalidatePath("/kitchen/tasks");

  return task;
};

// ============================================================================
// Update Operations (governed via Manifest runtime)
// ============================================================================

/**
 * Update kitchen task fields.
 *
 * The IR uses individual commands per field (updateTitle, updateSummary, etc.)
 * instead of a single update command. Only changed fields trigger commands.
 */
export const updateKitchenTask = async (
  formData: FormData
): Promise<KitchenTask> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  const taskId = getString(formData, "taskId");
  if (!taskId) {
    throw new Error("Task id is required.");
  }

  const title = getString(formData, "title");
  const summary = getOptionalString(formData, "summary");
  const priorityStr = getString(formData, "priority");
  const priority = priorityStr ? Number.parseInt(priorityStr, 10) : undefined;
  const dueDate = getDateTime(formData, "dueDate");

  // Execute individual field-update commands for each changed field
  const userCtx = { id: user.id, tenantId, role: user.role };

  if (title) {
    const r = await runManifestCommand({
      entity: "KitchenTask",
      command: "updateTitle",
      body: { id: taskId, title },
      user: userCtx,
    });
    if (!r.ok) {
      throw new Error(r.message || "Failed to update task title");
    }
  }

  if (summary !== undefined) {
    const r = await runManifestCommand({
      entity: "KitchenTask",
      command: "updateSummary",
      body: { id: taskId, summary: summary || "" },
      user: userCtx,
    });
    if (!r.ok) {
      throw new Error(r.message || "Failed to update task summary");
    }
  }

  if (priority && priority >= 1 && priority <= 5) {
    const r = await runManifestCommand({
      entity: "KitchenTask",
      command: "updatePriority",
      body: { id: taskId, priority },
      user: userCtx,
    });
    if (!r.ok) {
      throw new Error(r.message || "Failed to update task priority");
    }
  }

  if (dueDate) {
    const r = await runManifestCommand({
      entity: "KitchenTask",
      command: "updateDueDate",
      body: { id: taskId, dueDate },
      user: userCtx,
    });
    if (!r.ok) {
      throw new Error(r.message || "Failed to update task due date");
    }
  }

  const task = await database.kitchenTask.findFirst({
    where: { tenantId, id: taskId },
  });
  invariant(task, "Updated kitchen task could not be loaded");

  revalidatePath("/kitchen/tasks");

  return task;
};

/**
 * Update only the status of a task.
 *
 * Maps the target status to the appropriate IR transition command:
 * - "in_progress" → KitchenTask.start(userId)
 * - "done" → KitchenTask.complete(userId)
 * - "cancelled" → KitchenTask.cancel(reason, canceledBy)
 * - "pending"/"open" → KitchenTask.release(userId, reason)
 */
export const updateKitchenTaskStatus = async (
  taskId: string,
  status: KitchenTaskStatus
): Promise<KitchenTask> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const userCtx = { id: user.id, tenantId, role: user.role };

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  // Fetch current task to determine the right transition command
  const currentTask = await database.kitchenTask.findFirst({
    where: { tenantId, id: taskId },
  });
  if (!currentTask) {
    throw new Error("Task not found.");
  }

  // Map target status to the correct transition command
  switch (status) {
    case "in_progress": {
      const r = await runManifestCommand({
        entity: "KitchenTask",
        command: "start",
        body: { id: taskId, userId: user.id },
        user: userCtx,
      });
      if (!r.ok) {
        throw new Error(r.message || "Failed to start task");
      }
      break;
    }
    case "done": {
      const r = await runManifestCommand({
        entity: "KitchenTask",
        command: "complete",
        body: { id: taskId, userId: user.id },
        user: userCtx,
      });
      if (!r.ok) {
        throw new Error(r.message || "Failed to complete task");
      }
      break;
    }
    case "canceled": {
      const r = await runManifestCommand({
        entity: "KitchenTask",
        command: "cancel",
        body: {
          id: taskId,
          reason: "Status changed to cancelled",
          canceledBy: user.id,
        },
        user: userCtx,
      });
      if (!r.ok) {
        throw new Error(r.message || "Failed to cancel task");
      }
      break;
    }
    case "open": {
      const r = await runManifestCommand({
        entity: "KitchenTask",
        command: "release",
        body: {
          id: taskId,
          userId: user.id,
          reason: "Status changed back to open",
        },
        user: userCtx,
      });
      if (!r.ok) {
        throw new Error(r.message || "Failed to release task");
      }
      break;
    }
    default:
      throw new Error(`Unsupported status transition: ${status}`);
  }

  const task = await database.kitchenTask.findFirst({
    where: { tenantId, id: taskId },
  });
  invariant(task, "Updated kitchen task could not be loaded");

  revalidatePath("/kitchen/tasks");

  return task;
};

// ============================================================================
// Delete Operation (governed via Manifest runtime)
// ============================================================================

/**
 * Cancel a kitchen task.
 *
 * No softDelete command exists for KitchenTask — use cancel instead.
 * This preserves the task record (safer than hard delete) while marking
 * it as cancelled.
 */
export const deleteKitchenTask = async (taskId: string): Promise<void> => {
  const user = await requireCurrentUser();

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  const result = await runManifestCommand({
    entity: "KitchenTask",
    command: "cancel",
    body: {
      id: taskId,
      reason: "Deleted by user",
      canceledBy: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete kitchen task");
  }

  revalidatePath("/kitchen/tasks");
};

// ============================================================================
// Claim Operations (governed via Manifest runtime)
// ============================================================================

/**
 * Claim a task for a user and set status to in_progress.
 *
 * Two governed commands:
 * 1. KitchenTask.claim(userId) — sets status=in_progress, assignedTo
 * 2. KitchenTaskClaim.claim(taskId, employeeId, claimedAt) — creates claim record
 */
export const claimTask = async (
  taskId: string,
  employeeId: string
): Promise<KitchenTaskClaim> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const userCtx = { id: user.id, tenantId, role: user.role };

  if (!(taskId && employeeId)) {
    throw new Error("Task id and employee id are required.");
  }

  // 1. Claim the task (sets status=in_progress, assignedTo=userId)
  const claimResult = await runManifestCommand({
    entity: "KitchenTask",
    command: "claim",
    body: { id: taskId, userId: employeeId },
    user: userCtx,
  });
  if (!claimResult.ok) {
    throw new Error(claimResult.message || "Failed to claim task");
  }

  // 2. Create the claim record
  const createClaimResult = await runManifestCommand({
    entity: "KitchenTaskClaim",
    command: "claim",
    body: {
      taskId,
      employeeId,
      claimedAt: new Date(),
    },
    user: userCtx,
  });
  if (!createClaimResult.ok) {
    throw new Error(
      createClaimResult.message || "Failed to create claim record"
    );
  }

  const claimId = (createClaimResult.result as { id?: string } | null)?.id;
  invariant(claimId, "KitchenTaskClaim.claim did not return an id");

  const claim = await database.kitchenTaskClaim.findFirst({
    where: { tenantId, id: claimId },
  });
  invariant(claim, "Created claim could not be loaded");

  revalidatePath("/kitchen/tasks");

  return claim;
};

/**
 * Release a task claim.
 *
 * Two governed commands:
 * 1. KitchenTaskClaim.release(releasedBy, reason) — marks claim as released
 * 2. KitchenTask.release(userId, reason) — sets status=pending, assignedTo=""
 */
export const releaseTask = async (
  taskId: string,
  reason?: string | null
): Promise<KitchenTaskClaim | null> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const userCtx = { id: user.id, tenantId, role: user.role };

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  // Find the active claim
  const activeClaim = await database.kitchenTaskClaim.findFirst({
    where: {
      tenantId,
      taskId,
      releasedAt: null,
    },
  });

  if (!activeClaim) {
    return null;
  }

  // 1. Release the claim record
  const releaseResult = await runManifestCommand({
    entity: "KitchenTaskClaim",
    command: "release",
    body: {
      id: activeClaim.id,
      releasedBy: user.id,
      reason: reason ?? "",
    },
    user: userCtx,
  });
  if (!releaseResult.ok) {
    throw new Error(releaseResult.message || "Failed to release claim");
  }

  // 2. Release the task (sets status=pending, assignedTo="")
  const taskReleaseResult = await runManifestCommand({
    entity: "KitchenTask",
    command: "release",
    body: {
      id: taskId,
      userId: user.id,
      reason: reason ?? "",
    },
    user: userCtx,
  });
  if (!taskReleaseResult.ok) {
    throw new Error(taskReleaseResult.message || "Failed to release task");
  }

  const updatedClaim = await database.kitchenTaskClaim.findFirst({
    where: { tenantId, id: activeClaim.id },
  });
  invariant(updatedClaim, "Released claim could not be loaded");

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

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  return database.kitchenTaskClaim.findMany({
    where: { tenantId, taskId },
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

  if (!employeeId) {
    throw new Error("Employee id is required.");
  }

  return database.kitchenTaskClaim.findMany({
    where: {
      tenantId,
      employeeId,
      releasedAt: null,
    },
    orderBy: { claimedAt: "desc" },
  });
};

// ============================================================================
// Progress Operations (governed via Manifest runtime)
// ============================================================================

/**
 * Add a progress entry for a task.
 *
 * Uses KitchenTaskProgress.create. Maps:
 * - progressType → progressType
 * - newStatus ?? progressType → newStatus
 * - quantityCompleted → progressPct
 * - notes → notes
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
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  if (!(taskId && employeeId)) {
    throw new Error("Task id and employee id are required.");
  }

  const result = await runManifestCommand({
    entity: "KitchenTaskProgress",
    command: "create",
    body: {
      taskId,
      employeeId,
      progressType,
      newStatus: options?.newStatus ?? progressType,
      progressPct: options?.quantityCompleted ?? 0,
      notes: options?.notes ?? "",
      recordedAt: new Date(),
    },
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to add task progress");
  }

  const progressId = (result.result as { id?: string } | null)?.id;
  invariant(progressId, "KitchenTaskProgress.create did not return an id");

  const progress = await database.kitchenTaskProgress.findFirst({
    where: { tenantId, id: progressId },
  });
  invariant(progress, "Created progress entry could not be loaded");

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

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  return database.kitchenTaskProgress.findMany({
    where: { tenantId, taskId },
    orderBy: { createdAt: "desc" },
  });
};
