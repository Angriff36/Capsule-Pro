import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
 * Update an employee
 */
export async function PUT(request: Request, context: RouteContext) {
  const { orgId, userId: clerkId } = await auth();
  if (!(orgId && clerkId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    return NextResponse.json({ message: "Tenant not found" }, { status: 400 });
  }

  const { id } = await context.params;
  const body = await request.json();

  // Fields that can be updated
  const allowedFields = [
    "firstName",
    "lastName",
    "role",
    "isActive",
    "phone",
    "employmentType",
    "hourlyRate",
  ] as const;

  // Build dynamic update
  const updates: string[] = [];
  const values: (string | number | boolean | Date | null)[] = [];

  // Map body fields to database columns
  const fieldMap: Record<
    string,
    { col: string; type: "string" | "number" | "boolean" | "date" }
  > = {
    firstName: { col: "first_name", type: "string" },
    lastName: { col: "last_name", type: "string" },
    role: { col: "role", type: "string" },
    isActive: { col: "is_active", type: "boolean" },
    phone: { col: "phone", type: "string" },
    employmentType: { col: "employment_type", type: "string" },
    hourlyRate: { col: "hourly_rate", type: "number" },
  };

  function coerceValue(
    value: unknown,
    type: "string" | "number" | "boolean" | "date"
  ): string | number | boolean | Date | null {
    if (value === null) {
      return null;
    }
    if (type === "boolean") {
      return Boolean(value);
    }
    if (type === "number") {
      return Number(value);
    }
    return String(value);
  }

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      const mapping = fieldMap[field];
      updates.push(`${mapping.col} = $${updates.length + 1}`);
      values.push(coerceValue(body[field], mapping.type));
    }
  }

  if (updates.length === 0) {
    return NextResponse.json(
      { message: "No fields to update" },
      { status: 400 }
    );
  }

  updates.push(`updated_at = $${updates.length + 1}`);
  values.push(new Date());
  values.push(tenantId, id);

  try {
    const result = await database.$executeRaw`
      UPDATE tenant_staff.employees
      SET ${Prisma.raw(updates.join(", "))}
      WHERE tenant_id = ${tenantId} AND id = ${id} AND deleted_at IS NULL
    `;

    if (result === 0) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    // Fetch and return updated employee
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

    return NextResponse.json({ employee: employees[0] });
  } catch (error) {
    console.error("[staff/employees/[id]] Update error:", error);
    return NextResponse.json(
      { message: "Failed to update employee" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/staff/employees/[id]
 * Alias for PUT - partial update
 */
export function PATCH(request: Request, context: RouteContext) {
  return PUT(request, context);
}
