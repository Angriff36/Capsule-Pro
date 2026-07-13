import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { clampLimit } from "@/lib/pagination";

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
  const limit = clampLimit(searchParams.get("limit"));
  const offset = (page - 1) * limit;

  const expiryCutoff = expiringWithin
    ? new Date(Date.now() + Number(expiringWithin) * 24 * 60 * 60 * 1000)
    : null;
  const where: Prisma.EmployeeCertificationWhereInput = {
    tenantId,
    deletedAt: null,
    ...(employeeId ? { employeeId } : {}),
    ...(type ? { certificationType: type } : {}),
    ...(expiryCutoff ? { expiryDate: { not: null, lte: expiryCutoff } } : {}),
  };
  const [certificationRecords, totalCount] = await Promise.all([
    database.employeeCertification.findMany({
      where,
      orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    database.employeeCertification.count({ where }),
  ]);
  const employees = await database.user.findMany({
    where: {
      tenantId,
      id: { in: certificationRecords.map((cert) => cert.employeeId) },
      deletedAt: null,
    },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const employeesById = new Map(
    employees.map((employee) => [employee.id, employee])
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const certifications = certificationRecords.map((cert) => {
    const employee = employeesById.get(cert.employeeId);
    return {
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
      days_until_expiry: cert.expiryDate
        ? Math.ceil((cert.expiryDate.getTime() - today.getTime()) / 86_400_000)
        : null,
    };
  });

  return NextResponse.json({
    certifications,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
}

/**
 * POST /api/staff/certifications
 * Create a new employee certification via manifest command
 */
export async function POST(request: NextRequest) {
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runManifestCommand({
    entity: "EmployeeCertification",
    command: "create",
    body: {
      employeeId: rawBody.employeeId || rawBody.employee_id,
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
