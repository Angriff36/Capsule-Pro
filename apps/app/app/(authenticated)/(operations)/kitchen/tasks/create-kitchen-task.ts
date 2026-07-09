"use server";

/**
 * KitchenTask.create — Manifest-aligned create for the new-task form.
 * Requires non-empty summary, priority 1–5, and a real dueDate Date.
 */

import { database, type KitchenTask } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

const getString = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getDateTime = (formData: FormData, key: string): Date | undefined => {
  const value = getString(formData, key);
  if (!value) {
    return;
  }
  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? undefined : dateValue;
};

export const createKitchenTask = async (
  formData: FormData
): Promise<KitchenTask> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  const title = getString(formData, "title");
  if (!title) {
    throw new Error("Task title is required.");
  }

  const summary = getString(formData, "summary");
  if (!summary) {
    throw new Error("Task summary is required.");
  }

  const priorityStr = getString(formData, "priority");
  const priority = priorityStr ? Number.parseInt(priorityStr, 10) : Number.NaN;
  if (!(Number.isInteger(priority) && priority >= 1 && priority <= 5)) {
    throw new Error("Priority must be between 1 and 5.");
  }

  const dueDate = getDateTime(formData, "dueDate");
  if (!dueDate) {
    throw new Error("Due date is required.");
  }

  const result = await runManifestCommand({
    entity: "KitchenTask",
    command: "create",
    body: {
      title,
      summary,
      priority,
      complexity: 5,
      tags: "",
      dueDate,
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
