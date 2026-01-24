Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const tenant_1 = require("@/app/lib/tenant");
const payroll_engine_1 = require("@repo/payroll-engine");
const server_2 = require("next/server");
/**
 * GET /api/payroll/reports/{periodId}?format={csv|qbxml|qbOnlineCsv|json}
 * Get payroll report in specified format
 *
 * Query Parameters:
 * - format: "csv" | "qbxml" | "qbOnlineCsv" | "json" (default: "json")
 * - aggregate: "true" | "false" - For QB exports, create single aggregate entry
 *
 * Response:
 * - For "json": JSON response with payroll data
 * - For other formats: Downloadable file
 */
async function GET(request, context) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { periodId } = await context.params;
    const { searchParams } = new URL(request.url);
    const formatParam = searchParams.get("format") || "json";
    const aggregate = searchParams.get("aggregate") === "true";
    // Validate format
    const formatResult = payroll_engine_1.ExportFormat.safeParse(formatParam);
    if (!formatResult.success) {
      return server_2.NextResponse.json(
        {
          error:
            "Invalid format. Must be one of: csv, qbxml, qbOnlineCsv, json",
        },
        { status: 400 }
      );
    }
    const format = formatResult.data;
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
    // Get report
    const result = await payrollService.getReport(tenantId, periodId, {
      format,
      aggregate,
    });
    // Return appropriate response based on format
    if (format === "json") {
      return server_2.NextResponse.json(JSON.parse(result.content));
    }
    // For other formats, return as downloadable file
    return new server_2.NextResponse(result.content, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return server_2.NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    return server_2.NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
