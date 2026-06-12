import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

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

  const cert = await database.employeeCertification.findFirst({
    where: { tenantId, id, deletedAt: null },
  });

  if (!cert) {
    return NextResponse.json(
      { message: "Certification not found" },
      { status: 404 }
    );
  }

  const employee = await database.user.findFirst({
    where: { tenantId, id: cert.employeeId, deletedAt: null },
    select: { firstName: true, lastName: true, email: true },
  });

  return NextResponse.json({
    certification: {
      id: cert.id,
      tenant_id: cert.tenantId,
      employee_id: cert.employeeId,
      certification_type: cert.certificationType,
      certification_name: cert.certificationName,
      issued_date: cert.issuedDate,
      expiry_date: cert.expiryDate,
      document_url: cert.documentUrl,
      created_at: cert.createdAt,
      updated_at: cert.updatedAt,
      employee_first_name: employee?.firstName ?? null,
      employee_last_name: employee?.lastName ?? null,
      employee_email: employee?.email ?? "",
    },
  });
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
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runManifestCommand({
    entity: "EmployeeCertification",
    command: "update",
    body: {
      id,
      certificationType:
        rawBody.certificationType || rawBody.certification_type,
      certificationName:
        rawBody.certificationName || rawBody.certification_name,
      issuedDate: rawBody.issuedDate || rawBody.issued_date,
      expiryDate: rawBody.expiryDate || rawBody.expiry_date || "",
      documentUrl: rawBody.documentUrl || rawBody.document_url || "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
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
  const user = await resolveCurrentUser(request);
  return runManifestCommand({
    entity: "EmployeeCertification",
    command: "softDelete",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
