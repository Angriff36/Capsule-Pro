import {
  type ConvexDoc,
  convexDocId,
  msToDate,
  parseDecimalString,
} from "@/app/lib/convex/doc-utils";

export type EventListRow = {
  tenantId: string;
  id: string;
  title: string;
  eventNumber: string | null;
  status: string;
  eventType: string;
  eventDate: Date;
  guestCount: number;
  venueName: string | null;
  tags: string[];
  createdAt: Date;
  clientId: string | null;
};

export function mapConvexEventListRow(doc: ConvexDoc): EventListRow {
  return {
    tenantId: String(doc.tenantId ?? ""),
    id: convexDocId(doc),
    title: String(doc.title ?? ""),
    eventNumber: (doc.eventNumber as string | null) ?? null,
    status: String(doc.status ?? ""),
    eventType: String(doc.eventType ?? ""),
    eventDate: msToDate(doc.eventDate) ?? new Date(0),
    guestCount: Number(doc.guestCount ?? 0),
    venueName: (doc.venueName as string | null) ?? null,
    tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
    createdAt: msToDate(doc.createdAt) ?? new Date(0),
    clientId: (doc.clientId as string | null) ?? null,
  };
}

export type KitchenTaskRow = {
  id: string;
  tenantId: string;
  title: string;
  summary: string;
  status: string;
  priority: number | null;
  complexity: number | null;
  tags: string | null;
  assignedTo: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  claims: Array<{
    id: string;
    taskId: string;
    employeeId: string;
    claimedAt: Date | null;
    releasedAt: Date | null;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl: string | null;
    } | null;
  }>;
};

export function mapConvexKitchenTask(
  doc: ConvexDoc,
  claims: ConvexDoc[],
  userById: Map<string, ConvexDoc>
): KitchenTaskRow {
  const taskId = convexDocId(doc);
  const taskClaims = claims
    .filter((c) => String(c.taskId) === taskId && c.releasedAt == null)
    .map((claim) => {
      const employeeId = String(claim.employeeId ?? "");
      const user = userById.get(employeeId);
      return {
        id: convexDocId(claim),
        taskId,
        employeeId,
        claimedAt: msToDate(claim.claimedAt),
        releasedAt: msToDate(claim.releasedAt),
        user: user
          ? {
              id: convexDocId(user),
              firstName: String(user.firstName ?? ""),
              lastName: String(user.lastName ?? ""),
              email: String(user.email ?? ""),
              avatarUrl: (user.avatarUrl as string | null) ?? null,
            }
          : null,
      };
    });

  return {
    id: taskId,
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
    claims: taskClaims,
  };
}
