/**
 * Individual Payroll Run API Endpoints
 *
 * GET    /api/payroll/runs/[runId]      - Get details of a specific payroll run with line items
 * PUT    /api/payroll/runs/[runId]      - Update payroll run (approve, reject, finalize)
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type PayrollRunStatus =
  | "pending"
  | "processing"
  | "completed"
  | "approved"
  | "paid"
  | "failed";

const UpdatePayrollRunSchema = z.object({
  status: z
    .enum(["pending", "processing", "completed", "approved", "paid", "failed"])
    .optional(),
  rejectionReason: z.string().optional(),
});

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RouteContext {
  params: Promise<{
    runId: string;
  }>;
}

/**
 * GET /api/payroll/runs/[runId] - Get payroll run details with line items
 */
export async function GET(_request: Request, context: RouteContext) {
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

    const { runId } = await context.params;

    if (!UUID_REGEX.test(runId)) {
      return NextResponse.json(
        { message: "Invalid runId format" },
        { status: 400 }
      );
    }

    // Get the payroll run with period details
    const runResult = await database.$queryRaw<
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
        created_at: Date;
        updated_at: Date;
        period_start: Date | null;
        period_end: Date | null;
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
          pr.created_at,
          pr.updated_at,
          pp.period_start,
          pp.period_end
        FROM tenant_staff.payroll_runs pr
        LEFT JOIN tenant_staff.payroll_periods pp ON pr.payroll_period_id = pp.id
        WHERE pr.tenant_id = ${tenantId}
          AND pr.id = ${runId}::uuid
          AND pr.deleted_at IS NULL
      `
    );

    if (!runResult || runResult.length === 0) {
      return NextResponse.json(
        { message: "Payroll run not found" },
        { status: 404 }
      );
    }

    const run = runResult[0];

    // Get line items with employee details
    const lineItemsResult = await database.$queryRaw<
      {
        id: string;
        payroll_run_id: string;
        employee_id: string;
        employee_first_name: string | null;
        employee_last_name: string | null;
        employee_email: string;
        employee_role: string;
        hours_regular: number;
        hours_overtime: number;
        rate_regular: number;
        rate_overtime: number;
        gross_pay: number;
        deductions: Record<string, unknown>;
        net_pay: number;
        created_at: Date;
        updated_at: Date;
      }[]
    >(
      Prisma.sql`
        SELECT
          pli.id,
          pli.payroll_run_id,
          pli.employee_id,
          e.first_name as employee_first_name,
          e.last_name as employee_last_name,
          e.email as employee_email,
          e.role as employee_role,
          pli.hours_regular,
          pli.hours_overtime,
          pli.rate_regular,
          pli.rate_overtime,
          pli.gross_pay,
          pli.deductions,
          pli.net_pay,
          pli.created_at,
          pli.updated_at
        FROM tenant_staff.payroll_line_items pli
        JOIN staff.employees e ON pli.employee_id = e.id
        WHERE pli.tenant_id = ${tenantId}
          AND pli.payroll_run_id = ${runId}::uuid
          AND pli.deleted_at IS NULL
        ORDER BY e.last_name, e.first_name
      `
    );

    // Get approval history from audit log
    const approvalHistoryResult = await database.$queryRaw<
      {
        id: string;
        action: string;
        performed_by: string | null;
        performer_first_name: string | null;
        performer_last_name: string | null;
        old_values: Record<string, unknown> | null;
        new_values: Record<string, unknown> | null;
        created_at: Date;
      }[]
    >(
      Prisma.sql`
        SELECT
          al.id,
          al.action,
          al.performed_by,
          u.first_name as performer_first_name,
          u.last_name as performer_last_name,
          al.old_values,
          al.new_values,
          al.created_at
        FROM platform.audit_log al
        LEFT JOIN auth.users u ON al.performed_by = u.id
        WHERE al.table_name = 'payroll_runs'
          AND al.record_id = ${runId}::uuid
          AND (al.action = 'update' OR al.action = 'insert')
        ORDER BY al.created_at DESC
        LIMIT 20
      `
    );

    // Get employee count
    const employeeCountResult = await database.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM tenant_staff.payroll_line_items
        WHERE tenant_id = ${tenantId}
          AND payroll_run_id = ${runId}::uuid
          AND deleted_at IS NULL
      `
    );

    const mappedRun = {
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
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      periodStart: run.period_start,
      periodEnd: run.period_end,
      employeeCount: Number(employeeCountResult[0]?.count ?? 0),
    };

    const mappedLineItems = lineItemsResult.map((item) => ({
      id: item.id,
      payrollRunId: item.payroll_run_id,
      employeeId: item.employee_id,
      employeeFirstName: item.employee_first_name,
      employeeLastName: item.employee_last_name,
      employeeEmail: item.employee_email,
      employeeRole: item.employee_role,
      hoursRegular: Number(item.hours_regular),
      hoursOvertime: Number(item.hours_overtime),
      rateRegular: Number(item.rate_regular),
      rateOvertime: Number(item.rate_overtime),
      grossPay: Number(item.gross_pay),
      deductions: item.deductions as Record<string, number>,
      netPay: Number(item.net_pay),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    const mappedApprovalHistory = approvalHistoryResult.map((entry) => ({
      id: entry.id,
      action: entry.action,
      performedBy: entry.performed_by,
      performerFirstName: entry.performer_first_name,
      performerLastName: entry.performer_last_name,
      oldValues: entry.old_values,
      newValues: entry.new_values,
      createdAt: entry.created_at,
    }));

    return NextResponse.json({
      data: mappedRun,
      lineItems: mappedLineItems,
      approvalHistory: mappedApprovalHistory,
    });
  } catch (error) {
    console.error("Failed to get payroll run details:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/payroll/runs/[runId] - Update payroll run
 */
export async function PUT(request: Request, context: RouteContext) {
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

    const { runId } = await context.params;

    if (!UUID_REGEX.test(runId)) {
      return NextResponse.json(
        { message: "Invalid runId format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = UpdatePayrollRunSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Invalid request body",
          errors: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { status } = validationResult.data;

    // Get current run to check if update is valid
    const currentRunResult = await database.$queryRaw<{ status: string }[]>(
      Prisma.sql`
        SELECT status
        FROM tenant_staff.payroll_runs
        WHERE tenant_id = ${tenantId}
          AND id = ${runId}::uuid
          AND deleted_at IS NULL
      `
    );

    if (!currentRunResult || currentRunResult.length === 0) {
      return NextResponse.json(
        { message: "Payroll run not found" },
        { status: 404 }
      );
    }

    const currentStatus = currentRunResult[0].status as PayrollRunStatus;

    // Validate status transitions
    if (status === "approved" && currentStatus !== "completed") {
      return NextResponse.json(
        { message: "Can only approve completed payroll runs" },
        { status: 400 }
      );
    }

    if (status === "paid" && currentStatus !== "approved") {
      return NextResponse.json(
        { message: "Can only mark as paid for approved payroll runs" },
        { status: 400 }
      );
    }

    // Update the payroll run
    const updateResult = await database.$queryRaw<
      { id: string; status: string }[]
    >(
      Prisma.sql`
        UPDATE tenant_staff.payroll_runs
        SET
          status = ${status},
          approved_by = CASE
            WHEN ${status} = 'approved' THEN ${userId}
            ELSE approved_by
          END,
          approved_at = CASE
            WHEN ${status} = 'approved' THEN NOW()
            ELSE approved_at
          END,
          paid_at = CASE
            WHEN ${status} = 'paid' THEN NOW()
            ELSE paid_at
          END,
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND id = ${runId}::uuid
          AND deleted_at IS NULL
        RETURNING id, status
      `
    );

    if (!updateResult || updateResult.length === 0) {
      return NextResponse.json(
        { message: "Failed to update payroll run" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Payroll run updated successfully",
      data: {
        id: updateResult[0].id,
        status: updateResult[0].status,
      },
    });
  } catch (error) {
    console.error("Failed to update payroll run:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
