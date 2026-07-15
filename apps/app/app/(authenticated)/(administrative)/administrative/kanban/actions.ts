"use server";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import type { KanbanTask, TaskPriority } from "./lib/board-types";

export type AdminTaskStatus = "backlog" | "in_progress" | "review" | "done";
export type AdminTaskPriority = "low" | "medium" | "high";

const adminStatuses: AdminTaskStatus[] = [
  "backlog",
  "in_progress",
  "review",
  "done",
];

const adminPriorities: AdminTaskPriority[] = ["low", "medium", "high"];

// One governed command per target Kanban column (mirrors the AdminTask state
// machine in manifest/source/admin-task-rules.manifest). The board is a
// free-movement <select>, so any column → any other column resolves to the
// command that OWNS the destination state.
const STATUS_COMMAND_MAP: Record<AdminTaskStatus, string> = {
  backlog: "moveToBacklog",
  in_progress: "startProgress",
  review: "submitForReview",
  done: "complete",
};

const getString = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseDate = (value?: string): Date | undefined => {
  if (!value) {
    return;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

/**
 * Server action: fetch admin tasks for the kanban board.
 * This is a READ path — direct Prisma is allowed per constitution §10.
 */
export async function listAdminTasks(): Promise<KanbanTask[]> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantIdForOrg(orgId);

  // Project only the fields the return map below consumes — drops tenantId,
  // deletedAt (already filtered), createdAt (orderBy-only), updatedAt. No
  // `take`: a kanban board must render every task across all columns, so
  // bounding would silently hide cards (the #8 truncation-trap).
  const tasks = await database.adminTask.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      category: true,
      position: true,
      labels: true,
      estimatedHours: true,
      dueDate: true,
      assignedTo: true,
      createdBy: true,
      sourceType: true,
      sourceId: true,
    },
  });

  const employeeIds = Array.from(
    new Set(
      tasks
        .flatMap((task) => [task.assignedTo, task.createdBy])
        .filter((id): id is string => Boolean(id))
    )
  );

  const employees = employeeIds.length
    ? await database.user.findMany({
        where: { tenantId, id: { in: employeeIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];

  const employeeMap = new Map(
    employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`.trim()])
  );

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority as TaskPriority,
    category: t.category,
    position: t.position,
    labels: t.labels,
    estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    assignedTo: t.assignedTo,
    createdBy: t.createdBy,
    sourceType: t.sourceType,
    sourceId: t.sourceId,
    ownerName:
      employeeMap.get(t.assignedTo ?? "") ||
      employeeMap.get(t.createdBy ?? "") ||
      "Unassigned",
  }));
}

/**
 * Revalidate the kanban board path after API-based mutations.
 */
export async function revalidateKanban(): Promise<void> {
  revalidatePath("/administrative/kanban");
  revalidatePath("/administrative/overview-boards");
}

export async function createAdminTask(formData: FormData): Promise<void> {
  // Resolve actor + tenant. requireCurrentUser throws when unauthenticated and
  // returns the internal employee record (id/role) the governed AdminTask.create
  // command needs for permission (manager/admin) + audit context (constitution §19).
  const user = await requireCurrentUser();

  const title = getString(formData, "title");
  const description = getString(formData, "description") ?? "";
  const category = getString(formData, "category") ?? "";
  const status = (getString(formData, "status") ?? "backlog") as string;
  const priority = (getString(formData, "priority") ?? "medium") as string;
  const dueDate = parseDate(getString(formData, "dueDate"));

  // UI-level pre-validation: reject loudly before dispatch so the operator sees a
  // clear error rather than a generic governed-command failure.
  invariant(title, "Title is required");
  invariant(
    adminStatuses.includes(status as AdminTaskStatus),
    "Invalid status"
  );
  invariant(
    adminPriorities.includes(priority as AdminTaskPriority),
    "Invalid priority"
  );

  // Governed write: AdminTask.create runs through the Manifest runtime — no direct
  // prisma.adminTask.create (constitution §3/§9). The creator self-assigns (assignedTo
  // = createdBy = the current user), matching the prior behavior. dueDate is sent as
  // epoch-ms (the store coerces number->Date and null->null via asNullableDate). status
  // flows through the command body as the initial state (the command no longer re-mutates
  // it, which previously tripped a false self-transition — see admin-task-rules.manifest).
  const result = await runManifestCommand({
    entity: "AdminTask",
    command: "create",
    body: {
      title,
      description,
      status,
      priority,
      category,
      assignedTo: user.id,
      dueDate: dueDate ? dueDate.getTime() : null,
      createdBy: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create admin task");
  }

  revalidatePath("/administrative/kanban");
  revalidatePath("/administrative/overview-boards");
}

export async function updateAdminTaskStatus(formData: FormData): Promise<void> {
  // Resolve actor + tenant. requireCurrentUser throws when unauthenticated and
  // returns the internal employee record the governed status command needs for
  // permission (manager/admin) + audit context (constitution §19).
  const user = await requireCurrentUser();

  const taskId = getString(formData, "taskId");
  const status = getString(formData, "status");

  invariant(taskId, "Task ID is required");
  invariant(status, "Status is required");
  invariant(
    adminStatuses.includes(status as AdminTaskStatus),
    "Invalid status"
  );

  // Allowed read (constitution §10): the Kanban <select> defaults to the card's
  // current column, so an "Update" without a change would post the current
  // status. Short-circuit that no-op — otherwise the governed status command
  // (which OWNS the destination state) would be rejected as an illegal no-op
  // self-transition (the runtime does NOT exempt status = status; see
  // admin-task-rules.manifest).
  const existing = await database.adminTask.findFirst({
    where: { tenantId: user.tenantId, id: taskId, deletedAt: null },
    select: { status: true },
  });
  invariant(existing, "Task not found");

  if (existing.status === status) {
    return;
  }

  // Governed write: the status change runs through the Manifest runtime — no
  // direct prisma.adminTask.update (constitution §3/§9). The destination column
  // maps 1:1 to the command that transitions into it; the runtime enforces the
  // legal source states.
  const result = await runManifestCommand({
    entity: "AdminTask",
    command: STATUS_COMMAND_MAP[status as AdminTaskStatus],
    body: {},
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
    instanceId: taskId,
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update task status");
  }

  revalidatePath("/administrative/kanban");
  revalidatePath("/administrative/overview-boards");
}
