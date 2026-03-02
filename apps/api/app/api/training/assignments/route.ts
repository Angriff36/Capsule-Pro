import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import type {
  AssignmentStatus,
  TrainingAssignment,
  TrainingAssignmentsListResponse,
} from "../types";

/**
 * GET /api/training/assignments
 * List training assignments with optional filtering
 *
 * Query params:
 * - moduleId: Filter by module
 * - employeeId: Filter by employee
 * - status: Filter by status (assigned, in_progress, completed, overdue)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const moduleId = searchParams.get("moduleId");
  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
  const offset = (page - 1) * limit;

  const assignments = await database.$queryRaw<
    Array<{
      id: string;
      tenant_id: string;
      module_id: string;
      employee_id: string | null;
      assigned_to_all: boolean;
      assigned_by: string;
      due_date: Date | null;
      status: string;
      assigned_at: Date;
      created_at: Date;
      updated_at: Date;
      employee_first_name: string | null;
      employee_last_name: string | null;
      employee_email: string | null;
      module_title: string;
      module_content_type: string;
      // Completion fields
      completion_id: string | null;
      completion_started_at: Date | null;
      completion_completed_at: Date | null;
      completion_score: number | null;
      completion_passed: boolean;
    }>
  >(
    Prisma.sql`
      SELECT
        ta.id,
        ta.tenant_id,
        ta.module_id,
        ta.employee_id,
        ta.assigned_to_all,
        ta.assigned_by,
        ta.due_date,
        ta.status,
        ta.assigned_at,
        ta.created_at,
        ta.updated_at,
        e.first_name AS employee_first_name,
        e.last_name AS employee_last_name,
        e.email AS employee_email,
        tm.title AS module_title,
        tm.content_type AS module_content_type,
        tc.id AS completion_id,
        tc.started_at AS completion_started_at,
        tc.completed_at AS completion_completed_at,
        tc.score AS completion_score,
        tc.passed AS completion_passed
      FROM tenant_staff.training_assignments ta
      JOIN tenant_staff.training_modules tm
        ON tm.tenant_id = ta.tenant_id
        AND tm.id = ta.module_id
        AND tm.deleted_at IS NULL
      LEFT JOIN tenant_staff.employees e
        ON e.tenant_id = ta.tenant_id
        AND e.id = ta.employee_id
      LEFT JOIN tenant_staff.training_completions tc
        ON tc.tenant_id = ta.tenant_id
        AND tc.assignment_id = ta.id
      WHERE ta.tenant_id = ${tenantId}
        AND ta.deleted_at IS NULL
        ${moduleId ? Prisma.sql`AND ta.module_id = ${moduleId}` : Prisma.empty}
        ${employeeId ? Prisma.sql`AND ta.employee_id = ${employeeId}` : Prisma.empty}
        ${status ? Prisma.sql`AND ta.status = ${status}` : Prisma.empty}
      ORDER BY ta.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
  );

  const totalCountResult = await database.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(*)::bigint
      FROM tenant_staff.training_assignments ta
      WHERE ta.tenant_id = ${tenantId}
        AND ta.deleted_at IS NULL
        ${moduleId ? Prisma.sql`AND ta.module_id = ${moduleId}` : Prisma.empty}
        ${employeeId ? Prisma.sql`AND ta.employee_id = ${employeeId}` : Prisma.empty}
        ${status ? Prisma.sql`AND ta.status = ${status}` : Prisma.empty}
    `
  );

  const typedAssignments: TrainingAssignment[] = assignments.map((a) => ({
    id: a.id,
    tenant_id: a.tenant_id,
    module_id: a.module_id,
    employee_id: a.employee_id,
    assigned_to_all: a.assigned_to_all,
    assigned_by: a.assigned_by,
    due_date: a.due_date,
    status: a.status as AssignmentStatus,
    assigned_at: a.assigned_at,
    created_at: a.created_at,
    updated_at: a.updated_at,
    employee_first_name: a.employee_first_name,
    employee_last_name: a.employee_last_name,
    employee_email: a.employee_email ?? undefined,
    module: {
      id: a.module_id,
      tenant_id: a.tenant_id,
      title: a.module_title,
      content_type: a.module_content_type as
        | "document"
        | "video"
        | "quiz"
        | "interactive",
      description: null,
      content_url: null,
      duration_minutes: null,
      category: null,
      is_required: false,
      is_active: true,
      created_by: null,
      created_at: a.created_at,
      updated_at: a.updated_at,
    },
    completion: a.completion_id
      ? {
          id: a.completion_id,
          tenant_id: a.tenant_id,
          assignment_id: a.id,
          employee_id: a.employee_id ?? "",
          module_id: a.module_id,
          started_at: a.completion_started_at,
          completed_at: a.completion_completed_at,
          score: a.completion_score ? Number(a.completion_score) : null,
          passed: a.completion_passed,
          notes: null,
          created_at: a.created_at,
          updated_at: a.updated_at,
        }
      : undefined,
  }));

  const response: TrainingAssignmentsListResponse = {
    assignments: typedAssignments,
    pagination: {
      page,
      limit,
      total: Number(totalCountResult[0].count),
      totalPages: Math.ceil(Number(totalCountResult[0].count) / limit),
    },
  };

  return NextResponse.json(response);
}

/**
 * POST /api/training/assignments
 * Create a new training assignment via manifest command
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "TrainingAssignment",
    commandName: "create",
    transformBody: (body, ctx) => ({
      moduleId: body.moduleId || body.module_id || "",
      employeeId: body.employeeId || body.employee_id || "",
      assignedToAll: body.assignToAll ?? body.assignedToAll ?? false,
      assignedBy: ctx.userId,
      dueDate: body.dueDate || body.due_date || "",
    }),
  });
}
