/**
 * Payroll Approval Details API Endpoints
 *
 * PUT    /api/payroll/approvals/[approvalId]      - Update approval status (approve/reject)
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PayrollRunStatus =
  | "pending"
  | "processing"
  | "completed"
  | "approved"
  | "rejected"
  | "finalized"
  | "paid"
  | "failed";

const UpdateApprovalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  approvedBy: z.string().uuid().optional(),
  rejectReason: z.string().optional(),
});

interface RouteContext {
  params: Promise<{
    approvalId: string;
  }>;
}

/**
 * PUT /api/payroll/approvals/[approvalId] - Update approval status
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

    const { approvalId } = await context.params;

    invariant(approvalId, "approvalId is required");

    const body = await request.json();
    const parseResult = UpdateApprovalSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          message: "Invalid request body",
          errors: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { status, approvedBy, rejectReason } = parseResult.data;

    // Validate UUID format
    invariant(UUID_REGEX.test(approvalId), "approvalId must be a valid UUID");

    // Check if the approval history entry exists
    const approvalResult = await database.$queryRaw<
      { id: string; payroll_run_id: string; previous_status: string }[]
    >(
      Prisma.sql`
        SELECT id, payroll_run_id, previous_status
        FROM tenant_staff.payroll_approval_history
        WHERE tenant_id = ${tenantId}
          AND id = ${approvalId}::uuid
      `
    );

    if (!approvalResult || approvalResult.length === 0) {
      return NextResponse.json(
        { message: "Approval not found" },
        { status: 404 }
      );
    }

    const approval = approvalResult[0];
    const payrollRunId = approval.payroll_run_id;
    const currentStatus = approval.previous_status as PayrollRunStatus;

    // When rejecting, require rejectReason
    if (status === "rejected" && !rejectReason) {
      return NextResponse.json(
        { message: "rejectReason is required when rejecting" },
        { status: 400 }
      );
    }

    // When approving, require approvedBy
    if (status === "approved" && !(approvedBy || userId)) {
      return NextResponse.json(
        { message: "approvedBy is required when approving" },
        { status: 400 }
      );
    }

    // Update the payroll run status
    const updatedRuns = await database.$queryRaw<
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
      }[]
    >(
      Prisma.sql`
        UPDATE tenant_staff.payroll_runs
        SET
          status = ${status},
          approved_by = ${approvedBy || userId},
          approved_at = CASE
            WHEN ${status} = 'approved' THEN NOW()
            ELSE approved_at
          END,
          reject_reason = ${rejectReason || null},
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND id = ${payrollRunId}::uuid
          AND deleted_at IS NULL
        RETURNING
          id, tenant_id, payroll_period_id, run_date, status,
          total_gross, total_deductions, total_net,
          approved_by, approved_at, paid_at, reject_reason,
          created_at, updated_at
      `
    );

    if (!updatedRuns || updatedRuns.length === 0) {
      return NextResponse.json(
        { message: "Failed to update payroll run" },
        { status: 500 }
      );
    }

    const updatedRun = updatedRuns[0];

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
          ${status},
          ${currentStatus},
          ${status},
          ${approvedBy || userId},
          ${new Date()},
          ${rejectReason || null}
        )
      `
    );

    const response = {
      id: updatedRun.id,
      tenantId: updatedRun.tenant_id,
      payrollPeriodId: updatedRun.payroll_period_id,
      runDate: updatedRun.run_date,
      status: updatedRun.status,
      totalGross: Number(updatedRun.total_gross),
      totalDeductions: Number(updatedRun.total_deductions),
      totalNet: Number(updatedRun.total_net),
      approvedBy: updatedRun.approved_by,
      approvedAt: updatedRun.approved_at,
      paidAt: updatedRun.paid_at,
      rejectReason: updatedRun.reject_reason,
      createdAt: updatedRun.created_at,
      updatedAt: updatedRun.updated_at,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to update approval:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
