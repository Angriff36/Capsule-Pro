"use server";

import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import {
  loadActiveKitchenTaskClaim,
  loadKitchenTaskById,
  loadKitchenTaskClaimById,
  loadKitchenTaskClaimsForTask,
  loadKitchenTaskProgressById,
  loadKitchenTaskProgressLog,
  loadKitchenTasks,
  loadMyActiveKitchenTaskClaims,
  loadUrgentKitchenTasks,
  type KitchenTaskClaimRow,
  type KitchenTaskProgressRow,
  type KitchenTaskRow,
} from "@/app/lib/convex/kitchen-task-loaders";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

export type KitchenTaskStatus =
  | "open"
  | "in_progress"
  | "done"
  | "canceled"
  | "pending";

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

export const getKitchenTasks = async (filters?: {
  status?: string;
  priority?: number;
}): Promise<KitchenTaskRow[]> => loadKitchenTasks(filters);

export const getKitchenTaskById = async (
  taskId: string
): Promise<KitchenTaskRow | null> => loadKitchenTaskById(taskId);

export const getKitchenTasksByStatus = async (
  status: string
): Promise<KitchenTaskRow[]> => getKitchenTasks({ status });

export const getUrgentTasks = async (): Promise<KitchenTaskRow[]> =>
  loadUrgentKitchenTasks();

export const createKitchenTask = async (
  formData: FormData
): Promise<KitchenTaskRow> => {
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

  const task = await loadKitchenTaskById(createdId);
  invariant(task, "Created kitchen task could not be loaded");

  revalidatePath("/kitchen/tasks");

  return task;
};

export const updateKitchenTask = async (
  formData: FormData
): Promise<KitchenTaskRow> => {
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

  const task = await loadKitchenTaskById(taskId);
  invariant(task, "Updated kitchen task could not be loaded");

  revalidatePath("/kitchen/tasks");

  return task;
};

export const updateKitchenTaskStatus = async (
  taskId: string,
  status: KitchenTaskStatus
): Promise<KitchenTaskRow> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const userCtx = { id: user.id, tenantId, role: user.role };

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  const currentTask = await loadKitchenTaskById(taskId);
  if (!currentTask) {
    throw new Error("Task not found.");
  }

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

  const task = await loadKitchenTaskById(taskId);
  invariant(task, "Updated kitchen task could not be loaded");

  revalidatePath("/kitchen/tasks");

  return task;
};

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

export const claimTask = async (
  taskId: string,
  employeeId: string
): Promise<KitchenTaskClaimRow> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const userCtx = { id: user.id, tenantId, role: user.role };

  if (!(taskId && employeeId)) {
    throw new Error("Task id and employee id are required.");
  }

  const claimResult = await runManifestCommand({
    entity: "KitchenTask",
    command: "claim",
    body: { id: taskId, userId: employeeId },
    user: userCtx,
  });
  if (!claimResult.ok) {
    throw new Error(claimResult.message || "Failed to claim task");
  }

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

  const claim = await loadKitchenTaskClaimById(claimId);
  invariant(claim, "Created claim could not be loaded");

  revalidatePath("/kitchen/tasks");

  return claim;
};

export const releaseTask = async (
  taskId: string,
  reason?: string | null
): Promise<KitchenTaskClaimRow | null> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const userCtx = { id: user.id, tenantId, role: user.role };

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  const activeClaim = await loadActiveKitchenTaskClaim(taskId);

  if (!activeClaim) {
    return null;
  }

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

  const updatedClaim = await loadKitchenTaskClaimById(activeClaim.id);
  invariant(updatedClaim, "Released claim could not be loaded");

  revalidatePath("/kitchen/tasks");

  return updatedClaim;
};

export const getTaskClaims = async (
  taskId: string
): Promise<KitchenTaskClaimRow[]> => {
  if (!taskId) {
    throw new Error("Task id is required.");
  }

  return loadKitchenTaskClaimsForTask(taskId);
};

export const getMyActiveClaims = async (
  employeeId: string
): Promise<KitchenTaskClaimRow[]> => {
  if (!employeeId) {
    throw new Error("Employee id is required.");
  }

  return loadMyActiveKitchenTaskClaims(employeeId);
};

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
): Promise<KitchenTaskProgressRow> => {
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

  const progress = await loadKitchenTaskProgressById(progressId);
  invariant(progress, "Created progress entry could not be loaded");

  revalidatePath("/kitchen/tasks");

  return progress;
};

export const getTaskProgressLog = async (
  taskId: string
): Promise<KitchenTaskProgressRow[]> => {
  if (!taskId) {
    throw new Error("Task id is required.");
  }

  return loadKitchenTaskProgressLog(taskId);
};
