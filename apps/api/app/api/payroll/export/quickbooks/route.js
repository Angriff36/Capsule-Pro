Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const tenant_1 = require("@/app/lib/tenant");
const payroll_engine_1 = require("@repo/payroll-engine");
const server_2 = require("next/server");
const zod_1 = require("zod");
const ExportQuickBooksRequestSchema = zod_1.z.object({
  periodId: zod_1.z.string().min(1),
  target: zod_1.z.enum(["qbxml", "qbOnlineCsv"]),
});
/**
 * POST /api/payroll/export/quickbooks
 * Export payroll to QuickBooks format
 *
 * Body:
 * {
 *   periodId: string,
 *   target: "qbxml" | "qbOnlineCsv"
 * }
 *
 * Response:
 * {
 *   exportId: string,
 *   fileUrl: string,
 *   format: string
 * }
 */
async function POST(request) {
  try {
    const { orgId, userId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const body = await request.json();
    // Validate request body
    const parseResult = ExportQuickBooksRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return server_2.NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }
    const { periodId, target } = parseResult.data;
    // Create payroll service with Prisma data source
    const dataSource = new payroll_engine_1.PrismaPayrollDataSource(
      database_1.database,
      () => tenantId
    );
    const payrollService = new payroll_engine_1.PayrollService({
      dataSource,
      defaultJurisdiction: "US",
      enableAuditLog: true,
    });
    // Export to QuickBooks
    const result = await payrollService.exportToQuickBooks(
      tenantId,
      periodId,
      target,
      userId
    );
    // Determine file extension and MIME type
    const fileExtension = target === "qbxml" ? "qbxml" : "csv";
    const mimeType = target === "qbxml" ? "application/xml" : "text/csv";
    // In a production system, you might:
    // 1. Store the file in object storage (S3, GCS, etc.)
    // 2. Return a signed URL for download
    // For now, we'll return the content as a base64-encoded data URL
    const base64Content = Buffer.from(result.content).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Content}`;
    return server_2.NextResponse.json({
      exportId: result.exportId,
      fileUrl: dataUrl,
      format: result.format,
      filename: `payroll-${periodId}.${fileExtension}`,
    });
  } catch (error) {
    console.error("QuickBooks export error:", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return server_2.NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    return server_2.NextResponse.json(
      { error: "Failed to export to QuickBooks" },
      { status: 500 }
    );
  }
}
