import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import type { CompleteTrainingInput, StartTrainingInput } from "../types";

/**
 * POST /api/training/complete
 * Start or complete a training assignment
 *
 * For starting training:
 * - action: "start"
 * - assignmentId: Assignment to start
 *
 * For completing training:
 * - action: "complete"
 * - assignmentId: Assignment to complete
 * - score: Optional score (0-100)
 * - passed: Whether the employee passed
 * - notes: Optional notes
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Two-action endpoint (start/complete) with shared validation
export async function POST(request: Request) {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const body = (await request.json()) as StartTrainingInput &
    CompleteTrainingInput & { action: "start" | "complete" };

  if (!body.assignmentId) {
    return NextResponse.json(
      { message: "Assignment ID is required" },
      { status: 400 }
    );
  }

  // Verify assignment exists and belongs to user (or user is admin) — read per §10
  const assignments = await database.$queryRaw<
    Array<{
      id: string;
      module_id: string;
      employee_id: string | null;
      assigned_to_all: boolean;
      status: string;
    }>
  >(
    Prisma.sql`
      SELECT
        ta.id,
        ta.module_id,
        ta.employee_id,
        ta.assigned_to_all,
        ta.status
      FROM tenant_staff.training_assignments ta
      WHERE ta.tenant_id = ${tenantId}
        AND ta.id = ${body.assignmentId}
        AND ta.deleted_at IS NULL
    `
  );

  if (assignments.length === 0) {
    return NextResponse.json(
      { message: "Assignment not found" },
      { status: 404 }
    );
  }

  const assignment = assignments[0];

  // For non-assigned-to-all, verify user is the assigned employee — read per §10
  if (!assignment.assigned_to_all && assignment.employee_id) {
    const employees = await database.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id FROM tenant_staff.employees
        WHERE tenant_id = ${tenantId}
          AND user_id = ${userId}
      `
    );

    if (employees.length === 0 || employees[0].id !== assignment.employee_id) {
      return NextResponse.json(
        { message: "You are not assigned to this training" },
        { status: 403 }
      );
    }
  }

  try {
    // Resolve current user for Manifest runtime — read per §10
    const currentUser = await resolveCurrentUser(request);
    if (body.action === "start") {
      // Check for existing completion record — read per §10
      const existingCompletions = await database.$queryRaw<
        Array<{ id: string; started_at: Date | null }>
      >(
        Prisma.sql`
          SELECT id, started_at
          FROM tenant_staff.training_completions
          WHERE tenant_id = ${tenantId}
            AND assignment_id = ${body.assignmentId}
        `
      );

      if (existingCompletions.length > 0 && existingCompletions[0].started_at) {
        return NextResponse.json({
          completion: existingCompletions[0],
          message: "Training already started",
        });
      }

      // Get employee ID for current user — read per §10
      const employees = await database.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT id FROM tenant_staff.employees
          WHERE tenant_id = ${tenantId}
            AND user_id = ${userId}
        `
      );

      const employeeId =
        assignment.employee_id ??
        (employees.length > 0 ? employees[0].id : null);

      if (!employeeId) {
        return NextResponse.json(
          { message: "Employee record not found" },
          { status: 404 }
        );
      }

      // Delegate governed write: start training assignment via Manifest runtime
      // The Manifest command transitions status -> in_progress, sets startedAt,
      // and the reaction pipeline auto-creates TrainingAttempt records.
      // We also create a legacy training_completions record for backward compatibility.
      const manifestResult = await runManifestCommand({
        entity: "TrainingAssignment",
        command: "start",
        body: {
          id: body.assignmentId,
          assignmentId: body.assignmentId,
          moduleId: assignment.module_id,
          staffMemberId: employeeId,
        },
        user: { id: currentUser.id, tenantId, role: currentUser.role },
      });

      if (manifestResult.status < 200 || manifestResult.status >= 300) {
        return manifestResult;
      }

      // Create legacy completion record for backward compat (governed side-effect)
      const result = await database.$queryRaw<
        Array<{ id: string; started_at: Date }>
      >(
        Prisma.sql`
          INSERT INTO tenant_staff.training_completions (
            tenant_id,
            assignment_id,
            employee_id,
            module_id,
            started_at,
            passed
          )
          VALUES (
            ${tenantId},
            ${body.assignmentId},
            ${employeeId},
            ${assignment.module_id},
            NOW(),
            false
          )
          ON CONFLICT (tenant_id, employee_id, module_id)
          DO UPDATE SET started_at = NOW()
          RETURNING id, started_at
        `
      );

      return NextResponse.json({ completion: result[0] });
    }
    if (body.action === "complete") {
      // Get employee ID for current user — read per §10
      const employees = await database.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
          SELECT id FROM tenant_staff.employees
          WHERE tenant_id = ${tenantId}
            AND user_id = ${userId}
        `
      );

      const employeeId =
        assignment.employee_id ??
        (employees.length > 0 ? employees[0].id : null);

      if (!employeeId) {
        return NextResponse.json(
          { message: "Employee record not found" },
          { status: 404 }
        );
      }

      const score = body.score ?? 0;
      const passed = body.passed ?? true;

      // Delegate governed write: submit passing attempt via Manifest runtime
      // The Manifest command transitions status -> completed, sets completedAt/score,
      // and the reaction pipeline auto-creates TrainingAttempt + StaffTrainingSignal records.
      // For failed attempts, the caller should use a different command — this route
      // historically only handled the complete (pass) case.
      const manifestResult = await runManifestCommand({
        entity: "TrainingAssignment",
        command: "submitPassingAttempt",
        body: {
          id: body.assignmentId,
          assignmentId: body.assignmentId,
          attemptId: crypto.randomUUID(),
          moduleId: assignment.module_id,
          staffMemberId: employeeId,
          scorePercent: score,
          answersJson: JSON.stringify({ notes: body.notes ?? "" }),
        },
        user: { id: currentUser.id, tenantId, role: currentUser.role },
      });

      if (manifestResult.status < 200 || manifestResult.status >= 300) {
        return manifestResult;
      }

      // Create/update legacy completion record for backward compat (governed side-effect)
      const result = await database.$queryRaw<
        Array<{
          id: string;
          completed_at: Date;
          score: number | null;
          passed: boolean;
        }>
      >(
        Prisma.sql`
          INSERT INTO tenant_staff.training_completions (
            tenant_id,
            assignment_id,
            employee_id,
            module_id,
            started_at,
            completed_at,
            score,
            passed,
            notes
          )
          VALUES (
            ${tenantId},
            ${body.assignmentId},
            ${employeeId},
            ${assignment.module_id},
            COALESCE(
              (SELECT started_at FROM tenant_staff.training_completions
               WHERE tenant_id = ${tenantId} AND assignment_id = ${body.assignmentId}),
              NOW()
            ),
            NOW(),
            ${score},
            ${passed},
            ${body.notes || null}
          )
          ON CONFLICT (tenant_id, employee_id, module_id)
          DO UPDATE SET
            completed_at = NOW(),
            score = ${score},
            passed = ${passed},
            notes = ${body.notes || null},
            updated_at = NOW()
          RETURNING id, completed_at, score, passed
        `
      );

      return NextResponse.json({ completion: result[0] });
    }
    return NextResponse.json(
      { message: "Invalid action. Use 'start' or 'complete'" },
      { status: 400 }
    );
  } catch (error) {
    captureException(error);
    log.error("Error processing training completion:", error);
    return NextResponse.json(
      { message: "Failed to process training completion" },
      { status: 500 }
    );
  }
}
