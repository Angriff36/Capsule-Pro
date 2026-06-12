import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/staff/employees/[id]
 * Get a single employee by ID
 */
export async function GET(_request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;

  const employeeRecord = await database.user.findFirst({
    where: { tenantId, id, deletedAt: null },
  });

  if (!employeeRecord) {
    return NextResponse.json(
      { message: "Employee not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    employee: {
      id: employeeRecord.id,
      email: employeeRecord.email,
      first_name: employeeRecord.firstName,
      last_name: employeeRecord.lastName,
      role: employeeRecord.role,
      is_active: employeeRecord.isActive,
      phone: employeeRecord.phone,
      avatar_url: employeeRecord.avatarUrl,
      employment_type: employeeRecord.employmentType,
      hourly_rate: employeeRecord.hourlyRate,
      hire_date: employeeRecord.hireDate,
      created_at: employeeRecord.createdAt,
      updated_at: employeeRecord.updatedAt,
    },
  });
}

/**
 * PUT /api/staff/employees/[id]
 * Update an employee via manifest runtime.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return runManifestCommand({
    entity: "User",
    command: "update",
    body: { ...rawBody, id, tenantId: user.tenantId },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}

/**
 * PATCH /api/staff/employees/[id]
 * Alias for PUT - partial update via manifest runtime.
 */
export function PATCH(request: NextRequest, context: RouteContext) {
  return PUT(request, context);
}
