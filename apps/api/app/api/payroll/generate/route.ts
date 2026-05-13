import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import {
  GeneratePayrollRequestSchema,
  PayrollService,
  PrismaPayrollDataSource,
} from "@repo/payroll-engine";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * POST /api/payroll/generate
 * Generate payroll for a pay period
 *
 * Body:
 * {
 *   periodStart?: string (ISO date) - defaults to first day of current month,
 *   periodEnd?: string (ISO date) - defaults to today,
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
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const body = await request.json();

    // Validate request body
    const parseResult = GeneratePayrollRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const requestData = parseResult.data;

    // Default period: current month (start to today) if not provided
    const now = new Date();
    const startDate = requestData.periodStart
      ? new Date(requestData.periodStart)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = requestData.periodEnd
      ? new Date(requestData.periodEnd)
      : now;

    // Merge computed dates back into requestData for the service
    const serviceRequest = {
      ...requestData,
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
    };

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "periodStart must be before periodEnd" },
        { status: 400 }
      );
    }

    // Check for reasonable date range (max 31 days for a single payroll period)
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > 31) {
      return NextResponse.json(
        { error: "Payroll period cannot exceed 31 days" },
        { status: 400 }
      );
    }

    // Create payroll service with Prisma data source
    const dataSource = new PrismaPayrollDataSource(database);
    const payrollService = new PayrollService({
      dataSource,
      defaultJurisdiction: "US",
      enableAuditLog: true,
    });

    // Generate payroll
    const result = await payrollService.generatePayroll(
      tenantId,
      serviceRequest,
      userId
    );

    return NextResponse.json(result, {
      status: result.status === "failed" ? 500 : 200,
    });
  } catch (error) {
    captureException(error);
    log.error("Payroll generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate payroll" },
      { status: 500 }
    );
  }
}
