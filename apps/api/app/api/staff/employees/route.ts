import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get("isActive");
    const role = searchParams.get("role");

    const employeeRecords = await database.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(isActive === "true" ? { isActive: true } : {}),
        ...(role ? { role } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    const employees = employeeRecords.map((employee) => ({
      id: employee.id,
      email: employee.email,
      first_name: employee.firstName,
      last_name: employee.lastName,
      role: employee.role,
      is_active: employee.isActive,
      phone: employee.phone,
      avatar_url: employee.avatarUrl,
      employment_type: employee.employmentType,
      hourly_rate: employee.hourlyRate,
      hire_date: employee.hireDate,
      created_at: employee.createdAt,
      updated_at: employee.updatedAt,
    }));

    return NextResponse.json({ employees });
  } catch (error) {
    captureException(error);
    log.error("Failed to fetch employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}
