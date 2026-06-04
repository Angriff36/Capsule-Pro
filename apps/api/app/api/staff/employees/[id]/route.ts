import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
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

  const employees = await database.$queryRaw<
    Array<{
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      role: string;
      is_active: boolean;
      phone: string | null;
      avatar_url: string | null;
      employment_type: string;
      hourly_rate: number | null;
      hire_date: Date;
      created_at: Date;
      updated_at: Date;
    }>
  >(
    Prisma.sql`
      SELECT
        id,
        email,
        first_name,
        last_name,
        role,
        is_active,
        phone,
        avatar_url,
        employment_type,
        hourly_rate,
        hire_date,
        created_at,
        updated_at
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND id = ${id}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (employees.length === 0) {
    return NextResponse.json(
      { message: "Employee not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ employee: employees[0] });
}

/**
 * PUT /api/staff/employees/[id]
 * Update an employee via manifest runtime.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;

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
