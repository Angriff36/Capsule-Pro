import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
 * Create a new employee certification
 *
 * Required fields:
 * - employeeId: Employee ID
 * - certificationType: Type of certification (e.g., "MAST", "FOOD_HANDLER")
 * - certificationName: Full name of certification
 * - issuedDate: Date certification was issued
 *
 * Optional fields:
 * - expiryDate: Date certification expires
 * - documentUrl: URL to certification document
 */
export async function POST(request: Request) {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = await request.json();

  if (
    !(
      body.employeeId &&
      body.certificationType &&
      body.certificationName &&
      body.issuedDate
    )
  ) {
    return NextResponse.json(
      {
        message:
          "Employee ID, certification type, certification name, and issued date are required",
      },
      { status: 400 }
    );
  }

  // Verify employee exists
  const employees = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId} AND id = ${body.employeeId}
    `
  );

  if (employees.length === 0) {
    return NextResponse.json(
      { message: "Employee not found" },
      { status: 404 }
    );
  }

  try {
    const result = await database.$queryRaw<
      Array<{
        id: string;
        certification_type: string;
        certification_name: string;
        expiry_date: Date | null;
      }>
    >(
      Prisma.sql`
        INSERT INTO tenant_staff.employee_certifications (
          tenant_id,
          employee_id,
          certification_type,
          certification_name,
          issued_date,
          expiry_date,
          document_url
        )
        VALUES (
          ${tenantId},
          ${body.employeeId},
          ${body.certificationType},
          ${body.certificationName},
          ${new Date(body.issuedDate)},
          ${body.expiryDate ? new Date(body.expiryDate) : null},
          ${body.documentUrl || null}
        )
        RETURNING id, certification_type, certification_name, expiry_date
      `
    );

    return NextResponse.json({ certification: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating certification:", error);
    return NextResponse.json(
      { message: "Failed to create certification" },
      { status: 500 }
    );
  }
}
