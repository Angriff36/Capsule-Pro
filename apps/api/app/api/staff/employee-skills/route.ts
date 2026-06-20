import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";

export const runtime = "nodejs";

/**
 * GET /api/staff/employee-skills?employeeId=
 * POST /api/staff/employee-skills { employeeId, skillId, proficiencyLevel? }
 * DELETE via query employeeId & skillId
 */
export async function GET(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const employeeId = request.nextUrl.searchParams.get("employeeId");

  const rows = await database.employee_skills.findMany({
    where: {
      tenant_id: tenantId,
      ...(employeeId ? { employee_id: employeeId } : {}),
    },
  });

  const skillIds = [...new Set(rows.map((r) => r.skill_id))];
  const skills =
    skillIds.length > 0
      ? await database.skills.findMany({
          where: { tenant_id: tenantId, id: { in: skillIds }, deleted_at: null },
        })
      : [];
  const skillById = new Map(skills.map((s) => [s.id, s]));

  const employeeIds = [...new Set(rows.map((r) => r.employee_id))];
  const employees =
    employeeIds.length > 0
      ? await database.user.findMany({
          where: { tenantId, id: { in: employeeIds }, deletedAt: null },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  return NextResponse.json({
    success: true,
    employeeSkills: rows.map((row) => {
      const skill = skillById.get(row.skill_id);
      const employee = employeeById.get(row.employee_id);
      return {
        employeeId: row.employee_id,
        employeeName: employee
          ? `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim()
          : null,
        skillId: row.skill_id,
        skillName: skill?.name ?? "Unknown",
        skillCategory: skill?.category ?? null,
        proficiencyLevel: row.proficiency_level,
        verifiedAt: row.verified_at,
        verifiedBy: row.verified_by,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const user = await resolveCurrentUser(request);
  const body = (await request.json()) as {
    employeeId?: string;
    skillId?: string;
    proficiencyLevel?: number;
  };

  if (!(body.employeeId && body.skillId)) {
    return NextResponse.json(
      { message: "employeeId and skillId are required" },
      { status: 400 }
    );
  }

  const level = Math.min(5, Math.max(1, body.proficiencyLevel ?? 1));

  try {
    await database.employee_skills.upsert({
      where: {
        tenant_id_employee_id_skill_id: {
          tenant_id: tenantId,
          employee_id: body.employeeId,
          skill_id: body.skillId,
        },
      },
      create: {
        tenant_id: tenantId,
        employee_id: body.employeeId,
        skill_id: body.skillId,
        proficiency_level: level,
        verified_by: user.id,
        verified_at: new Date(),
      },
      update: {
        proficiency_level: level,
        verified_by: user.id,
        verified_at: new Date(),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Failed to assign employee skill", { error });
    return NextResponse.json(
      { message: "Failed to assign skill" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const employeeId = request.nextUrl.searchParams.get("employeeId");
  const skillId = request.nextUrl.searchParams.get("skillId");

  if (!(employeeId && skillId)) {
    return NextResponse.json(
      { message: "employeeId and skillId are required" },
      { status: 400 }
    );
  }

  await database.employee_skills.deleteMany({
    where: {
      tenant_id: tenantId,
      employee_id: employeeId,
      skill_id: skillId,
    },
  });

  return NextResponse.json({ success: true });
}
