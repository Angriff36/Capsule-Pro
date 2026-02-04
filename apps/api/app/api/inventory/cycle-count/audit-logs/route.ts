/**
 * Cycle Count Audit Logs API Endpoint
 *
 * GET /api/inventory/cycle-count/audit-logs - Get audit logs with optional session filter
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface PaginationParams {
  page: number;
  limit: number;
}

function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "50", 10), 1),
    200
  );
  return { page, limit };
}

/**
 * GET /api/inventory/cycle-count/audit-logs - Get audit logs
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);

    // Parse filters
    const sessionIdParam = searchParams.get("sessionId");
    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");

    const where: Record<string, unknown> = {
      tenantId,
    };

    if (sessionIdParam) {
      // Find the session by sessionId to get the internal id
      const session = await database.cycleCountSession.findFirst({
        where: {
          tenantId,
          sessionId: sessionIdParam,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (session) {
        where.sessionId = session.id;
      } else {
        // Session not found, return empty results
        return NextResponse.json({
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
    }

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    // Get total count for pagination
    const total = await database.cycleCountAuditLog.count({ where });

    // Get audit logs with pagination
    const logs = await database.cycleCountAuditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const mappedLogs = logs.map((log) => ({
      id: log.id,
      tenant_id: log.tenantId,
      session_id: log.sessionId,
      record_id: log.recordId,
      action: log.action,
      entity_type: log.entityType,
      entity_id: log.entityId,
      old_value: log.oldValue as Record<string, unknown> | null,
      new_value: log.newValue as Record<string, unknown> | null,
      performed_by_id: log.performedById,
      ip_address: log.ipAddress,
      user_agent: log.userAgent,
      created_at: log.createdAt,
    }));

    return NextResponse.json({
      data: mappedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to get audit logs:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
