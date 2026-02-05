"use server";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "../../../lib/tenant";

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
  const { orgId, userId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantIdForOrg(orgId);
  const title = getString(formData, "title");
  const description = getString(formData, "description") || null;
  const category = getString(formData, "category") || null;
  const status = (getString(formData, "status") ?? "backlog") as string;
  const priority = (getString(formData, "priority") ?? "medium") as string;
  const dueDate = parseDate(getString(formData, "dueDate"));

  invariant(title, "Title is required");
  invariant(adminStatuses.includes(status as AdminTaskStatus), "Invalid status");
  invariant(
    adminPriorities.includes(priority as AdminTaskPriority),
    "Invalid priority"
  );

  const employee = userId
    ? await database.user.findFirst({
        where: {
          tenantId,
          authUserId: userId,
        },
      })
    : null;

  const createdBy = employee?.id ?? null;

  await database.adminTask.create({
    data: {
      tenantId,
      title,
      description,
      status,
      priority,
      category,
      dueDate: dueDate ?? null,
      assignedTo: createdBy,
      createdBy,
      sourceType: "manual",
      sourceId: null,
    },
  });

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
  invariant(adminStatuses.includes(status as AdminTaskStatus), "Invalid status");

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
