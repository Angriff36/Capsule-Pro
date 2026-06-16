import "server-only";

import {
  mapConvexKitchenTask,
  type KitchenTaskRow,
} from "./domain-mappers";

export type { KitchenTaskRow };
import {
  activeTenantRows,
  convexDocId,
  msToDate,
  serverGetEntity,
  serverListEntity,
  type ConvexDoc,
} from "./server-reads";

export type KitchenTaskClaimRow = {
  id: string;
  tenantId: string;
  taskId: string;
  employeeId: string;
  claimedAt: Date | null;
  releasedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type KitchenTaskProgressRow = {
  id: string;
  tenantId: string;
  taskId: string;
  employeeId: string;
  progressType: string;
  newStatus: string;
  progressPct: number;
  notes: string | null;
  recordedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

function mapKitchenTaskDoc(doc: ConvexDoc): KitchenTaskRow {
  return {
    id: convexDocId(doc),
    tenantId: String(doc.tenantId ?? ""),
    title: String(doc.title ?? ""),
    summary: String(doc.summary ?? ""),
    status: String(doc.status ?? ""),
    priority: doc.priority != null ? Number(doc.priority) : null,
    complexity: doc.complexity != null ? Number(doc.complexity) : null,
    tags: (doc.tags as string | null) ?? null,
    assignedTo: (doc.assignedTo as string | null) ?? null,
    dueDate: msToDate(doc.dueDate),
    completedAt: msToDate(doc.completedAt),
    createdAt: msToDate(doc.createdAt),
    updatedAt: msToDate(doc.updatedAt),
    claims: [],
  };
}

function mapKitchenTaskClaimDoc(doc: ConvexDoc): KitchenTaskClaimRow {
  return {
    id: convexDocId(doc),
    tenantId: String(doc.tenantId ?? ""),
    taskId: String(doc.taskId ?? ""),
    employeeId: String(doc.employeeId ?? ""),
    claimedAt: msToDate(doc.claimedAt),
    releasedAt: msToDate(doc.releasedAt),
    createdAt: msToDate(doc.createdAt),
    updatedAt: msToDate(doc.updatedAt),
  };
}

function mapKitchenTaskProgressDoc(doc: ConvexDoc): KitchenTaskProgressRow {
  return {
    id: convexDocId(doc),
    tenantId: String(doc.tenantId ?? ""),
    taskId: String(doc.taskId ?? ""),
    employeeId: String(doc.employeeId ?? ""),
    progressType: String(doc.progressType ?? ""),
    newStatus: String(doc.newStatus ?? ""),
    progressPct: Number(doc.progressPct ?? 0),
    notes: (doc.notes as string | null) ?? null,
    recordedAt: msToDate(doc.recordedAt),
    createdAt: msToDate(doc.createdAt),
    updatedAt: msToDate(doc.updatedAt),
  };
}

export async function loadKitchenTaskById(taskId: string): Promise<KitchenTaskRow | null> {
  const doc = await serverGetEntity("KitchenTask", taskId);
  if (!doc || doc.deletedAt != null) return null;
  return mapKitchenTaskDoc(doc);
}

export async function loadKitchenTasks(filters?: { status?: string; priority?: number }): Promise<KitchenTaskRow[]> {
  return activeTenantRows(await serverListEntity("KitchenTask"))
    .map(mapKitchenTaskDoc)
    .filter((task) => {
      if (filters?.status && task.status !== filters.status) return false;
      if (filters?.priority != null && task.priority !== filters.priority) return false;
      return true;
    })
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function loadUrgentKitchenTasks(): Promise<KitchenTaskRow[]> {
  const openStatuses = new Set(["pending", "open", "in_progress"]);
  return (await loadKitchenTasks()).filter((task) => (task.priority ?? 999) <= 2 && openStatuses.has(task.status));
}

export async function loadKitchenTaskClaimById(claimId: string): Promise<KitchenTaskClaimRow | null> {
  const doc = await serverGetEntity("KitchenTaskClaim", claimId);
  if (!doc || doc.deletedAt != null) return null;
  return mapKitchenTaskClaimDoc(doc);
}

export async function loadMyActiveKitchenTaskClaims(employeeId: string): Promise<KitchenTaskClaimRow[]> {
  return activeTenantRows(await serverListEntity("KitchenTaskClaim"))
    .filter((claim) => String(claim.employeeId) === employeeId && claim.releasedAt == null)
    .map(mapKitchenTaskClaimDoc)
    .sort((a, b) => (b.claimedAt?.getTime() ?? 0) - (a.claimedAt?.getTime() ?? 0));
}

export async function loadActiveKitchenTaskClaim(taskId: string) {
  const claims = activeTenantRows(await serverListEntity("KitchenTaskClaim"))
    .filter((claim) => String(claim.taskId) === taskId && claim.releasedAt == null)
    .map(mapKitchenTaskClaimDoc);
  return claims[0] ?? null;
}

export async function loadKitchenTaskProgressById(progressId: string) {
  const doc = await serverGetEntity("KitchenTaskProgress", progressId);
  if (!doc || doc.deletedAt != null) return null;
  return mapKitchenTaskProgressDoc(doc);
}

export async function loadKitchenTaskProgressLog(taskId: string) {
  return activeTenantRows(await serverListEntity("KitchenTaskProgress"))
    .filter((row) => String(row.taskId) === taskId)
    .map(mapKitchenTaskProgressDoc)
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function loadKitchenTasksPageData(clerkId: string | null) {
  const [tasksRaw, claimsRaw, usersRaw] = await Promise.all([
    serverListEntity("KitchenTask"),
    serverListEntity("KitchenTaskClaim"),
    serverListEntity("User"),
  ]);
  const userById = new Map(activeTenantRows(usersRaw).map((user) => [convexDocId(user), user]));
  const tasks = tasksRaw
    .filter((doc) => doc.deletedAt == null)
    .map((task) => mapConvexKitchenTask(task, claimsRaw as ConvexDoc[], userById))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  const currentUser = clerkId
    ? activeTenantRows(usersRaw).find((user) => String(user.authUserId ?? "") === clerkId)
    : null;
  const myClaims = currentUser
    ? activeTenantRows(claimsRaw)
        .filter((claim) => String(claim.employeeId) === convexDocId(currentUser) && claim.releasedAt == null)
        .map(mapKitchenTaskClaimDoc)
    : [];
  return { tasks, myClaims };
}


export async function loadKitchenTaskClaimsForTask(taskId: string): Promise<KitchenTaskClaimRow[]> {
  return activeTenantRows(await serverListEntity("KitchenTaskClaim"))
    .filter((claim) => String(claim.taskId) === taskId)
    .map(mapKitchenTaskClaimDoc)
    .sort((a, b) => (b.claimedAt?.getTime() ?? 0) - (a.claimedAt?.getTime() ?? 0));
}

export async function loadRecentEventsForPrepList(limit = 20) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return activeTenantRows(await serverListEntity("Event"))
    .filter((event) => {
      const eventDate = msToDate(event.eventDate);
      return eventDate != null && eventDate.getTime() >= cutoff;
    })
    .map((event) => ({
      id: convexDocId(event),
      title: String(event.title ?? ""),
      eventDate: msToDate(event.eventDate) ?? new Date(),
      guestCount: Number(event.guestCount ?? 0),
    }))
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
    .slice(0, limit);
}
