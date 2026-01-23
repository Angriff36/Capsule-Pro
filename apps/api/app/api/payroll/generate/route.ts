import {
  GeneratePayrollRequestSchema,
  InMemoryPayrollDataSource,
  PayrollService,
} from "@repo/payroll-engine";
import { type NextRequest, NextResponse } from "next/server";

// Note: In production, this would use the actual database
// For now, we use an in-memory data source that can be swapped
const dataSource = new InMemoryPayrollDataSource();
const payrollService = new PayrollService({
  dataSource,
  defaultJurisdiction: "US",
  enableAuditLog: true,
});

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
export async function POST(request: NextRequest) {
  try {
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

    // Validate date range
    const startDate = new Date(requestData.periodStart);
    const endDate = new Date(requestData.periodEnd);

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

    // TODO: Extract tenant ID from auth context
    const tenantId = request.headers.get("x-tenant-id") || "demo-tenant";
    // TODO: Extract user ID from auth context
    const userId = request.headers.get("x-user-id") || undefined;

    // Generate payroll
    const result = await payrollService.generatePayroll(
      tenantId,
      requestData,
      userId
    );

    return NextResponse.json(result, {
      status: result.status === "failed" ? 500 : 200,
    });
  } catch (error) {
    console.error("Payroll generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate payroll" },
      { status: 500 }
    );
  }
}
