"use server";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { runManifestCommand } from "@/lib/manifest-command";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";

export type AdminTaskStatus = "backlog" | "in_progress" | "review" | "done";
export type AdminTaskPriority = "low" | "medium" | "high";

export interface AdminTaskItem {
  id: string;
  title: string;
  description: string | null;
  status: AdminTaskStatus;
  priority: AdminTaskPriority;
  category: string | null;
  dueDate: Date | null;
  assignedTo: string | null;
  createdBy: string | null;
  ownerName: string;
}

const adminStatuses: AdminTaskStatus[] = [
  "backlog",
  "in_progress",
  "review",
  "done",
];

const adminPriorities: AdminTaskPriority[] = ["low", "medium", "high"];

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

export async function listAdminTasks(): Promise<AdminTaskItem[]> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantIdForOrg(orgId);

  const tasks = await database.adminTask.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
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
        where: {
          tenantId,
          id: {
            in: employeeIds,
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      })
    : [];

  const employeeMap = new Map(
    employees.map((employee) => [
      employee.id,
      `${employee.firstName} ${employee.lastName}`.trim(),
    ])
  );

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as AdminTaskStatus,
    priority: task.priority as AdminTaskPriority,
    category: task.category,
    dueDate: task.dueDate,
    assignedTo: task.assignedTo,
    createdBy: task.createdBy,
    ownerName:
      employeeMap.get(task.assignedTo ?? "") ||
      employeeMap.get(task.createdBy ?? "") ||
      "Unassigned",
  }));
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
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantIdForOrg(orgId);
  const taskId = getString(formData, "taskId");
  const status = getString(formData, "status");

  invariant(taskId, "Task ID is required");
  invariant(status, "Status is required");
  invariant(
    adminStatuses.includes(status as AdminTaskStatus),
    "Invalid status"
  );

  await database.adminTask.update({
    where: {
      tenantId_id: {
        tenantId,
        id: taskId,
      },
    },
    data: {
      status,
    },
  });

  revalidatePath("/administrative/kanban");
  revalidatePath("/administrative/overview-boards");
}
