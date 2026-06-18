// Reaction Execution Log API Route
//
// Tenant-scoped, read-only feed of Manifest runtime command/reaction executions
// (which reaction fired, what command triggered it, payload shape, success/
// failure, error message). This is a READ PATH over an operational/observability
// log (constitution §10) — it never mutates governed state.

import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export interface ReactionLogItem {
  actorId: string | null;
  causationId: string | null;
  command: string;
  correlationId: string | null;
  createdAt: Date;
  durationMs: number | null;
  emittedEvents: string[];
  entity: string | null;
  errorMessage: string | null;
  id: string;
  payloadKeys: string[];
  reactions: string[];
  retryCount: number;
  source: string | null;
  status: string;
  tenantId: string;
}

// GET /api/reactions-log/list — list reaction-execution log rows (filtered, paged).
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

    // Filters
    const status = searchParams.get("status"); // "success" | "failed"
    const entity = searchParams.get("entity");
    const command = searchParams.get("command");
    const correlationId = searchParams.get("correlationId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Pagination
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Number(searchParams.get("offset")) || 0;

    const where: Prisma.ReactionLogWhereInput = { tenantId };
    if (status) {
      where.status = status;
    }
    if (entity) {
      where.entity = entity;
    }
    if (command) {
      where.command = command;
    }
    if (correlationId) {
      where.correlationId = correlationId;
    }
    if (startDate || endDate) {
      where.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }

    const totalCount = await database.reactionLog.count({ where });

    const logs = await database.reactionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const hasMore = offset + logs.length < totalCount;

    return manifestSuccessResponse({
      logs: logs as ReactionLogItem[],
      hasMore,
      totalCount,
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching reaction log:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
