/**
 * Payroll Approvals API Endpoints
 *
 * GET    /api/payroll/approvals      - List all pending approval requests
 * POST   /api/payroll/approvals      - Create approval request for a payroll run
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { invariant } from "@/app/lib/invariant";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { z } from "zod";

type PayrollRunStatus =
  | "pending"
  | "processing"
  | "completed"
  | "approved"
  | "rejected"
  | "finalized"
  | "paid"
  | "failed";

const CreateApprovalRequestSchema = z.object({
  payrollRunId: z.string().uuid(),
  requestedBy: z.string().uuid().optional(),
  notes: z.string().optional(),
});

interface PaginationParams {
  page: number;
  limit: number;
}

function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );
  return { page, limit };
}

/**
 * GET /api/payroll/approvals - List all pending approval requests
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

    const status = searchParams.get("status") as PayrollRunStatus | null;

    // Get total count for pagination
    const total = await database.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM tenant_staff.payroll_runs
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          ${status ? Prisma.sql`AND status = ${status}` : Prisma.empty}
          AND (status = 'pending' OR status = 'completed' OR status = 'approved')
      `
    );

    const totalCount = Number(total[0]?.count ?? 0);

    // Get payroll runs that need approval with employee counts
    const runs = await database.$queryRaw<
      {
        id: string;
        tenant_id: string;
        payroll_period_id: string;
        run_date: Date;
        status: PayrollRunStatus;
        total_gross: number;
        total_deductions: number;
        total_net: number;
        approved_by: string | null;
        approved_at: Date | null;
        paid_at: Date | null;
        reject_reason: string | null;
        created_at: Date;
        updated_at: Date;
        period_start: Date | null;
        period_end: Date | null;
        employee_count: bigint;
      }[]
    >(
      Prisma.sql`
        SELECT
          pr.id,
          pr.tenant_id,
          pr.payroll_period_id,
          pr.run_date,
          pr.status,
          pr.total_gross,
          pr.total_deductions,
          pr.total_net,
          pr.approved_by,
          pr.approved_at,
          pr.paid_at,
          pr.reject_reason,
          pr.created_at,
          pr.updated_at,
          pp.period_start,
          pp.period_end,
          COUNT(DISTINCT pli.employee_id) as employee_count
        FROM tenant_staff.payroll_runs pr
        LEFT JOIN tenant_staff.payroll_periods pp
          ON pr.tenant_id = pp.tenant_id
          AND pr.payroll_period_id = pp.id
          AND pp.deleted_at IS NULL
        LEFT JOIN tenant_staff.payroll_line_items pli
          ON pr.tenant_id = pli.tenant_id
          AND pr.id = pli.payroll_run_id
          AND pli.deleted_at IS NULL
        WHERE pr.tenant_id = ${tenantId}
          AND pr.deleted_at IS NULL
          ${status ? Prisma.sql`AND pr.status = ${status}` : Prisma.empty}
          AND (pr.status = 'pending' OR pr.status = 'completed' OR pr.status = 'approved')
        GROUP BY pr.id, pr.tenant_id, pr.payroll_period_id, pr.run_date, pr.status,
          pr.total_gross, pr.total_deductions, pr.total_net, pr.approved_by, pr.approved_at,
          pr.paid_at, pr.reject_reason, pr.created_at, pr.updated_at, pp.period_start, pp.period_end
        ORDER BY pr.run_date DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    );

    const mappedRuns = runs.map((run) => ({
      id: run.id,
      tenantId: run.tenant_id,
      payrollPeriodId: run.payroll_period_id,
      runDate: run.run_date,
      status: run.status,
      totalGross: Number(run.total_gross),
      totalDeductions: Number(run.total_deductions),
      totalNet: Number(run.total_net),
      approvedBy: run.approved_by,
      approvedAt: run.approved_at,
      paidAt: run.paid_at,
      rejectReason: run.reject_reason,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      periodStart: run.period_start,
      periodEnd: run.period_end,
      employeeCount: Number(run.employee_count),
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: mappedRuns,
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
    console.error("Failed to list approval requests:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payroll/approvals - Create approval request for a payroll run
 */
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
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

    const body = await request.json();
    const parseResult = CreateApprovalRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          message: "Invalid request body",
          errors: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { payrollRunId, requestedBy, notes } = parseResult.data;

    invariant(payrollRunId, "payrollRunId is required");

    // Check if the payroll run exists
    const runResult = await database.$queryRaw<{ id: string; status: string }[]>(
      Prisma.sql`
        SELECT id, status
        FROM tenant_staff.payroll_runs
        WHERE tenant_id = ${tenantId}
          AND id = ${payrollRunId}::uuid
          AND deleted_at IS NULL
      `
    );

    if (!runResult || runResult.length === 0) {
      return NextResponse.json(
        { message: "Payroll run not found" },
        { status: 404 }
      );
    }

    const run = runResult[0];

    // Only allow creating approval requests for completed or pending runs
    if (run.status !== "completed" && run.status !== "pending") {
      return NextResponse.json(
        { message: "Can only create approval requests for pending or completed payroll runs" },
        { status: 400 }
      );
    }

    // Create approval history entry
    await database.$queryRaw(
      Prisma.sql`
        INSERT INTO tenant_staff.payroll_approval_history (
          tenant_id, payroll_run_id, action, previous_status, new_status,
          performed_by, performed_at, reason
        )
        VALUES (
          ${tenantId},
          ${payrollRunId}::uuid,
          'approval_requested',
          ${run.status},
          ${run.status},
          ${requestedBy || userId},
          ${new Date()},
          ${notes || null}
        )
      `
    );

    return NextResponse.json(
      {
        message: "Approval request created successfully",
        data: {
          payrollRunId,
          status: "pending_approval",
          requestedAt: new Date(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to create approval request:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
