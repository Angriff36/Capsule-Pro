Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const tenant_1 = require("@/app/lib/tenant");
const payroll_engine_1 = require("@repo/payroll-engine");
const server_2 = require("next/server");
/**
 * POST /api/payroll/generate
 * Generate payroll for a pay period
 *
 * Body:
 * {
 *   periodStart: string (ISO date),
 *   periodEnd: string (ISO date),
 *   jurisdiction?: string,
 *   regenerateOnDataChange?: boolean
 * }
 *
 * Response:
 * {
 *   batchId: string,
 *   status: "processing" | "completed" | "failed",
 *   periodId: string,
 *   estimatedTotals: {
 *     totalGross: number,
 *     totalNet: number,
 *     totalTaxes: number,
 *     totalDeductions: number,
 *     employeeCount: number
 *   }
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
    const parseResult =
      payroll_engine_1.GeneratePayrollRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return server_2.NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }
    const requestData = parseResult.data;
    // Validate date range
    const startDate = new Date(requestData.periodStart);
    const endDate = new Date(requestData.periodEnd);
    if (startDate >= endDate) {
      return server_2.NextResponse.json(
        { error: "periodStart must be before periodEnd" },
        { status: 400 }
      );
    }
    // Check for reasonable date range (max 31 days for a single payroll period)
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > 31) {
      return server_2.NextResponse.json(
        { error: "Payroll period cannot exceed 31 days" },
        { status: 400 }
      );
    }
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
    // Generate payroll
    const result = await payrollService.generatePayroll(
      tenantId,
      requestData,
      userId
    );
    return server_2.NextResponse.json(result, {
      status: result.status === "failed" ? 500 : 200,
    });
  } catch (error) {
    console.error("Payroll generation error:", error);
    return server_2.NextResponse.json(
      { error: "Failed to generate payroll" },
      { status: 500 }
    );
  }
}
