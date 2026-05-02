/**
 * Audit Log Endpoint
 *
 * GET /api/settings/audit-log - List audit log entries for the tenant
 *
 * Query params:
 *   page       - page number (default 1)
 *   limit      - items per page (default 50, max 200)
 *   action     - filter by action type: insert | update | delete
 *   table_name - filter by table name
 *   search     - search performed_by user email/name
 */

import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { withRateLimit } from "@/middleware/rate-limiter";

export const runtime = "nodejs";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export const GET = withRateLimit(
  async (request: Request) => {
    try {
      const currentUser = await requireCurrentUser();
      const { searchParams } = new URL(request.url);

      const page = Math.max(1, Number(searchParams.get("page")) || 1);
      const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT)
      );
      const action = searchParams.get("action");
      const tableName = searchParams.get("table_name");
      const performedBy = searchParams.get("performed_by");

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Record<string, unknown> = {
        tenant_id: currentUser.tenantId,
      };

      if (
        action &&
        (action === "insert" || action === "update" || action === "delete")
      ) {
        where.action = action;
      }

      if (tableName) {
        where.table_name = tableName;
      }

      if (performedBy) {
        where.performed_by = performedBy;
      }

      const [logs, total] = await Promise.all([
        database.audit_log.findMany({
          where,
          orderBy: { created_at: "desc" },
          take: limit,
          skip,
        }),
        database.audit_log.count({ where }),
      ]);

      // Resolve performed_by user names
      const userIds = [
        ...new Set(
          logs
            .map((l) => l.performed_by)
            .filter((id): id is string => id !== null)
        ),
      ];

      let userMap: Record<string, { email: string; name: string }> = {};

      if (userIds.length > 0) {
        const users = await database.user.findMany({
          where: {
            id: { in: userIds },
            tenantId: currentUser.tenantId,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        });

        userMap = Object.fromEntries(
          users.map((u) => [
            u.id,
            {
              email: u.email,
              name:
                [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
            },
          ])
        );
      }

      // Get distinct table names for filter options
      const distinctTables = await database.audit_log.findMany({
        where: { tenant_id: currentUser.tenantId },
        select: { table_name: true },
        distinct: ["table_name"],
        orderBy: { table_name: "asc" },
      });

      const entries = logs.map((log) => ({
        id: log.id,
        tableName: log.table_name,
        tableSchema: log.table_schema,
        recordId: log.record_id,
        action: log.action,
        oldValues: log.old_values,
        newValues: log.new_values,
        performedBy: log.performed_by,
        performedByName: log.performed_by
          ? (userMap[log.performed_by]?.name ?? null)
          : null,
        performedByEmail: log.performed_by
          ? (userMap[log.performed_by]?.email ?? null)
          : null,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        createdAt: log.created_at.toISOString(),
      }));

      return NextResponse.json({
        entries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        tableNames: distinctTables.map((t) => t.table_name),
      });
    } catch (error) {
      captureException(error);
      console.error("[AuditLog/list] Error:", error);
      return NextResponse.json(
        { message: "Failed to fetch audit log entries" },
        { status: 500 }
      );
    }
  },
  { limit: 60, window: "1m" }
);
