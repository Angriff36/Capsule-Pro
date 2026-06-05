/**
 * Payroll Approval Details API Endpoints
 *
 * PUT    /api/payroll/approvals/[approvalId]      - Update approval status (approve/reject)
 *
 * Governance: Routes all writes through Manifest runtime (Task 8.1).
 * PayrollRun.approve/reject enforces state transitions, RBAC, audit trail.
 * PayrollApprovalHistory.create records the approval action.
 */

import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiManager } from "@/app/lib/auth-roles";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UpdateApprovalSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  approvedBy: z.uuid().optional(),
  rejectReason: z.string().optional(),
});

interface RouteContext {
  params: Promise<{
    approvalId: string;
  }>;
}

/**
 * PUT /api/payroll/approvals/[approvalId] - Update approval status
 *
 * Flows: reads approval history for context → Manifest command for PayrollRun
 * status change → Manifest command for approval history audit record.
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const guard = await requireApiManager();
    if (!guard.ok) {
      return guard.response;
    }
    const { tenantId, user } = guard;
    const userId = user.id;

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

    // Read: check if the approval history entry exists and get payroll run context
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
    const currentStatus = approval.previous_status;

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

    // Governed write: update PayrollRun status via Manifest runtime
    const runCommand =
      status === "approved" ? "approve" : "reject";
    const runBody =
      status === "approved"
        ? { id: payrollRunId, approvedBy: approvedBy || userId }
        : { id: payrollRunId, rejectedBy: userId, rejectReason: rejectReason || "" };

    const runResult = await runManifestCommand({
      entity: "PayrollRun",
      command: runCommand,
      body: runBody,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
      },
      instanceId: payrollRunId,
    });

    if (runResult.status >= 400) {
      const errorBody = await runResult.json().catch(() => ({ message: "Command failed" }));
      return NextResponse.json(
        { message: `Failed to update payroll run: ${(errorBody as Record<string, unknown>).message ?? "unknown error"}` },
        { status: runResult.status }
      );
    }

    // Governed write: record approval history via Manifest runtime
    const historyBody = {
      payrollRunId,
      action: status,
      previousStatus: currentStatus ?? "",
      newStatus: status,
      performedBy: approvedBy || userId,
      reason: rejectReason || "",
    };

    const historyResult = await runManifestCommand({
      entity: "PayrollApprovalHistory",
      command: "create",
      body: historyBody,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
      },
    });

    // Best-effort history creation — don't fail the approval if history write fails
    if (historyResult.status >= 400) {
      log.error("Failed to create approval history record:", { historyBody, status: historyResult.status });
    }

    // Read back the updated run for the response
    const updatedRuns = await database.$queryRaw<
      {
        id: string;
        tenant_id: string;
        payroll_period_id: string;
        run_date: Date;
        status: string;
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
        SELECT
          id, tenant_id, payroll_period_id, run_date, status,
          total_gross, total_deductions, total_net,
          approved_by, approved_at, paid_at, reject_reason,
          created_at, updated_at
        FROM tenant_staff.payroll_runs
        WHERE tenant_id = ${tenantId}
          AND id = ${payrollRunId}::uuid
          AND deleted_at IS NULL
      `
    );

    if (!updatedRuns || updatedRuns.length === 0) {
      return NextResponse.json(
        { message: "Payroll run updated but could not read back" },
        { status: 500 }
      );
    }

    const updatedRun = updatedRuns[0];

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
    captureException(error);
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    log.error("Failed to update approval:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
