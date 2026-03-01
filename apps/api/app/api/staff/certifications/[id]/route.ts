import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/staff/certifications/[id]
 * Get a single certification by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
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
 * Update a certification via manifest command
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "EmployeeCertification",
    commandName: "update",
    params: { id },
    transformBody: (body) => ({
      id,
      certificationType: body.certificationType || body.certification_type,
      certificationName: body.certificationName || body.certification_name,
      issuedDate: body.issuedDate || body.issued_date,
      expiryDate: body.expiryDate || body.expiry_date || "",
      documentUrl: body.documentUrl || body.document_url || "",
    }),
  });
}

/**
 * DELETE /api/staff/certifications/[id]
 * Soft delete a certification via manifest command
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "EmployeeCertification",
    commandName: "softDelete",
    params: { id },
    transformBody: () => ({ id }),
  });
}
