/**
 * Payroll Approval History API Endpoints
 *
 * GET    /api/payroll/approvals/history      - Get approval history for an entity
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { InvariantError } from "@/app/lib/invariant";

interface PaginationParams {
  page: number;
  limit: number;
}

function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );
  return { page, limit };
}

/**
 * GET /api/payroll/approvals/history - Get approval history
 * Query params:
 * - payrollRunId: string - Filter by payroll run ID
 * - entityId: string - Filter by entity ID
 * - entityType: string - Filter by entity type
 * - action: string - Filter by action (approved, rejected, finalized, approval_requested)
 * - page: number - Page number
 * - limit: number - Items per page
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
    const offset = (page - 1) * limit;

    const payrollRunId = searchParams.get("payrollRunId");
    const action = searchParams.get("action");

    // Validate that at least one filter is provided
    if (!payrollRunId && !searchParams.get("entityId")) {
      return NextResponse.json(
        { message: "At least one filter (payrollRunId or entityId) is required" },
        { status: 400 }
      );
    }

    // Build where conditions
    const conditions: string[] = ["pah.tenant_id = " + tenantId];

    if (payrollRunId) {
      invariant(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payrollRunId),
        "payrollRunId must be a valid UUID"
      );
      conditions.push("pah.payroll_run_id = '" + payrollRunId + "'::uuid");
    }

    if (action) {
      conditions.push("pah.action = '" + action + "'");
    }

    const whereClause = conditions.join(" AND ");

    // Get total count for pagination
    const total = await database.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM tenant_staff.payroll_approval_history pah
        WHERE ${Prisma.raw(whereClause)}
      `
    );

    const totalCount = Number(total[0]?.count ?? 0);

    // Get approval history with performer details
    const history = await database.$queryRaw<
      {
        id: string;
        tenant_id: string;
        payroll_run_id: string;
        action: string;
        previous_status: string;
        new_status: string;
        performed_by: string | null;
        performer_first_name: string | null;
        performer_last_name: string | null;
        performer_email: string | null;
        performed_at: Date;
        reason: string | null;
      }[]
    >(
      Prisma.sql`
        SELECT
          pah.id,
          pah.tenant_id,
          pah.payroll_run_id,
          pah.action,
          pah.previous_status,
          pah.new_status,
          pah.performed_by,
          u.first_name as performer_first_name,
          u.last_name as performer_last_name,
          u.email as performer_email,
          pah.performed_at,
          pah.reason
        FROM tenant_staff.payroll_approval_history pah
        LEFT JOIN tenant_staff.employees u
          ON pah.tenant_id = u.tenant_id
          AND pah.performed_by = u.id
          AND u.deleted_at IS NULL
        WHERE ${Prisma.raw(whereClause)}
        ORDER BY pah.performed_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    );

    const mappedHistory = history.map((entry) => ({
      id: entry.id,
      tenantId: entry.tenant_id,
      payrollRunId: entry.payroll_run_id,
      action: entry.action,
      previousStatus: entry.previous_status,
      newStatus: entry.new_status,
      performedBy: entry.performed_by,
      performerFirstName: entry.performer_first_name,
      performerLastName: entry.performer_last_name,
      performerEmail: entry.performer_email,
      performedAt: entry.performed_at,
      reason: entry.reason,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: mappedHistory,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to get approval history:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
