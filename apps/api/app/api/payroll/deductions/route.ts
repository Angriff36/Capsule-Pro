/**
 * Employee Deductions API Endpoints
 *
 * GET    /api/payroll/deductions       - List deductions with pagination and filters
 * POST   /api/payroll/deductions       - Create a new deduction
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

type DeductionType =
  | "benefits"
  | "health_insurance"
  | "dental_insurance"
  | "vision_insurance"
  | "retirement_401k"
  | "retirement_ira"
  | "garnishment"
  | "child_support"
  | "union_dues"
  | "loan_repayment"
  | "other";

interface PaginationParams {
  page: number;
  limit: number;
}

function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );
  return { page, limit };
}

/**
 * GET /api/payroll/deductions - List deductions
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Parse filters
    const employeeId = searchParams.get("employeeId") || null;
    const type = searchParams.get("type") as DeductionType | null;

    // Get total count for pagination
    const total = await database.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM tenant_staff.employee_deductions
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          ${employeeId ? Prisma.sql`AND employee_id = ${employeeId}::uuid` : Prisma.empty}
          ${type ? Prisma.sql`AND type = ${type}` : Prisma.empty}
      `
    );

    const totalCount = Number(total[0]?.count ?? 0);

    // Get deductions with pagination
    const deductions = await database.$queryRaw<
      {
        id: string;
        tenant_id: string;
        employee_id: string;
        type: DeductionType;
        name: string;
        amount: number | null;
        percentage: number | null;
        is_pre_tax: boolean;
        effective_date: Date;
        end_date: Date | null;
        max_annual_amount: number | null;
        created_at: Date;
        updated_at: Date;
      }[]
    >(
      Prisma.sql`
        SELECT
          id,
          tenant_id,
          employee_id,
          type,
          name,
          amount,
          percentage,
          is_pre_tax,
          effective_date,
          end_date,
          max_annual_amount,
          created_at,
          updated_at
        FROM tenant_staff.employee_deductions
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          ${employeeId ? Prisma.sql`AND employee_id = ${employeeId}::uuid` : Prisma.empty}
          ${type ? Prisma.sql`AND type = ${type}` : Prisma.empty}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    );

    const mappedDeductions = deductions.map((deduction) => ({
      id: deduction.id,
      tenantId: deduction.tenant_id,
      employeeId: deduction.employee_id,
      type: deduction.type,
      name: deduction.name,
      amount: deduction.amount ? Number(deduction.amount) : null,
      percentage: deduction.percentage ? Number(deduction.percentage) : null,
      isPreTax: deduction.is_pre_tax,
      effectiveDate: deduction.effective_date,
      endDate: deduction.end_date,
      maxAnnualAmount: deduction.max_annual_amount
        ? Number(deduction.max_annual_amount)
        : null,
      createdAt: deduction.created_at,
      updatedAt: deduction.updated_at,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: mappedDeductions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Failed to list deductions:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payroll/deductions - Create a new deduction
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "EmployeeDeduction",
    commandName: "create",
    transformBody: (body) => ({
      employeeId: body.employeeId || "",
      type: body.type || "",
      name: body.name || "",
      amount: body.amount ?? 0,
      percentage: body.percentage ?? 0,
      isPreTax: body.isPreTax ?? false,
      effectiveDate: body.effectiveDate || "",
      endDate: body.endDate || "",
      maxAnnualAmount: body.maxAnnualAmount ?? 0,
    }),
  });
}
