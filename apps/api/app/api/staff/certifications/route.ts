import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

/**
 * GET /api/staff/certifications
 * List employee certifications with optional filtering
 *
 * Query params:
 * - employeeId: Filter by employee
 * - type: Filter by certification type
 * - expiringWithin: Filter certifications expiring within N days
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

  const employeeId = searchParams.get("employeeId");
  const type = searchParams.get("type");
  const expiringWithin = searchParams.get("expiringWithin");
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
  const offset = (page - 1) * limit;

  const certifications = await database.$queryRaw<
    Array<{
      id: string;
      tenant_id: string;
      employee_id: string;
      certification_type: string;
      certification_name: string;
      issued_date: Date;
      expiry_date: Date | null;
      document_url: string | null;
      created_at: Date;
      updated_at: Date;
      employee_first_name: string | null;
      employee_last_name: string | null;
      employee_email: string;
      days_until_expiry: number | null;
    }>
  >(
    Prisma.sql`
      SELECT
        ec.id,
        ec.tenant_id,
        ec.employee_id,
        ec.certification_type,
        ec.certification_name,
        ec.issued_date,
        ec.expiry_date,
        ec.document_url,
        ec.created_at,
        ec.updated_at,
        e.first_name AS employee_first_name,
        e.last_name AS employee_last_name,
        e.email AS employee_email,
        CASE
          WHEN ec.expiry_date IS NOT NULL THEN
            DATE_PART('day', ec.expiry_date - CURRENT_DATE)::integer
          ELSE NULL
        END AS days_until_expiry
      FROM tenant_staff.employee_certifications ec
      JOIN tenant_staff.employees e
        ON e.tenant_id = ec.tenant_id
        AND e.id = ec.employee_id
      WHERE ec.tenant_id = ${tenantId}
        AND ec.deleted_at IS NULL
        ${employeeId ? Prisma.sql`AND ec.employee_id = ${employeeId}` : Prisma.empty}
        ${type ? Prisma.sql`AND ec.certification_type = ${type}` : Prisma.empty}
        ${expiringWithin ? Prisma.sql`AND ec.expiry_date IS NOT NULL AND ec.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * ${Number(expiringWithin)}` : Prisma.empty}
      ORDER BY ec.expiry_date ASC NULLS LAST, ec.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
  );

  const totalCountResult = await database.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(*)::bigint
      FROM tenant_staff.employee_certifications ec
      WHERE ec.tenant_id = ${tenantId}
        AND ec.deleted_at IS NULL
        ${employeeId ? Prisma.sql`AND ec.employee_id = ${employeeId}` : Prisma.empty}
        ${type ? Prisma.sql`AND ec.certification_type = ${type}` : Prisma.empty}
        ${expiringWithin ? Prisma.sql`AND ec.expiry_date IS NOT NULL AND ec.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * ${Number(expiringWithin)}` : Prisma.empty}
    `
  );

  return NextResponse.json({
    certifications,
    pagination: {
      page,
      limit,
      total: Number(totalCountResult[0].count),
      totalPages: Math.ceil(Number(totalCountResult[0].count) / limit),
    },
  });
}

/**
 * POST /api/staff/certifications
 * Create a new employee certification via manifest command
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "EmployeeCertification",
    commandName: "create",
    transformBody: (body) => ({
      employeeId: body.employeeId || body.employee_id,
      certificationType: body.certificationType || body.certification_type,
      certificationName: body.certificationName || body.certification_name,
      issuedDate: body.issuedDate || body.issued_date,
      expiryDate: body.expiryDate || body.expiry_date || "",
      documentUrl: body.documentUrl || body.document_url || "",
    }),
  });
}
