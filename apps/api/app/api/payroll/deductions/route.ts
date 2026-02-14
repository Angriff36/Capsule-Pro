/**
 * Employee Deductions API Endpoints
 *
 * GET    /api/payroll/deductions       - List deductions with pagination and filters
 * POST   /api/payroll/deductions       - Create a new deduction
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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

const CreateDeductionSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.enum([
    "benefits",
    "health_insurance",
    "dental_insurance",
    "vision_insurance",
    "retirement_401k",
    "retirement_ira",
    "garnishment",
    "child_support",
    "union_dues",
    "loan_repayment",
    "other",
  ]),
  name: z.string().min(1),
  amount: z.number().min(0).optional(),
  percentage: z.number().min(0).max(100).optional(),
  isPreTax: z.boolean().default(false),
  effectiveDate: z.string().transform((str) => new Date(str)),
  endDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  maxAnnualAmount: z.number().min(0).optional(),
});

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
export async function POST(request: Request) {
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

    const body = await request.json();

    // Validate request body
    const parseResult = CreateDeductionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          message: "Invalid request body",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Validate that either amount or percentage is provided
    if (!(data.amount || data.percentage)) {
      throw new InvariantError("Either amount or percentage must be provided");
    }

    // Create deduction
    const deduction = await database.$queryRaw<
      {
        id: string;
        tenant_id: string;
        employee_id: string;
        type: string;
        name: string;
        created_at: Date;
      }[]
    >(
      Prisma.sql`
        INSERT INTO tenant_staff.employee_deductions (
          tenant_id,
          employee_id,
          type,
          name,
          amount,
          percentage,
          is_pre_tax,
          effective_date,
          end_date,
          max_annual_amount
        )
        VALUES (
          ${tenantId},
          ${data.employeeId}::uuid,
          ${data.type},
          ${data.name},
          ${data.amount ?? null},
          ${data.percentage ?? null},
          ${data.isPreTax},
          ${data.effectiveDate},
          ${data.endDate ?? null},
          ${data.maxAnnualAmount ?? null}
        )
        RETURNING id, tenant_id, employee_id, type, name, created_at
      `
    );

    if (!deduction[0]) {
      throw new Error("Failed to create deduction");
    }

    return NextResponse.json(
      {
        id: deduction[0].id,
        tenantId: deduction[0].tenant_id,
        employeeId: deduction[0].employee_id,
        type: deduction[0].type,
        name: deduction[0].name,
        createdAt: deduction[0].created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to create deduction:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
