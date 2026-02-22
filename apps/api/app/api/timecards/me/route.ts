import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/timecards/me
 * Returns the current user's employee record and active time entry (if clocked in)
 */
export async function GET() {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(orgId && clerkId)) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    // Get the current user's employee record
    const employee = await database.$queryRaw<
      Array<{
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        role: string;
        is_active: boolean;
        phone: string | null;
        hourly_rate: number | null;
      }>
    >(
      Prisma.sql`
        SELECT
          e.id,
          e.email,
          e.first_name,
          e.last_name,
          e.role,
          e.is_active,
          e.phone,
          e.hourly_rate
        FROM tenant_staff.employees e
        JOIN tenant.users u ON u.id = e.user_id
        WHERE e.tenant_id = ${tenantId}
          AND u.auth_user_id = ${clerkId}
          AND e.deleted_at IS NULL
        LIMIT 1
      `
    );

    if (!employee || employee.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const currentEmployee = employee[0];

    // Get the active (open) time entry for this employee
    const activeTimeEntry = await database.$queryRaw<
      Array<{
        id: string;
        clock_in: Date;
        clock_out: Date | null;
        break_minutes: number;
        location_id: string | null;
        location_name: string | null;
        shift_id: string | null;
        notes: string | null;
      }>
    >(
      Prisma.sql`
        SELECT
          te.id,
          te.clock_in,
          te.clock_out,
          te.break_minutes,
          te.location_id,
          te.shift_id,
          te.notes,
          l.name AS location_name
        FROM tenant_staff.time_entries te
        LEFT JOIN tenant.locations l ON l.id = te.location_id
        WHERE te.tenant_id = ${tenantId}
          AND te.employee_id = ${currentEmployee.id}
          AND te.clock_out IS NULL
          AND te.deleted_at IS NULL
        ORDER BY te.clock_in DESC
        LIMIT 1
      `
    );

    return NextResponse.json({
      employee: currentEmployee,
      activeTimeEntry: activeTimeEntry.length > 0 ? activeTimeEntry[0] : null,
    });
  } catch (error) {
    console.error("Failed to fetch current employee status:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee status" },
      { status: 500 }
    );
  }
}
