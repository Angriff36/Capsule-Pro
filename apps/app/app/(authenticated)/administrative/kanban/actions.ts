"use server";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "../../../lib/tenant";
import type { KanbanTask, TaskPriority } from "./lib/board-types";

/**
 * Server action: fetch admin tasks for the kanban board.
 * This is a READ path — direct Prisma is allowed per constitution §10.
 */
export async function listAdminTasks(): Promise<KanbanTask[]> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await getTenantIdForOrg(orgId);

  const tasks = await database.adminTask.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
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
