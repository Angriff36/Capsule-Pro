// Kitchen Team Activity feed
// Aggregates recent KitchenTaskProgress + KitchenTaskClaim events (joined with
// employee + task title) into a single chronological feed for the production
// board's "Team Activity" panel.

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export interface TeamActivityItem {
  action: string;
  createdAt: string;
  detail: string | null;
  employeeAvatarUrl: string | null;
  employeeId: string;
  employeeName: string | null;
  id: string;
  kind: "claim" | "release" | "progress";
  newStatus: string | null;
  oldStatus: string | null;
  taskId: string;
  taskTitle: string | null;
}

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit")) || DEFAULT_LIMIT;
    const limit = Math.max(1, Math.min(MAX_LIMIT, requestedLimit));

    // Fetch more than `limit` from each source so the merged stream is dense
    // enough after sort + truncation.
    const fetchSize = limit * 2;

    const [progress, claims] = await Promise.all([
      database.kitchenTaskProgress.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: fetchSize,
      }),
      database.kitchenTaskClaim.findMany({
        where: { tenantId },
        orderBy: { claimedAt: "desc" },
        take: fetchSize,
      }),
    ]);

    const taskIds = new Set<string>();
    const employeeIds = new Set<string>();
    for (const row of progress) {
      taskIds.add(row.taskId);
      employeeIds.add(row.employeeId);
    }
    for (const row of claims) {
      taskIds.add(row.taskId);
      employeeIds.add(row.employeeId);
    }

    const [tasks, employees] = await Promise.all([
      taskIds.size === 0
        ? []
        : database.kitchenTask.findMany({
            where: { tenantId, id: { in: Array.from(taskIds) } },
            select: { id: true, title: true },
          }),
      employeeIds.size === 0
        ? []
        : database.user.findMany({
            where: { tenantId, id: { in: Array.from(employeeIds) } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          }),
    ]);

    const taskTitleById = new Map(tasks.map((t) => [t.id, t.title ?? null]));
    const employeeById = new Map(employees.map((u) => [u.id, u]));

    const formatName = (id: string): string | null => {
      const u = employeeById.get(id);
      if (!u) {
        return null;
      }
      const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
      return full || u.email || null;
    };

    const items: TeamActivityItem[] = [];

    for (const row of progress) {
      items.push({
        id: `progress:${row.id}`,
        kind: "progress",
        taskId: row.taskId,
        taskTitle: taskTitleById.get(row.taskId) ?? null,
        employeeId: row.employeeId,
        employeeName: formatName(row.employeeId),
        employeeAvatarUrl: employeeById.get(row.employeeId)?.avatarUrl ?? null,
        action: row.progressType,
        detail: row.notes ?? null,
        oldStatus: row.oldStatus ?? null,
        newStatus: row.newStatus ?? null,
        createdAt: row.createdAt.toISOString(),
      });
    }

    for (const row of claims) {
      const released = row.releasedAt !== null;
      // Always include claim event
      items.push({
        id: `claim:${row.id}`,
        kind: "claim",
        taskId: row.taskId,
        taskTitle: taskTitleById.get(row.taskId) ?? null,
        employeeId: row.employeeId,
        employeeName: formatName(row.employeeId),
        employeeAvatarUrl: employeeById.get(row.employeeId)?.avatarUrl ?? null,
        action: "claimed",
        detail: null,
        oldStatus: null,
        newStatus: null,
        createdAt: row.claimedAt.toISOString(),
      });
      // And a separate release event if released
      if (released && row.releasedAt) {
        items.push({
          id: `release:${row.id}`,
          kind: "release",
          taskId: row.taskId,
          taskTitle: taskTitleById.get(row.taskId) ?? null,
          employeeId: row.employeeId,
          employeeName: formatName(row.employeeId),
          employeeAvatarUrl:
            employeeById.get(row.employeeId)?.avatarUrl ?? null,
          action: "released",
          detail: row.releaseReason ?? null,
          oldStatus: null,
          newStatus: null,
          createdAt: row.releasedAt.toISOString(),
        });
      }
    }

    items.sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
    );

    return manifestSuccessResponse({ items: items.slice(0, limit) });
  } catch (error) {
    log.error("Error fetching kitchen team activity:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
