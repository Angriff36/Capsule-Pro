import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { clampLimit } from "@/lib/pagination";
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
  // Clamp pagination so a hostile or buggy client cannot ask for the entire
  // assignment table via `?limit=999999` or trigger a negative OFFSET via a
  // negative `page`. clampLimit enforces DEFAULT_LIMIT=50 / MAX_LIMIT=200.
  const rawPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = clampLimit(searchParams.get("limit"));
  const offset = (page - 1) * limit;

  const where: Prisma.TrainingAssignmentWhereInput = {
    tenantId,
    deletedAt: null,
    module: { deletedAt: null },
    ...(moduleId ? { moduleId } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(status ? { status } : {}),
  };
  const [assignments, totalCount] = await Promise.all([
    database.trainingAssignment.findMany({
      where,
      include: {
        module: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    database.trainingAssignment.count({ where }),
  ]);
  const employeeIds = assignments
    .map((assignment) => assignment.employeeId)
    .filter((id): id is string => Boolean(id));
  const employees = await database.user.findMany({
    where: { tenantId, id: { in: employeeIds }, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const employeesById = new Map(
    employees.map((employee) => [employee.id, employee])
  );
  const completions = await database.trainingCompletion.findMany({
    where: {
      tenantId,
      assignmentId: { in: assignments.map((assignment) => assignment.id) },
    },
  });
  const completionsByAssignmentId = new Map(
    completions.map((completion) => [completion.assignmentId, completion])
  );

  const typedAssignments: TrainingAssignment[] = assignments.map((a) => {
    const employee = a.employeeId ? employeesById.get(a.employeeId) : undefined;
    const completion = completionsByAssignmentId.get(a.id);
    return {
      id: a.id,
      tenant_id: a.tenantId,
      module_id: a.moduleId,
      employee_id: a.employeeId,
      assigned_to_all: a.assignedToAll,
      assigned_by: a.assignedBy,
      due_date: a.dueDate,
      status: a.status as AssignmentStatus,
      assigned_at: a.assignedAt,
      created_at: a.createdAt,
      updated_at: a.updatedAt,
      employee_first_name: employee?.firstName ?? null,
      employee_last_name: employee?.lastName ?? null,
      employee_email: employee?.email,
      module: {
        id: a.moduleId,
        tenant_id: a.tenantId,
        title: a.module.title,
        content_type: a.module.contentType as
          | "document"
          | "video"
          | "quiz"
          | "interactive",
        description: a.module.description,
        content_url: a.module.contentUrl,
        duration_minutes: a.module.durationMinutes,
        category: a.module.category,
        is_required: a.module.isRequired,
        is_active: a.module.isActive,
        created_by: a.module.createdBy,
        created_at: a.module.createdAt,
        updated_at: a.module.updatedAt,
      },
      completion: completion
        ? {
            id: completion.id,
            tenant_id: completion.tenantId,
            assignment_id: a.id,
            employee_id: completion.employeeId,
            module_id: completion.moduleId,
            started_at: completion.startedAt,
            completed_at: completion.completedAt,
            score: completion.score ? Number(completion.score) : null,
            passed: completion.passed,
            notes: completion.notes,
            created_at: completion.createdAt,
            updated_at: completion.updatedAt,
          }
        : undefined,
    };
  });

  const response: TrainingAssignmentsListResponse = {
    assignments: typedAssignments,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };

  return NextResponse.json(response);
}

/**
 * POST /api/training/assignments
 * Create a new training assignment via manifest command
 */
export async function POST(request: NextRequest) {
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return runManifestCommand({
    entity: "TrainingAssignment",
    command: "create",
    body: {
      moduleId: rawBody.moduleId || rawBody.module_id || "",
      employeeId: rawBody.employeeId || rawBody.employee_id || "",
      assignedToAll: rawBody.assignToAll ?? rawBody.assignedToAll ?? false,
      assignedBy: user.id,
      dueDate: rawBody.dueDate || rawBody.due_date || "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
