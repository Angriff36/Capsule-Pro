import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  ExportFormat,
  PayrollService,
  PrismaPayrollDataSource,
} from "@repo/payroll-engine";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ periodId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { periodId } = await context.params;
    const { searchParams } = new URL(request.url);
    const formatParam = searchParams.get("format") || "json";
    const aggregate = searchParams.get("aggregate") === "true";

    // Validate format
    const formatResult = ExportFormat.safeParse(formatParam);
    if (!formatResult.success) {
      return NextResponse.json(
        {
          error:
            "Invalid format. Must be one of: csv, qbxml, qbOnlineCsv, json",
        },
        { status: 400 }
      );
    }

    const format = formatResult.data;

    // Create payroll service with Prisma data source
    const dataSource = new PrismaPayrollDataSource(database);
    const payrollService = new PayrollService({
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
      return NextResponse.json(JSON.parse(result.content));
    }

    // For other formats, return as downloadable file
    return new NextResponse(result.content, {
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
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
