import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
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

  // Verify assignment exists and belongs to user (or user is admin)
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

  // For non-assigned-to-all, verify user is the assigned employee
  if (!assignment.assigned_to_all && assignment.employee_id) {
    // Get employee record for current user
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
    if (body.action === "start") {
      // Check for existing completion record
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

      // Get employee ID for current user
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

      // Create or update completion record with start time
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

      // Update assignment status to in_progress
      await database.$executeRaw(
        Prisma.sql`
          UPDATE tenant_staff.training_assignments
          SET status = 'in_progress', updated_at = NOW()
          WHERE tenant_id = ${tenantId}
            AND id = ${body.assignmentId}
        `
      );

      return NextResponse.json({ completion: result[0] });
    }
    if (body.action === "complete") {
      // Get employee ID for current user
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

      // Update completion record
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
            ${body.score ?? null},
            ${body.passed ?? true},
            ${body.notes || null}
          )
          ON CONFLICT (tenant_id, employee_id, module_id)
          DO UPDATE SET
            completed_at = NOW(),
            score = ${body.score ?? null},
            passed = ${body.passed ?? true},
            notes = ${body.notes || null},
            updated_at = NOW()
          RETURNING id, completed_at, score, passed
        `
      );

      // Update assignment status to completed
      await database.$executeRaw(
        Prisma.sql`
          UPDATE tenant_staff.training_assignments
          SET status = 'completed', updated_at = NOW()
          WHERE tenant_id = ${tenantId}
            AND id = ${body.assignmentId}
        `
      );

      return NextResponse.json({ completion: result[0] });
    }
    return NextResponse.json(
      { message: "Invalid action. Use 'start' or 'complete'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing training completion:", error);
    return NextResponse.json(
      { message: "Failed to process training completion" },
      { status: 500 }
    );
  }
}
