import {
  listAdminTaskAttachments,
  listAdminTaskComments,
  listAdminTaskDevMetas,
  listAdminTasks,
} from "@/app/lib/manifest-client.generated";
import {
  mapAdminAttachment,
  mapAdminComment,
  mapAdminDevMeta,
  mapAdminTaskToKanban,
} from "./admin-task-mappers";
import type {
  DevBugMeta,
  KanbanTask,
  TaskAttachment,
  TaskComment,
} from "./board-types";

function activeForTask<T extends { taskId?: string; deletedAt?: string | null }>(
  rows: T[],
  taskId: string
): T[] {
  return rows.filter((row) => row.taskId === taskId && !row.deletedAt);
}

export async function fetchKanbanTasks(): Promise<KanbanTask[]> {
  const { data } = await listAdminTasks();
  return data.filter((task) => !task.deletedAt).map(mapAdminTaskToKanban);
}

export async function fetchTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data } = await listAdminTaskComments();
  return activeForTask(data, taskId).map(mapAdminComment);
}

export async function fetchTaskAttachments(
  taskId: string
): Promise<TaskAttachment[]> {
  const { data } = await listAdminTaskAttachments();
  return activeForTask(data, taskId).map(mapAdminAttachment);
}

export async function fetchTaskDevMeta(
  taskId: string
): Promise<DevBugMeta | null> {
  const { data } = await listAdminTaskDevMetas();
  const meta = activeForTask(data, taskId)[0];
  return meta ? mapAdminDevMeta(meta) : null;
}
