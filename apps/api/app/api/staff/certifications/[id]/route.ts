import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/staff/certifications/[id]
 * Get a single certification by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

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
        e.email AS employee_email
      FROM tenant_staff.employee_certifications ec
      JOIN tenant_staff.employees e
        ON e.tenant_id = ec.tenant_id
        AND e.id = ec.employee_id
      WHERE ec.tenant_id = ${tenantId}
        AND ec.id = ${id}
        AND ec.deleted_at IS NULL
    `
  );

  if (certifications.length === 0) {
    return NextResponse.json(
      { message: "Certification not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ certification: certifications[0] });
}

/**
 * PUT /api/staff/certifications/[id]
 * Update a certification
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;
  const body = await request.json();

  try {
    const result = await database.$queryRaw<
      Array<{
        id: string;
        certification_name: string;
        expiry_date: Date | null;
      }>
    >(
      Prisma.sql`
        UPDATE tenant_staff.employee_certifications
        SET
          certification_type = COALESCE(${body.certificationType}, certification_type),
          certification_name = COALESCE(${body.certificationName}, certification_name),
          issued_date = COALESCE(${body.issuedDate ? new Date(body.issuedDate) : null}, issued_date),
          expiry_date = COALESCE(${body.expiryDate ? new Date(body.expiryDate) : null}, expiry_date),
          document_url = COALESCE(${body.documentUrl}, document_url),
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND id = ${id}
          AND deleted_at IS NULL
        RETURNING id, certification_name, expiry_date
      `
    );

    if (result.length === 0) {
      return NextResponse.json(
        { message: "Certification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ certification: result[0] });
  } catch (error) {
    console.error("Error updating certification:", error);
    return NextResponse.json(
      { message: "Failed to update certification" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/staff/certifications/[id]
 * Soft delete a certification
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  try {
    const result = await database.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        UPDATE tenant_staff.employee_certifications
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND id = ${id}
          AND deleted_at IS NULL
        RETURNING id
      `
    );

    if (result.length === 0) {
      return NextResponse.json(
        { message: "Certification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting certification:", error);
    return NextResponse.json(
      { message: "Failed to delete certification" },
      { status: 500 }
    );
  }
}
